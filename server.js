// MIXTLI API – Auth + CRUD + Uploads (presigned & direct)
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// AWS SDK v3 (presigned)
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// AWS SDK v2 (direct upload via server)
const AWSv2 = require('aws-sdk');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// ===== Helpers Auth =====
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

// ===== S3 config (compartido) =====
const S3_REGION   = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET   = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || null; // opcional para R2/MinIO

const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

// v3 client (presigned)
const s3v3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: !!S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY
  }
});

// v2 client (direct)
const s3v2 = new AWSv2.S3({
  region: S3_REGION,
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT || undefined,
  s3ForcePathStyle: !!S3_ENDPOINT,
  signatureVersion: 'v4'
});

// Multer en memoria (direct upload)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// ===== Raíz y salud =====
app.get('/', (req, res) => {
  res.json({
    mensaje: "✨ Mixtli API",
    rutas: {
      salud: "/salud",
      debug: "/__debug",
      listarUsuarios: "/api/users",
      crearUsuario: "/api/users",
      actualizarUsuario: "/api/users/:id",
      eliminarUsuario: "/api/users/:id",
      registrar: "/auth/register",
      login: "/auth/login",
      yo: "/me (Bearer token)",
      presign: "/api/uploads/presign (POST)",
      verify: "/api/uploads/verify?key=... (GET)",
      uploadDirect: "/api/upload (POST form-data file=...)"
    }
  });
});
app.get('/salud', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor funcionando 🟢' });
});
app.get('/__debug', (req, res) => {
  res.json({
    time: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      PORT: process.env.PORT || null,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      S3_REGION, S3_BUCKET: S3_BUCKET ? '(set)' : '(empty)',
      S3_ENDPOINT: S3_ENDPOINT || '(aws default)',
      S3_ACCESS_KEY_ID: S3_ACCESS_KEY_ID ? '(set)' : '(empty)'
    }
  });
});

// ===== AUTH =====
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
    console.error('Error register:', e);
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
    console.error('Error login:', e);
    res.status(500).json({ error: 'Error en login' });
  }
});
app.get('/me', auth, async (req, res) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { id: true, nombre: true, email: true } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true, user });
});

// ===== USERS CRUD =====
app.get('/api/users', async (req, res) => {
  const data = await prisma.usuario.findMany({ orderBy: { id: 'asc' }, select: { id: true, nombre: true, email: true } });
  res.json({ ok: true, data });
});
app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
    const nuevo = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (e) {
    if (e.code == 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('Error creando usuario:', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});
app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const { nombre, email } = req.body;
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) }
    });
    res.json({ ok: true, data: actualizado });
  } catch (e) {
    if (e.code == 'P2002') return res.status(409).json({ error: 'email ya existe' });
    if (e.code == 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error actualizando usuario:', e);
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
    if (e.code == 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error eliminando usuario:', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// ===== UPLOADS: Presigned (cliente sube directo) =====
app.post('/api/uploads/presign', auth, async (req, res) => {
  try {
    if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      return res.status(500).json({ error: 'S3 no configurado (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)' });
    }
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'filename y contentType requeridos' });

    const ts = Date.now();
    const key = `uploads/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth()+1).padStart(2,'0')}/${ts}-${filename}`;

    const putCmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3v3, putCmd, { expiresIn: 60 * 5 }); // 5 min

    res.json({ ok: true, upload: { url, method: 'PUT', headers: { 'Content-Type': contentType }, key } });
  } catch (e) {
    console.error('Error presign:', e);
    res.status(500).json({ error: 'Error generando URL de subida' });
  }
});

app.get('/api/uploads/verify', auth, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'key requerido' });
    const head = await s3v3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.json({ ok: true, exists: true, size: head.ContentLength, contentType: head.ContentType });
  } catch (e) {
    if (e && e.$metadata && e.$metadata.httpStatusCode === 404) {
      return res.json({ ok: true, exists: false });
    }
    console.error('Error verify:', e);
    res.status(500).json({ error: 'Error verificando objeto' });
  }
});

// ===== UPLOADS: Direct (archivo via servidor) =====
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo (form-data file=...)' });
    if (!S3_BUCKET) return res.status(500).json({ error: 'S3_BUCKET no configurado' });

    const key = `uploads/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth()+1).padStart(2,'0')}/${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private'
    };

    const data = await s3v2.upload(params).promise();
    res.json({ ok: true, key, location: data.Location });
  } catch (e) {
    console.error('Error subiendo archivo a S3:', e);
    res.status(500).json({ error: 'Error subiendo archivo' });
  }
});

// Catch-all 404 (para debug rápido)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.url });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
