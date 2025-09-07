import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };
const prisma = new PrismaClient();

const retrainWorker = new Worker("retrain", async job => {
  console.log("🔧 Retrain job:", job.id, job.data);
  // Placeholder retraining: compute a toy "model version" bump and store an AuditLog
  await prisma.auditLog.create({
    data: {
      entity: "Model",
      entityId: "fraud-scoring",
      action: "RETRAIN",
      diff: { reason: job.data?.reason || "auto", ts: new Date().toISOString() },
      actor: "worker"
    }
  });
}, { connection });

retrainWorker.on("completed", job => {
  console.log("✅ Retrain completed:", job.id);
});

retrainWorker.on("failed", (job, err) => {
  console.error("❌ Retrain failed:", job?.id, err);
});
