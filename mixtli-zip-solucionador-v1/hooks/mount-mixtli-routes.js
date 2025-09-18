// hooks/mount-mixtli-routes.js
// Monta rutas faltantes con UNA sola llamada desde server.js
// Uso en server.js:
//   import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
//   mountMixtliRoutes(app);

import { S3Client } from "@aws-sdk/client-s3";
import createShareRouter from "../routes/share.routes.js";
import createOpsRouter from "../routes/ops.routes.js";

/**
 * @param {import('express').Express} app
 */
export default function mountMixtliRoutes(app) {
  const s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const SHARE_SECRET = process.env.SHARE_SECRET || process.env.S3_SECRET_ACCESS_KEY;

  app.use("/api/share", createShareRouter({ s3, bucket: process.env.S3_BUCKET, secret: SHARE_SECRET }));
  app.use("/api",        createOpsRouter({ s3, bucket: process.env.S3_BUCKET }));

  // Debug opcional: habilitar listado de rutas si DEBUG_ROUTES=true
  if (String(process.env.DEBUG_ROUTES).toLowerCase() === "true") {
    app.get("/__debug/routes", (req, res) => {
      const out = [];
      const stack = app._router?.stack || [];
      for (const layer of stack) {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(",");
          out.push(`${methods} ${layer.route.path}`);
        }
      }
      res.json(out);
    });
  }
}
