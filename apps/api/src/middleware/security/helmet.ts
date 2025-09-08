import helmet from 'helmet';

// Basic Helmet hardening. Disable CSP here if you don't have a policy yet.
// You can enable/adjust CSP later.
const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

export default helmetMiddleware;
