
import express from 'express';
import cors from 'cors';
import { requestId } from './middleware/requestId.js';
import { register, login } from './auth.js';
import { authRequired } from './middleware/auth.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerEmailRoutes } from './routes/email.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(requestId());

// basic logs per request
app.use((req,res,next)=>{
  logger.info({ rid: req.id, method: req.method, url: req.url, ua: req.headers['user-agent'] }, 'req');
  res.on('finish', ()=> {
    logger.info({ rid: req.id, status: res.statusCode }, 'res');
  });
  next();
});

app.get('/api/health', (req,res)=> res.json({ status: 'ok', driver: env.storageDriver }));

// auth
app.post('/auth/register', register);
app.post('/auth/login', login);

// protected
app.use(authRequired);
registerUploadRoutes(app);
registerEmailRoutes(app);

app.listen(env.port, ()=> logger.info({ port: env.port }, 'server up') );
