// snippets/server-root-snippet.js
// PÉGALO ANTES de app.listen(...) cuando server.js está en la RAÍZ del repo.
import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
mountMixtliRoutes(app);
