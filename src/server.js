const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Rutas CRUD productos
app.get('/products', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

app.post('/products', async (req, res) => {
  const { name, price } = req.body;
  const product = await prisma.product.create({
    data: { name, price: parseFloat(price) }
  });
  res.json(product);
});

app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: { name, price: parseFloat(price) }
  });
  res.json(product);
});

app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  res.json({ message: 'Producto eliminado' });
});

// Ruta de estado
app.get('/', (req, res) => {
  res.json({ status: "Servidor funcionando 🔥", version: "1.0.0" });
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
