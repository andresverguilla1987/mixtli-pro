import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export const router = Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { name, content, actor } = req.body || {};
  if (!name || !content || !actor) return res.status(400).json({ error: "name, content, actor required" });

  const created = await prisma.rule.create({
    data: { name, content, createdBy: actor }
  });

  await prisma.auditLog.create({
    data: {
      entity: "Rule",
      entityId: created.id,
      action: "CREATE",
      diff: content,
      actor
    }
  });

  res.json({ rule: created });
});

router.put("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approver } = req.body || {};
  if (!approver) return res.status(400).json({ error: "approver required" });

  const updated = await prisma.rule.update({
    where: { id },
    data: { approvedBy: approver, version: { increment: 1 } }
  });

  await prisma.auditLog.create({
    data: {
      entity: "Rule",
      entityId: id,
      action: "APPROVE",
      diff: {},
      actor: approver,
      approvedBy: approver
    }
  });

  res.json({ rule: updated });
});
