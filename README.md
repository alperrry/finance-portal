# Finance Portal

Java 21 / Spring Boot 4 tabanlı bir finans portalı backend'i ve React (Vite) tabanlı bir frontend'den oluşan, tüm bağımlılıklarıyla (PostgreSQL, Keycloak, Redis, Kafka) ve bir gözlemlenebilirlik (observability) yığınıyla birlikte Docker Compose üzerinden tek komutla ayağa kalkan tam yığın (full-stack) bir uygulamadır.

> Bu doküman, projeyi hiç bilmeyen birinin sıfırdan kurup çalıştırabilmesi ve test edebilmesi için hazırlanmıştır.

---

## İçindekiler

1. [Teknoloji Yığını](#teknoloji-yığını)
2. [Servisler ve Portlar](#servisler-ve-portlar)
3. [Önkoşullar](#önkoşullar)
4. [Hızlı Başlangıç (Docker Compose)](#hızlı-başlangıç-docker-compose)
5. [Ortam Değişkenleri (`.env`)](#ortam-değişkenleri-env)
6. [Erişim Adresleri](#erişim-adresleri)
7. [API'ye Genel Bakış](#apiye-genel-bakış)
8. [Yerel Geliştirme](#yerel-geliştirme)
9. [Veritabanı ve Flyway](#veritabanı-ve-flyway)
10. [Kimlik Doğrulama (Keycloak)](#kimlik-doğrulama-keycloak)
11. [Testleri Çalıştırma](#testleri-çalıştırma)
12. [Gözlemlenebilirlik (Observability)](#gözlemlenebilirlik-observability)
13. [E-posta Testi (MailHog)](#e-posta-testi-mailhog)
14. [Proje Yapısı](#proje-yapısı)
15. [Sık Karşılaşılan Sorunlar](#sık-karşılaşılan-sorunlar)
16. [Notlar](#notlar)

---

## Teknoloji Yığını

**Backend**
- Java 21
- Spring Boot 4.0.1 (Maven)
- Spring Web MVC, Spring Security + OAuth2 Resource Server (JWT)
- Spring Data JPA + PostgreSQL
- Flyway (veritabanı şema göçleri)
- Redis (cache + Spring Data Redis)
- Apache Kafka (kafka-clients)
- WebSocket
- Log4j2 (JSON layout — loglar JSON formatında)
- SpringDoc OpenAPI / Swagger UI
- Diğer kütüphaneler: OkHttp (HTTP istemci), ta4j (teknik analiz), `totp` (2FA), Rome (RSS), Jsoup (HTML scraping), ummalqura-calendar (Hicri takvim), Lombok

**Frontend**
- React 19 + TypeScript, Vite 7 (build aracı)
- MUI (Material UI) v9 + Emotion, MUI X Data Grid
- TanStack Query / Table / Virtual
- React Router 7, i18next (çoklu dil)
- Keycloak JS (kimlik doğrulama), STOMP + SockJS (WebSocket)
- Grafik: Recharts, Lightweight Charts; PDF: pdfmake

**Altyapı (Docker)**
- PostgreSQL 15, Keycloak 26, Redis 7, Kafka 3.7
- Observability: OpenSearch, Data Prepper, Grafana Tempo, Prometheus, OpenTelemetry Collector, Grafana
- MailHog (geliştirme ortamı e-posta yakalama)

---

## Servisler ve Portlar

| Servis | İmaj | Host Portu | Açıklama |
|---|---|---|---|
| backend | `./backend` (build) | **8081** | Spring Boot API |
| frontend | `./frontend` (build) | **3000** | React (Vite) uygulaması |
| postgres | postgres:15 | 5432 | Ana veritabanı (`finance`) |
| keycloak | keycloak:26.0 | 8080 | Kimlik doğrulama / yetkilendirme |
| redis | redis:7-alpine | 6379 | Cache |
| kafka | apache/kafka:3.7.0 | 9092 | Mesajlaşma |
| opensearch | opensearch:2.11.0 | 9200 | Log depolama |
| data-prepper | data-prepper:2.7.0 | 2021 | Log/trace pipeline |
| tempo | grafana/tempo:2.6.1 | 3200 | Dağıtık izleme (tracing) |
| prometheus | prometheus:v3.1.0 | 9090 | Metrikler |
| otel-collector | otel-collector-contrib:0.115.1 | 4317 / 4318 | OpenTelemetry toplayıcı |
| grafana | grafana:11.4.0 | **3001** | Dashboard'lar (konteyner içi 3000) |
| mailhog | mailhog/mailhog | 1025 (SMTP) / 8025 (Web) | E-posta testi |

> ⚠️ **Dikkat:** Frontend ve Grafana host tarafında çakışmaması için Grafana **3001** portuna yönlendirilmiştir. Frontend **3000**, Grafana **3001**.

---

## Önkoşullar

Sisteminizde kurulu olması gerekenler:

- **Docker** ve **Docker Compose** (v2 — `docker compose` komutu). Tek başına bunlar projeyi çalıştırmak için yeterlidir.
- (Sadece Docker'sız yerel geliştirme için) **JDK 21** ve **Node.js 20.19+ veya 22.12+** / npm. (Vite 7, Node 18 desteğini kaldırdı.)

Kurulum doğrulama:

```bash
docker --version
docker compose version
```

> 💡 Tüm yığın 8 GB civarı RAM ister (observability servisleri dahil). Makineniz kısıtlıysa observability servislerini kapatabilirsiniz (aşağıya bakın).

---

## Hızlı Başlangıç (Docker Compose)

Projeyi en hızlı çalıştırma yolu Docker Compose'tur — `mvn` veya `node` kurmanıza gerek yoktur.

```bash
# 1. Depoyu klonlayın
git clone <REPO_URL>
cd <PROJE_KLASORU>

# 2. Backend ortam değişkeni dosyasını oluşturun (zorunlu)
#    Docker Compose, ./backend/.env dosyasını okur; dosya yoksa başlamaz.
cp backend/.env.example backend/.env
#    Ardından backend/.env içindeki API anahtarlarını doldurun (bkz. Ortam Değişkenleri bölümü).

# 3. Keycloak temasını derleyin (JAR yoksa Keycloak başlamaz — bkz. Kimlik Doğrulama bölümü)
cd keycloak-theme && npm install && npm run build-keycloak-theme && cd ..

# 4. Tüm servisleri build edip başlatın
docker compose up --build
```

İlk başlatma birkaç dakika sürer (imajlar indirilir, backend ve frontend derlenir). Servislerin hazır olduğunu görmek için:

```bash
docker compose ps        # tüm servislerin durumu
docker compose logs -f backend   # backend loglarını izle
```

Durdurmak ve verileri silmek için:

```bash
docker compose down        # konteynerleri durdur
docker compose down -v     # konteynerleri + volume'ları (DB verisi vb.) sil
```

---

## Ortam Değişkenleri (`.env`)

Backend, çalışmak için `./backend/.env` dosyasına ihtiyaç duyar (Docker Compose bu dosyayı `env_file` ile yükler; **dosya yoksa `docker compose up` başlamaz**). Depoda hazır bir **`backend/.env.example`** vardır; onu kopyalayıp doldurun:

```bash
cp backend/.env.example backend/.env
```

Sonra aşağıdaki **anahtar gerektiren** değişkenleri kendi değerlerinizle doldurun. Diğer tüm değerler (URL'ler, cron ifadeleri, zaman aşımları) hazır gelir ve değiştirmeniz gerekmez.

### Alınması gereken anahtarlar

| Değişken | Nereden alınır | Zorunlu mu? |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com → API Keys (ücretsiz) | Haber AI özelliği için |
| `NEWS_API_KEY` | https://newsapi.org/register (ücretsiz) | Haber çekme için |
| `EVDS_API_KEY` | https://evds2.tcmb.gov.tr → üye ol → Profil > API Anahtarı (ücretsiz) | Makro veri için |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Keycloak konsolu → Clients → `finance-portal-backend` → Credentials (realm import sonrası) | Kimlik doğrulama için |

> 💡 TCMB, Yahoo Finance, TEFAS ve VIOP kaynakları herkese açık olduğu için **anahtar gerektirmez** — ilgili URL'ler `.env.example` içinde hazırdır.

### Notlar

- **Docker vs yerel:** `docker-compose.yml`'deki `environment:` bloğu datasource, Redis ve OAuth issuer değerlerini konteyner ağına göre (`postgres`, `redis`, `keycloak` host adları) **ezer**. `.env` içindeki `localhost` değerleri ise Docker'sız yerel çalıştırma (`mvn`) içindir.
- **Güvenlik:** Gerçek `.env` dosyasını **asla git'e commit'lemeyin**. `.gitignore` dosyanıza şunu ekleyin:
  ```gitignore
  backend/.env
  ```
  Yalnızca `backend/.env.example` (anahtarları boş hali) repo'ya girer.

---

## Erişim Adresleri

Yığın ayağa kalktıktan sonra:

| Ne | Adres | Giriş Bilgisi |
|---|---|---|
| Frontend uygulaması | http://localhost:3000 | — |
| Backend API | http://localhost:8081 | — |
| Swagger UI (API dokümanı) | http://localhost:8081/swagger-ui/index.html | — |
| Actuator health | http://localhost:8081/actuator/health | — |
| Keycloak yönetim konsolu | http://localhost:8080 | `admin` / `admin` |
| Grafana | http://localhost:3001 | `admin` / `admin` |
| Prometheus | http://localhost:9090 | — |
| MailHog (gelen e-postalar) | http://localhost:8025 | — |
| OpenSearch | http://localhost:9200 | — |

---

## API'ye Genel Bakış

Tüm endpoint'ler `http://localhost:8081` altında sunulur. Tam, etkileşimli liste ve istek/yanıt şemaları için **Swagger UI**: http://localhost:8081/swagger-ui/index.html

API büyük ölçüde `/api/v1/...` ön ekini kullanır (bazı eski uçlar `/api/...` altındadır). Kimlik doğrulama gerektiren uçlar için Keycloak'tan alınan JWT `Authorization: Bearer <token>` başlığıyla gönderilir.

Başlıca alanlar:

| Alan | Temel yol(lar) | Açıklama |
|---|---|---|
| Portföy | `/api/v1/portfolios` | Portföy CRUD; detayda güncel değerleme ve kâr/zarar (P/L) |
| Manuel Pozisyon | `/api/v1/portfolios/{id}/positions` | Manuel pozisyon ekleme/kapatma/silme |
| Simülasyon | `/api/v1/portfolio/manual-positions/{id}/what-if` · `/simulation` | What-if ve pozisyon simülasyonu (USD bazlı) |
| Piyasa verisi | `/api/v1/stocks` · `/fx` · `/funds` · `/bonds` · `/viop` · `/macro` | Hisse, döviz, fon (TEFAS), tahvil, VIOP, makro/enflasyon |
| Hisse İndikatörleri | `/api/v1/stocks/{symbol}/indicators` | Teknik indikatör geçmişi ve son değerler |
| Geçmiş / Karşılaştırma | `/api/v1/history/{type}/{code}` · `/history/compare` | Zaman serisi geçmişi ve karşılaştırma |
| Açılış (Landing) | `/api/v1/landing/market-snapshot` | Ana sayfa piyasa özeti |
| Haberler | `/api/v1/news` · `/api/v1/news/google-rss/search` · `/api/v1/categories` | Haber listeleme, kategori filtreleme ve durum geçişleri (yayınla/arşivle) |
| Çizimler | `/api/v1/drawings` | Grafik üzeri çizim kaydetme (CRUD) |
| Kullanıcı | `/api/v1/users/me` · `/api/me/preferences` | Profil, şifre, tercihler |
| Güvenlik / 2FA | `/api/v1/users/me/security/otp/...` | TOTP kurulum/doğrulama/silme |
| Admin | `/api/v1/admin/...` | Kullanıcı yönetimi, haber/kategori yönetimi, denetim kaydı (audit), piyasa verisi backfill/temizleme |

> Çoğu `admin/*` ucu yönetici (admin) rolü gerektirir; rol ve kullanıcı tanımları Keycloak realm'inden gelir.

---

## Yerel Geliştirme

Docker olmadan tek tek servislerle geliştirmek isterseniz: altyapıyı Docker'da çalıştırıp backend/frontend'i lokalde başlatabilirsiniz.

**Altyapıyı çalıştırın (uygulama servisleri hariç):**

```bash
docker compose up -d postgres keycloak redis kafka mailhog
```

**Backend (JDK 21 gerekir):**

```bash
cd backend
./mvnw spring-boot:run
# JAR derlemek için:
./mvnw clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

> Lokalde çalışırken servis host adlarını `localhost` olarak verin (örn. `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/finance`, OAuth issuer `http://localhost:8080/realms/finance-portal`).

**Frontend (Node.js 20.19+ / 22.12+ gerekir):**

```bash
cd frontend
npm install
npm run dev        # geliştirme sunucusu (Vite)
```

Diğer komutlar:

```bash
npm run build      # tsc -b && vite build  (TypeScript derleme + üretim derlemesi)
npm run preview    # üretim derlemesini yerelde önizle
npm run lint       # ESLint
```

---

## Veritabanı ve Flyway

- Veritabanı: PostgreSQL, DB adı `finance`, kullanıcı `finance_user`, şifre `finance_pass`.
- Şema, **Flyway** göçleriyle yönetilir. Compose, `./db` klasörünü konteynere bağlar ve göçleri `filesystem:/db/migrations` altından okur.
- Yani SQL göç dosyaları `./db/migrations/` klasöründe bulunur (`V1__...sql`, `V2__...sql` biçiminde).
- `spring.jpa.hibernate.ddl-auto=validate` ayarı vardır; yani şema otomatik oluşturulmaz, Flyway göçleriyle eşleşmesi beklenir.

Veritabanına bağlanmak için:

```bash
docker compose exec postgres psql -U finance_user -d finance
```

---

## Kimlik Doğrulama (Keycloak)

- Backend bir **OAuth2 Resource Server**'dır; JWT token'larını Keycloak'tan doğrular.
- Realm: **`finance-portal`**, issuer: `http://keycloak:8080/realms/finance-portal` (konteyner ağı içinde).
- Keycloak, `--import-realm` ile başlatılır ve realm tanımını `./keycloak-theme/realm/` klasöründen içe aktarır.
- Özel tema, `./keycloak-theme/dist_keycloak/` altında derlenmiş bir `.jar` olarak provider klasörüne bağlanır.

> ⚠️ **Önemli:** Compose, tema JAR dosyasını (`keycloak-theme-for-kc-all-other-versions.jar`) salt-okunur olarak bağlar. Bu dosya **mevcut değilse Keycloak servisi başlamaz**. Tema klasöründe bir build adımı (genellikle `npm install && npm run build-keycloak-theme` benzeri) ile bu JAR'ın önceden üretilmiş olması gerekir.

Frontend Keycloak ayarları (compose'ta tanımlı):
`VITE_KEYCLOAK_URL=http://localhost:8080`, `VITE_KEYCLOAK_REALM=finance-portal`, `VITE_KEYCLOAK_CLIENT_ID=finance-portal-frontend`.

### ⚠️ Realm ayarlarını kalıcı/taşınabilir yapma (önemli)

Keycloak admin konsolundan (web arayüzü) elle yaptığınız ayarlar yalnızca konteynerin Docker volume'una (`fp_keycloak_data`) yazılır; **repo'ya girmez ve projeyi indiren kişiye geçmez.** Ayarların herkeste aynı şekilde çalışması için realm'i bir JSON dosyasına export edip repo'ya koymanız gerekir. Compose bu dosyayı `./keycloak-theme/realm/` klasöründen `--import-realm` ile otomatik yükler.

> Admin konsolundaki "partial export" **client secret'larını ve kullanıcıları içermez** — bu yüzden aşağıdaki CLI export'unu kullanın; `--users realm_file` ile kullanıcıları da dahil eder.

Realm'i export etmek için (H2 dosya kilidini önlemek üzere önce durdurun):

```bash
# 1. Keycloak'ı durdur (veri volume'da korunur)
docker compose stop keycloak

# 2. Aynı volume ile geçici konteynerde realm'i export et
docker compose run --rm \
  -v "$(pwd)/keycloak-theme/realm:/export" \
  keycloak \
  export --dir /export --realm finance-portal --users realm_file

# 3. Keycloak'ı geri başlat
docker compose start keycloak
```

Bu, `./keycloak-theme/realm/finance-portal-realm.json` dosyasını üretir. Bu dosyayı git'e ekleyin.

**İndiren kişiyi simüle ederek test edin.** En güvenli yol, mevcut volume'larınıza **hiç dokunmadan** izole, geçici bir Keycloak çalıştırıp JSON'u ona yükletmektir:

```bash
docker run --rm -p 9999:8080 \
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -v "$(pwd)/keycloak-theme/realm:/opt/keycloak/data/import:ro" \
  quay.io/keycloak/keycloak:26.0 \
  start-dev --import-realm
```

Loglarda şu satırları görmelisiniz:

```
KC-SERVICES0030: Full model import requested. Strategy: OVERWRITE_EXISTING
Realm 'finance-portal' imported
KC-SERVICES0032: Import finished successfully
```

Ardından `http://localhost:9999` (incognito pencere önerilir; mevcut 8080 oturumuyla çerez çakışmasını önler) → `admin`/`admin` ile girip realm seçiciden `finance-portal`'a geçin ve doğrulayın: client'lar (`finance-portal-backend`, `finance-portal-frontend`), backend client'ının **Credentials**'taki secret'ı ve kullanıcılar geldi mi? `--rm` sayesinde konteyner Ctrl+C ile iz bırakmadan silinir; ana kurulumunuza dokunmaz.

> ⚠️ **Alternatif (yıkıcı):** `docker compose down -v` ile tüm volume'ları silip `docker compose up keycloak` derseniz de sıfırdan import test edilir — ama bu **DB dahil tüm verileri kalıcı olarak siler**. Üstteki izole yöntem çok daha güvenlidir.

> Not: `KEYCLOAK_ADMIN_CLIENT_SECRET`, export edilen realm JSON'undaki client secret ile **eşleşmelidir**. Yeni bir secret üretirseniz `backend/.env` içindeki değeri de güncelleyin.

### Özel Keycloak teması (Keycloakify)

`keycloak-theme/` klasörü, giriş/hesap ekranlarının özel görünümünü sağlayan, **Keycloakify** (React + Vite) tabanlı bir Keycloak temasıdır. Compose, derlenmiş tema JAR'ını Keycloak'ın provider dizinine bağlar:

```
./keycloak-theme/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar
```

Bu JAR bir **build çıktısıdır** ve depoda bulunmayabilir. **Dosya yoksa Keycloak başlamaz**, bu yüzden `docker compose up` öncesi temayı bir kez derleyin:

```bash
cd keycloak-theme
npm install                    # postinstall: keycloakify sync-extensions
npm run build-keycloak-theme   # vite build && keycloakify build
```

Bu komut `keycloak-theme/dist_keycloak/` dizinini oluşturur ve içine JAR dosyalarını yazar. Keycloak 26 için `keycloak-theme-for-kc-all-other-versions.jar` kullanılır (compose'ta bağlı olan dosya budur). Tema derlemesi Node.js (20.19+ / 22.12+) ve JAR paketleme için **JDK gerektirir** (Keycloakify Maven kullanır).

---

## Testleri Çalıştırma

Backend testleri **Testcontainers** kullanır (gerçek PostgreSQL'i geçici bir konteynerde başlatır) ve birim testlerde H2 ile MockWebServer'dan yararlanır.

```bash
cd backend
./mvnw test
```

> 🐳 **Testcontainers için Docker'ın çalışıyor olması zorunludur.** Testler çalışırken arka planda geçici konteynerler ayağa kalkar.

Tek bir test sınıfını çalıştırmak:

```bash
./mvnw test -Dtest=SınıfAdı
```

---

## Gözlemlenebilirlik (Observability)

Uygulama, OpenTelemetry Java agent ile trace/metrik üretir ve OTel Collector'a gönderir:

- **Metrikler** → Prometheus (http://localhost:9090) → Grafana
- **Trace'ler** → Tempo → Grafana
- **Loglar** → Kafka → Data Prepper → OpenSearch → Grafana

> ℹ️ OpenTelemetry, `pom.xml`'de bir bağımlılık olarak **değil**, çalışma zamanında Java agent olarak eklenir. Agent JAR'ı (v2.12.0, sürüm sabitlenmiş) backend `Dockerfile`'ında indirilir ve `-javaagent:/opentelemetry-javaagent.jar` parametresi `docker-compose.yml`'deki `JAVA_TOOL_OPTIONS` ile devreye girer. Bu yüzden Docker'sız yerel çalıştırmada (`mvn`) telemetri otomatik aktif olmaz.

Dashboard'lar için Grafana: http://localhost:3001 (`admin` / `admin`). Veri kaynakları ve dashboard'lar `./observability/grafana/provisioning` üzerinden otomatik tanımlanır.

Kaynak kullanımını azaltmak isterseniz observability servislerini başlatmayabilirsiniz; çekirdek uygulamayı çalıştırmak için:

```bash
docker compose up postgres keycloak redis kafka backend frontend mailhog
```

> Not: Backend, `otel-collector`'a `depends_on` ile bağlıdır; observability'siz çalıştırmak isterseniz compose dosyasında bu bağımlılığı kaldırmanız gerekebilir.

---

## E-posta Testi (MailHog)

Uygulamanın gönderdiği e-postalar gerçek bir sunucuya gitmez; MailHog tarafından yakalanır.

- SMTP: `localhost:1025`
- Web arayüzü (gelen kutusu): http://localhost:8025

---

## Proje Yapısı

> Aşağıdaki yapı, `docker-compose.yml`'deki build context ve volume bağlamalarından çıkarılmıştır.

```
.
├── docker-compose.yml
├── backend/                 # Spring Boot uygulaması
│   ├── pom.xml
│   ├── Dockerfile
│   └── .env                 # (siz oluşturacaksınız)
├── frontend/                # React 19 + TypeScript (Vite 7)
│   ├── package.json
│   └── Dockerfile
├── db/
│   └── migrations/          # Flyway SQL göç dosyaları
├── keycloak-theme/
│   ├── realm/               # İçe aktarılan realm tanımı
│   └── dist_keycloak/       # Derlenmiş tema JAR'ı
└── observability/
    ├── data-prepper/pipelines.yaml
    ├── tempo/tempo.yaml
    ├── prometheus/prometheus.yml
    ├── otel/collector-config.yaml
    └── grafana/{provisioning,dashboards}
```

---

## Sık Karşılaşılan Sorunlar

- **`docker compose up` hemen hata veriyor / `.env` bulunamadı:** `backend/.env` dosyasını oluşturun (en azından boş olarak).
- **Keycloak başlamıyor / tema JAR'ı bulunamadı:** `keycloak-theme/dist_keycloak/` altındaki tema JAR'ı eksiktir. `cd keycloak-theme && npm install && npm run build-keycloak-theme` ile derleyin.
- **Port çakışması (3000/8080/5432 vb.):** Bu portları kullanan başka bir uygulamayı kapatın veya compose'taki port eşlemelerini değiştirin.
- **Backend ayağa kalkıyor ama DB doğrulaması hata veriyor:** `ddl-auto=validate` olduğu için şema Flyway göçleriyle eşleşmelidir; `db/migrations` klasörünün dolu ve bağlı olduğundan emin olun.
- **Yetersiz bellek / servisler çöküyor:** Observability servislerini başlatmayın (yukarıdaki çekirdek komutu kullanın) veya Docker'a daha fazla RAM verin.
- **İlk build çok uzun sürüyor:** Normaldir; imaj indirme + Maven/npm derlemesi nedeniyle ilk seferde birkaç dakika sürebilir.

---

## Notlar

- **Docker build testleri çalıştırmaz:** Backend imajı `mvn -DskipTests package` ile derlenir; testleri ayrıca `./mvnw test` ile çalıştırın (bkz. [Testleri Çalıştırma](#testleri-çalıştırma)).
- **Frontend Docker imajı geliştirme modundadır:** Konteyner, Vite dev sunucusunu çalıştırır (`npm run dev`), üretim derlemesi (`npm run build`) değil. Üretim dağıtımı için ayrı bir derleme/serve adımı gerekir.
- **OTel agent sürümü sabit:** `v2.12.0` (backend `Dockerfile`). Güncellerken bu sürümü değiştirin.

Bu README, projedeki gerçek dosyalara dayanır ve kurulum için gereken tüm adımları içerir. Sıfırdan kuran biri sırasıyla: `.env` doldurma → Keycloak teması derleme → `docker compose up --build` adımlarını izlemelidir.
