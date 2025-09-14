// CommonJS server drop-in
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed: ' + origin));
  }
}));
app.options('*', cors());

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const presignRoute = require('./routes/presign'); // ya existente
const searchRoute  = require('./routes/search');  // incluido
const uploadRoute  = require('./routes/upload');  // incluido
app.use('/api', presignRoute);
app.use('/api', searchRoute);
app.use('/api', uploadRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Mixtli API CJS on :'+port));
