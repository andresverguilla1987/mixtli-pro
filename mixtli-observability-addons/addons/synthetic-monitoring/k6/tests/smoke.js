import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:10000';

export default function () {
  const r1 = http.get(`${BASE}/salud`, { headers: { 'X-Request-Id': `smoke-${__VU}-${Date.now()}` }});
  check(r1, { 'salud 200': (r) => r.status === 200 });

  // Opcional: agrega más endpoints críticos
  // const r2 = http.get(`${BASE}/metrics`);
  // check(r2, { 'metrics 200': (r) => r.status === 200 });

  sleep(1);
}
