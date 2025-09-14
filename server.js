import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed: ' + origin));
  },
  credentials: true
}));
app.options('*', cors());

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Routes
import presignRoute from './routes/presign.js';
import searchRoute from './routes/search.js';
import bulkRoute from './routes/bulk.js';
import filesOpsRoute from './routes/filesOps.js';
import uploadRoute from './routes/upload.js';
app.use('/api', presignRoute);
app.use('/api', searchRoute);
app.use('/api', bulkRoute);
app.use('/api', filesOpsRoute);
app.use('/api', uploadRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Mixtli API v1.11.0 on :' + port));
