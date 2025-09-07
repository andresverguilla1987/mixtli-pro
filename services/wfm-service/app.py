from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
try:
    import pulp
    HAS_PULP = True
except Exception:
    HAS_PULP = False
app = FastAPI(title="Mixtli WFM Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
class Agent(BaseModel):
    id: str; skills: List[str]; cost_per_hour: float = 0.0; max_hours_week: int = 40; min_rest_hours: int = 12
class DemandPoint(BaseModel):
    ts: Optional[str] = None; slot: int; skill: str; required: int
class OptimizeReq(BaseModel):
    slot_minutes: int; agents: List[Agent]; demand: List[DemandPoint]
@app.get("/health")
def health(): return {"status":"ok","service":"wfm-service","has_pulp":HAS_PULP}
@app.post("/optimize")
def optimize(req: OptimizeReq):
    slots = sorted({d.slot for d in req.demand}); skills = sorted({d.skill for d in req.demand}); agents = req.agents
    by_slot_skill: Dict[tuple,int] = {}; 
    for d in req.demand: by_slot_skill[(d.slot,d.skill)] = by_slot_skill.get((d.slot,d.skill), 0) + d.required
    hours = req.slot_minutes/60.0
    if HAS_PULP:
        x = {}; prob = pulp.LpProblem("wfm", pulp.LpMinimize)
        for a in agents:
            for t in slots:
                for s in skills:
                    if s in a.skills:
                        x[(a.id,t,s)] = pulp.LpVariable(f"x_{a.id}_{t}_{s}", 0, 1, cat="Binary")
        cost = pulp.lpSum(x[(a.id,t,s)] * a.cost_per_hour * hours for a in agents for t in slots for s in skills if (a.id,t,s) in x)
        prob += cost
        for (t,s), reqd in by_slot_skill.items(): prob += pulp.lpSum(x[(a.id,t,s)] for a in agents if (a.id,t,s) in x) >= reqd
        for a in agents:
            for t in slots: prob += pulp.lpSum(x[(a.id,t,s)] for s in skills if (a.id,t,s) in x) <= 1
        for a in agents: prob += pulp.lpSum(x[(a.id,t,s)] for t in slots for s in skills if (a.id,t,s) in x) * hours <= a.max_hours_week
        prob.solve(pulp.PULP_CBC_CMD(msg=False))
        solution = [{"agent_id": a.id, "slot": t, "skill": s, "assigned": int(pulp.value(x[(a.id,t,s)]))} for a in agents for t in slots for s in skills if (a.id,t,s) in x]
        objective = float(pulp.value(prob.objective)) if prob.objective is not None else 0.0
        return {"status":"ok","solver":"pulp-cbc","objective":objective,"assignments":solution}
    sorted_agents = sorted(agents, key=lambda a: a.cost_per_hour)
    used = {(a.id,t): False for a in agents for t in slots}; hours_used = {a.id: 0.0 for a in agents}; assignments = []
    for t in slots:
        for s in skills:
            need = by_slot_skill.get((t,s), 0)
            for a in sorted_agents:
                if need <= 0: break
                if s not in a.skills or used[(a.id,t)] or hours_used[a.id] + hours > a.max_hours_week: continue
                assignments.append({"agent_id": a.id, "slot": t, "skill": s, "assigned": 1}); used[(a.id,t)] = True; hours_used[a.id] += hours; need -= 1
    present = {(r["agent_id"], r["slot"], r["skill"]) for r in assignments}
    for a in agents:
        for t in slots:
            for s in skills:
                if s in a.skills and (a.id,t,s) not in present:
                    assignments.append({"agent_id": a.id, "slot": t, "skill": s, "assigned": 0})
    objective = sum([next(a.cost_per_hour for a in agents if a.id == r["agent_id"]) * hours for r in assignments if r["assigned"]==1])
    return {"status":"ok","solver":"greedy","objective":objective,"assignments":assignments}
