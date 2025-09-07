import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export const router = Router();
const prisma = new PrismaClient();

router.get("/logs", async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json({ logs });
});
