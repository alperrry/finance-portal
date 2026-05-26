import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---- Ayarlar ----
const KEYCLOAK = 'http://localhost:8080';
const REALM = 'finance-portal';
const CLIENT_ID = 'finance-portal-frontend';
const USERNAME = 'alper.yilmaz9@ogr.sakarya.edu.tr';
const PASSWORD = 'Alper539..';   // test sonrası bu şifreyi değiştir
const BASE = 'http://localhost:8081';

// Sadece hafif endpoint'ler (market-snapshot ve ağır olanlar çıkarıldı)
const ENDPOINTS = [
  '/api/v1/fx',
  '/api/v1/bonds',
  '/api/v1/funds',
  '/api/v1/stocks',
  '/api/v1/viop',
  '/api/v1/viop/latest',
  '/api/v1/macro/inflation',
  '/api/v1/macro/deposit-rates',
  '/api/categories',
];

// ---- Özel metrikler ----
const errorRate = new Rate('errors');
const reqDuration = new Trend('endpoint_duration', true);

// ---- Yük profili ----
export const options = {
  scenarios: {
    ramp_to_200: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 }, // 0 -> 200 biniş
        { duration: '60s', target: 200 }, // 200'de plato
        { duration: '30s', target: 0 },   // iniş
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'], // p95 < 800ms olmalı
    errors: ['rate<0.01'],            // hata oranı < %1
  },
};

// ---- Token'ı bir kere al, tüm VU'lara dağıt ----
export function setup() {
  const res = http.post(
    `${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token`,
    {
      grant_type: 'password',
      client_id: CLIENT_ID,
      username: USERNAME,
      password: PASSWORD,
    },
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  if (res.status !== 200) {
    throw new Error(`Token alinamadi! status=${res.status} body=${res.body}`);
  }
  const token = res.json('access_token');
  console.log('Token alindi, test basliyor...');
  return { token: token };
}

// ---- Her sanal kullanıcının davranışı ----
export default function (data) {
  const url = BASE + ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const params = {
    headers: { Authorization: `Bearer ${data.token}` },
  };

  const res = http.get(url, params);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
  });

  errorRate.add(!ok);
  reqDuration.add(res.timings.duration);

  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 sn think time
}
