
import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Servidor funcionando 🔥', version: '1.0.0' });
});

// Puerto: usa el que provee el entorno o 10000 local
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server escuchando en puerto ${PORT}`);
});

export default app;
