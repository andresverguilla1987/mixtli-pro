import type { Server } from 'node:http';
import logger from '../middleware/logging';

export function setupGraceful(server: Server) {
  const shutdown = async (signal: string) => {
    try {
      logger.info({ signal }, 'Shutting down gracefully...');
      // Cierra el HTTP server primero
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // Desconecta Prisma si es posible (sin acoplar al proyecto)
      try {
        const { PrismaClient } = await import('@prisma/client');
        const p = new PrismaClient();
        await p.$disconnect().catch(() => {});
      } catch {}

      process.exit(0);
    } catch (e) {
      logger.error({ err: e }, 'Shutdown error');
      process.exit(1);
    }
  };

  ['SIGTERM', 'SIGINT'].forEach((sig) => {
    process.on(sig as NodeJS.Signals, () => shutdown(sig));
  });
}
