// Mixtli Full API – Auth + CRUD + S3 Uploads (direct & presigned)
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// S3 (v3 presign)
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// S3 (v2 direct upload)
const AWS = require('aws-sdk');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_me';

// ====== Helpers Auth ======
function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, nombre: user.nombre }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const [_bearer, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ====== S3 config ======
const S3_REGION   = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET   = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || null;

const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

// v3 client
const s3v3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: !!S3_ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

// v2 client
const s3v2 = new AWS.S3({
  region: S3_REGION,
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT || undefined,
  s3ForcePathStyle: !!S3_ENDPOINT,
  signatureVersion: 'v4'
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ====== Home/Debug ======
app.get('/', (req, res) => {
  res.json({
    api: "Mixtli",
    rutas: {
      salud: "/salud",
      debug: "/__debug",
      registrar: "/auth/register",
      login: "/auth/login",
      me: "/me",
      users: "/api/users",
      uploadDirect: "/api/upload",
      presign: "/api/uploads/presign",
      verify: "/api/uploads/verify?key=..."
    }
  });
});
app.get('/salud', (req, res) => res.json({ status: 'ok' }));
app.get('/__debug', (req, res) => {
  res.json({
    time: new Date().toISOString(),
    env: {
      PORT: process.env.PORT || null,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      S3_REGION,
      S3_BUCKET: S3_BUCKET ? '(set)' : '(empty)',
      ACCESS_KEY_ID: ACCESS_KEY_ID ? '(set)' : '(empty)'
    }
  });
});

// ====== Auth ======
app.post('/auth/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email y password requeridos' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({ data: { nombre, email, passwordHash: hash } });
    const token = signToken(user);
    res.status(201).json({ ok: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('register error:', e);
    res.status(500).json({ error: 'Error registrando' });
  }
});
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = signToken(user);
    res.json({ ok: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'Error en login' });
  }
});
app.get('/me', auth, async (req, res) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { id: true, nombre: true, email: true } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true, user });
});

// ====== Users CRUD ======
app.get('/api/users', async (req, res) => {
  const data = await prisma.usuario.findMany({ orderBy: { id: 'asc' }, select: { id: true, nombre: true, email: true } });
  res.json({ ok: true, data });
});
app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body || {};
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
    const nuevo = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('create error:', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const { nombre, email } = req.body || {};
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) }
    });
    res.json({ ok: true, data: actualizado });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('update error:', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});
app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const eliminado = await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, data: eliminado });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('delete error:', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// ====== Uploads ======
// Presigned (cliente sube directo con PUT)
app.post('/api/uploads/presign', auth, async (req, res) => {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'filename y contentType requeridos' });
    const key = `uploads/${Date.now()}-${filename}`;
    const putCmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3v3, putCmd, { expiresIn: 60 * 5 });
    res.json({ ok: true, upload: { url, method: 'PUT', headers: { 'Content-Type': contentType }, key } });
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'Error generando URL' });
  }
});
// Verify object
app.get('/api/uploads/verify', auth, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'key requerido' });
    const head = await s3v3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.json({ ok: true, exists: true, size: head.ContentLength, contentType: head.ContentType });
  } catch (e) {
    if (e && e.$metadata && e.$metadata.httpStatusCode === 404) return res.json({ ok: true, exists: false });
    console.error('verify error:', e);
    res.status(500).json({ error: 'Error verificando' });
  }
});
// Direct (servidor recibe archivo y lo sube)
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo (form-data file=...)' });
    if (!S3_BUCKET) return res.status(500).json({ error: 'S3_BUCKET no configurado' });
    const key = `uploads/${Date.now()}-${req.file.originalname}`;
    const params = { Bucket: S3_BUCKET, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype, ACL: 'private' };
    const data = await s3v2.upload(params).promise();
    res.json({ ok: true, key, location: data.Location });
  } catch (e) {
    console.error('direct upload error:', e);
    res.status(500).json({ error: 'Error subiendo archivo' });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', path: req.url }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mixtli API escuchando en puerto ${PORT}`));
const uploadRoutes = require("./src/rutas/upload");
app.use("/api", uploadRoutes);
