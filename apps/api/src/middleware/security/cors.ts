import cors from 'cors';

// CORS allowlist from env CORS_ORIGIN (comma-separated). Example:
// CORS_ORIGIN=https://mixtli.app,https://demo.mixtli.app
const allowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// If you need credentials (cookies/Authorization headers), set CORS_CREDENTIALS=1
const useCredentials = (process.env.CORS_CREDENTIALS || '0') === '1';

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server/health checks
    if (allowlist.length === 0) return callback(null, true); // open if not configured
    if (allowlist.includes('*')) return callback(null, true);
    if (allowlist.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: useCredentials,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);
export default corsMiddleware;
