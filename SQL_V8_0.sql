
-- Skills/On-call core
create table if not exists public.skills(skill text primary key, description text);
create table if not exists public.agent_skills(
  user_id uuid references public.agents(user_id) on delete cascade,
  skill text references public.skills(skill) on delete cascade,
  primary key(user_id, skill)
);
alter table public.queues add column if not exists required_skill text references public.skills(skill);
create table if not exists public.oncall_rotations(
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.queues(id) on delete cascade,
  name text not null
);
create table if not exists public.oncall_members(
  rotation_id uuid references public.oncall_rotations(id) on delete cascade,
  user_id uuid references public.agents(user_id) on delete cascade,
  seq int default 0,
  primary key(rotation_id, user_id)
);
create table if not exists public.oncall_shifts(
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.queues(id) on delete cascade,
  user_id uuid references public.agents(user_id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);
create or replace function public.is_oncall(p_user uuid, p_queue uuid, p_at timestamptz default now()) returns boolean
language sql stable as $$
  select exists(select 1 from oncall_shifts where user_id=p_user and queue_id=p_queue and p_at between starts_at and ends_at);
$$;
create or replace function public.auto_assign_deposit_v2(p_deposit uuid) returns uuid
language plpgsql as $$
declare q uuid; req text; cand record; begin
  select queue_id into q from deposit_queues where deposit_id = p_deposit;
  if q is null then return null; end if;
  select required_skill into req from queues where id=q;
  with c as (
    select a.user_id, a.current_load, a.last_assigned,
           public.is_oncall(a.user_id, q, now()) as oncall
    from agents a join agent_queues aq on aq.user_id=a.user_id
    left join agent_skills sk on sk.user_id=a.user_id
    where a.active and aq.queue_id=q and (req is null or sk.skill = req)
    group by a.user_id, a.current_load, a.last_assigned
  )
  select user_id into cand from c
  order by oncall desc, current_load asc, coalesce(last_assigned,'epoch') asc
  limit 1;
  if cand.user_id is null then return null; end if;
  insert into deposit_assignments(deposit_id, user_id) values (p_deposit, cand.user_id)
    on conflict (deposit_id) do update set user_id=excluded.user_id, assigned_at=now(), released_at=null;
  update agents set current_load = coalesce(current_load,0)+1, last_assigned=now() where user_id=cand.user_id;
  return cand.user_id;
end; $$;

-- WFM
create table if not exists public.wfm_params(
  tenant_id uuid,
  queue_id uuid,
  aht_sec int default 300,
  sla_sec int default 120,
  target_sl numeric default 0.8,
  occupancy numeric default 0.85,
  interval_min int default 60,
  primary key (tenant_id, queue_id)
);
create table if not exists public.wfm_forecast(
  date_hour timestamptz,
  queue_id uuid,
  arrivals int,
  aht_sec int,
  required_agents int,
  sl numeric,
  asa_sec numeric,
  created_at timestamptz default now(),
  primary key (date_hour, queue_id)
);
create or replace view public.arrivals_hourly as
select date_trunc('hour', dq.assigned_at) as date_hour, dq.queue_id, count(*) as arrivals
from deposit_queues dq
join bank_deposits d on d.id = dq.deposit_id
group by 1,2;

-- BI
create or replace view public.dim_tenant as select id as tenant_id, name, slug from tenants;
create or replace view public.dim_queue as select id as queue_id, name, sla_minutes, region, provider, required_skill from queues;
create or replace view public.dim_user as select user_id, email, country from profiles;
create or replace function public.bi_fact_deposits() returns setof json language sql as $$
  select to_jsonb(row) from (
    select d.id, d.tenant_id, dq.queue_id, d.user_id, d.status, d.currency,
           d.expected_cents, d.created_at, dq.assigned_at, dq.resolved_at
    from bank_deposits d left join deposit_queues dq on dq.deposit_id = d.id
  ) row;
$$;
create or replace function public.bi_fact_purchases() returns setof json language sql as $$
  select to_jsonb(row) from (
    select id, tenant_id, user_id, provider, currency, amount_cents, created_at
    from purchases
  ) row;
$$;
