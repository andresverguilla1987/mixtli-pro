
-- ============ V8.1 SQL ============
-- Skill matrix (niveles)
alter table public.agent_skills add column if not exists level smallint default 1;
alter table public.queues add column if not exists required_skill_level smallint default 1;

-- Dificultad del depósito (1..3). Si tu status es enum, ignora.
alter table public.bank_deposits add column if not exists difficulty smallint default 1;

-- Clasifica dificultad (simple): monto y banda de riesgo
create or replace function public.classify_deposit_difficulty(p_ref uuid) returns smallint
language plpgsql as $$
declare amt bigint; band text; lvl smallint := 1; dual bigint; begin
  select expected_cents into amt from bank_deposits where id=p_ref;
  select band into band from risk_assessments where ref_id=p_ref order by created_at desc limit 1;
  select dual_required_above_cents into dual from get_deposit_limits() limit 1;

  if band='high' or amt >= dual then lvl := 3;
  elsif band='medium' or amt >= (dual/2) then lvl := 2;
  else lvl := 1;
  end if;
  update bank_deposits set difficulty=lvl where id=p_ref;
  return lvl;
end; $$;

-- Auto-assign v3: requiere skill + nivel
create or replace function public.auto_assign_deposit_v3(p_deposit uuid) returns uuid
language plpgsql as $$
declare q uuid; req text; req_lvl smallint; need_lvl smallint; cand record; begin
  select queue_id into q from deposit_queues where deposit_id = p_deposit;
  if q is null then return null; end if;
  select required_skill, required_skill_level into req, req_lvl from queues where id=q;
  need_lvl := (select classify_deposit_difficulty(p_deposit));

  with c as (
    select a.user_id, a.current_load, a.last_assigned,
           public.is_oncall(a.user_id, q, now()) as oncall,
           max(coalesce(ask.level,1)) as lvl
    from agents a
    join agent_queues aq on aq.user_id=a.user_id and aq.queue_id=q
    left join agent_skills ask on ask.user_id=a.user_id and (req is null or ask.skill=req)
    where a.active
    group by a.user_id, a.current_load, a.last_assigned
  )
  select user_id into cand from c
  where (req is null or lvl >= coalesce(req_lvl,1)) and lvl >= need_lvl
  order by oncall desc, current_load asc, coalesce(last_assigned,'epoch') asc
  limit 1;

  if cand.user_id is null then return null; end if;
  insert into deposit_assignments(deposit_id, user_id) values (p_deposit, cand.user_id)
    on conflict (deposit_id) do update set user_id=excluded.user_id, assigned_at=now(), released_at=null;
  update agents set current_load = greatest(0,coalesce(current_load,0))+1, last_assigned=now() where user_id=cand.user_id;
  return cand.user_id;
end; $$;

-- Integrar a tu trigger de auto-triage:
--  after asignar cola: perform public.auto_assign_deposit_v3(NEW.id);

-- WFM: Roster y restricciones
create table if not exists public.wfm_agent_constraints(
  user_id uuid primary key references public.agents(user_id) on delete cascade,
  max_hours_day int default 8,
  max_hours_week int default 40
);

create table if not exists public.wfm_roster(
  date_hour timestamptz,
  queue_id uuid references public.queues(id) on delete cascade,
  user_id uuid references public.agents(user_id) on delete cascade,
  assigned boolean default true,
  created_at timestamptz default now(),
  primary key (date_hour, queue_id, user_id)
);

-- CDC watermarks
create table if not exists public.bi_export_watermarks(
  entity text primary key,   -- 'deposits' | 'purchases'
  last_ts timestamptz
);

-- Elegibilidad de agentes (skills + nivel + mapeo a cola + activos), prioriza on-call y menor carga
create or replace function public.eligible_agents_for_queue(p_queue uuid, p_skill text, p_level int)
returns table(user_id uuid, current_load int, last_assigned timestamptz, oncall boolean, max_hours_day int, max_hours_week int)
language sql stable as $$
  select a.user_id, a.current_load, a.last_assigned,
         public.is_oncall(a.user_id, p_queue, now()) as oncall,
         coalesce(c.max_hours_day,8) as max_hours_day,
         coalesce(c.max_hours_week,40) as max_hours_week
  from agents a
  join agent_queues aq on aq.user_id=a.user_id and aq.queue_id=p_queue
  left join agent_skills sk on sk.user_id=a.user_id
  left join wfm_agent_constraints c on c.user_id=a.user_id
  where a.active and (p_skill is null or (sk.skill=p_skill and sk.level >= p_level))
  group by a.user_id, a.current_load, a.last_assigned, c.max_hours_day, c.max_hours_week
  order by oncall desc, current_load asc, coalesce(last_assigned,'epoch') asc;
$$;

-- Horas planificadas del día/semana (contando bloques de 1h del roster)
create or replace function public.wfm_hours_for_user_day(p_user uuid, p_day timestamptz)
returns int language sql stable as $$
  select count(*) from wfm_roster
  where user_id=p_user and date_trunc('day', date_hour)=date_trunc('day', p_day);
$$;
create or replace function public.wfm_hours_for_user_week(p_user uuid, p_day timestamptz)
returns int language sql stable as $$
  select count(*) from wfm_roster
  where user_id=p_user and date_trunc('week', date_hour)=date_trunc('week', p_day);
$$;

-- Ejecuta SQL arbitrario y retorna JSON (uso interno CDC). Proteger con RLS si lo deseas.
create or replace function public.exec_sql_json(p_sql text) returns setof json language plpgsql as $$
begin
  return query execute p_sql;
end; $$;