// Pégalo ANTES de app.listen(...)
// Si server.js está en la raíz:
import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
mountMixtliRoutes(app);

// Si tu server.js vive en src/server.js y moviste hooks/ y routes/ dentro de src/:
/*
import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
mountMixtliRoutes(app);
*/
