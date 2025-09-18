// snippets/server-src-snippet.js
// PÉGALO ANTES de app.listen(...) cuando server.js está en src/server.js
// y moviste /routes y /hooks dentro de /src.
import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
mountMixtliRoutes(app);
