
import { env } from '../src/env.js';
import { PrismaClient } from '@prisma/client';
import { storage } from '../src/storage.js';
import { logger } from '../src/logger.js';

const prisma = new PrismaClient();

(async ()=> {
  const now = new Date();
  const expired = await prisma.upload.findMany({
    where: { expiresAt: { lt: now } }
  });
  logger.info({ count: expired.length }, 'cleanup start');
  for (const u of expired) {
    try {
      await storage.deleteObject({ key: u.key });
    } catch (e) {
      logger.warn({ id: u.id, err: String(e) }, 'delete object error');
    }
    await prisma.upload.delete({ where: { id: u.id } });
  }
  logger.info('cleanup done');
  process.exit(0);
})();
