import { Router } from "express";

/**
 * Light ILP-like assignment via greedy + improvement:
 * Input: agents, shifts, demand per time-slot; returns assignment.
 */
export const router = Router();

type Slot = { startMin: number; endMin: number; demand: number };
type Agent = { id: string; availability: Array<{ startMin: number; endMin: number }> };

router.post("/simulate", (req, res) => {
  const { agents, slots } = req.body as { agents: Agent[]; slots: Slot[] };
  if (!Array.isArray(agents) || !Array.isArray(slots)) {
    return res.status(400).json({ error: "agents[] and slots[] required" });
  }

  // Naive greedy assign: fill demand with available agents
  const assign: Record<string, string[]> = {}; // slotIndex -> agentIds
  slots.forEach((_, i) => (assign[i] = []));

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    let needed = Math.max(0, Math.floor(s.demand));
    for (const a of agents) {
      if (needed <= 0) break;
      const can = a.availability.some(v => v.startMin <= s.startMin && v.endMin >= s.endMin);
      const alreadyAssigned = Object.values(assign).some(ids => ids.includes(a.id));
      if (can && !alreadyAssigned) {
        assign[i].push(a.id);
        needed--;
      }
    }
  }

  const coverage = slots.map((s, i) => ({
    slot: s,
    assigned: assign[i],
    shortfall: Math.max(0, s.demand - assign[i].length),
  }));

  res.json({ coverage });
});
