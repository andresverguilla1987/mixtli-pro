import express from "express";
import userRoutes from "./routes/users";

const app = express();
app.use(express.json());

app.get("/salud", (req, res) => {
  res.json({ status: "ok", mensaje: "Servidor funcionando ✅" });
});

app.use("/api", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
