
import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 10000),

  jwtSecret: process.env.JWT_SECRET || 'devsecret',

  storageDriver: process.env.STORAGE_DRIVER || 'LOCAL',

  s3: {
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  },

  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.MAIL_FROM || 'Mixtli <noreply@example.com>'
  },

  dbUrl: process.env.DATABASE_URL || 'file:./dev.db?connection_limit=1',

  clamav: {
    host: process.env.CLAMAV_HOST,
    port: Number(process.env.CLAMAV_PORT || 3310)
  },

  planLimits: {
    FREE: Number(process.env.PLAN_FREE_MAX_SIZE || 50*1024*1024),
    PRO: Number(process.env.PLAN_PRO_MAX_SIZE || 2*1024*1024*1024),
    ENTERPRISE: Number(process.env.PLAN_ENTERPRISE_MAX_SIZE || 10*1024*1024*1024)
  },

  defaultTtlDays: Number(process.env.DEFAULT_TTL_DAYS || 14)
};
