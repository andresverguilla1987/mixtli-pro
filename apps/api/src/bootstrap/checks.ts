import type { Request, Response } from "express";

export function registerChecks(app: any) {
  const okJson = (_req: Request, res: Response) => res.status(200).json({ status: "ok" });
  const okHead = (_req: Request, res: Response) => res.status(200).end();
  const healthPaths = ["/", "/health", "/salud", "/status", "/ready", "/live"];
  for (const p of healthPaths) {
    app.get(p, okJson);
    app.head(p, okHead);
  }
}
export default registerChecks;