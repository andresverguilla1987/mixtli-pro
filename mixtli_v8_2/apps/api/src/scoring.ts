import { Router } from "express";
import { Queue } from "bullmq";

export const router = Router();
const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };
const retrainQueue = new Queue("retrain", { connection });

router.post("/retrain", async (req, res) => {
  const { reason = "manual", notes = "" } = req.body || {};
  await retrainQueue.add("retrain-model", { reason, notes, at: new Date().toISOString() }, { attempts: 3 });
  res.json({ status: "queued", reason });
});
