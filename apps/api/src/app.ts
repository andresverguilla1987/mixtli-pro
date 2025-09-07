import express from "express";
import cors from "cors";
import morgan from "morgan";
import { registerChecks } from "./bootstrap/checks.js";

export const PORT: number = Number(process.env.PORT) || 10000;

// Crea la app de Express y middlewares básicos
export const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Rutas de salud y raíz
registerChecks(app);

// (Opcional) Aqui montarías tus routers reales, por ejemplo:
// import usersRouter from "./routes/users.js";
// app.use("/api/users", usersRouter);

export default app;