import helmet from 'helmet';
import cors from 'cors';

export function security(app: any) {
  app.disable('x-powered-by');
  app.use(helmet());
  const allowed = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    credentials: true,
  }));
}
