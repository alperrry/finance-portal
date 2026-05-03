# Finance Portal Keycloak Theme

Finance Portal icin Keycloak 26.x custom `login` + `email` temasi ve Keycloak'a ayri PostgreSQL database acilisi burada tutulur.

Bu tema mevcut frontend'in `frontend/src/styles/kapital.css` dosyasindaki tasarim dilini tekrar eder:

- Ana font: `Sora`
- Display font: `Playfair Display`
- Mono font: `JetBrains Mono`
- Brand accent: `#c1622f`
- Zemin: `#edeae4`
- Surface: `#f7f5f1`
- Ink text: `#111111`

> Not: `login/resources/img/favicon.ico` bilincli olarak placeholder'dir. Tarayici favicon'u `logo.svg` uzerinden alir. Gercek `.ico` istiyorsaniz bu dosyayi degistirin.

## Yapi

```text
keycloak-theme/
├── pom.xml
├── README.md
├── db/
│   └── init.sql
├── docker/
│   └── docker-compose.keycloak.yml
├── realm/
│   └── finance-portal-realm.json
└── src/main/resources/
    └── theme/
        └── finance-portal/
            ├── login/
            └── email/
```

## Dev Workflow

1. Ana compose dosyaniza [docker-compose.keycloak.yml](./docker/docker-compose.keycloak.yml) icindeki `postgres` volume mount'unu ve `keycloak` servisini merge edin.
2. PostgreSQL volume'u daha once olustuysa init script'i tekrar kosmaz. Ilk kurulum icin en temiz yol:

```bash
docker compose down -v
docker compose up -d postgres
```

3. Sonra Keycloak'i kaldirin:

```bash
docker compose up -d keycloak
```

4. Theme klasoru mount'lu oldugu icin FTL/CSS degisiklikleri container restart sonrasi hemen gorunur. Asagidaki flag'ler bunun icin kritiktir ve snippet'e dahil edildi:

```text
--spi-theme-static-max-age=-1
--spi-theme-cache-themes=false
--spi-theme-cache-templates=false
```

5. Admin UI:

```text
http://localhost:8180/admin/
```

Kullanici / sifre: `admin` / `admin`

6. Realm import mount'u aciksa `finance-portal` realm'i otomatik gelir. Theme atanmis gelmezse:

```text
Realm Settings -> Themes
Login Theme  = finance-portal
Email Theme  = finance-portal
Account Theme = keycloak.v2
```

## Database Setup

`db/init.sql` ayni PostgreSQL instance icinde Keycloak icin ayri `keycloak` kullanicisi ve `keycloak` database'i acar.

Varsayim:

- Mevcut uygulama DB'si zaten `finance`
- Mevcut uygulama user'i zaten `finance_user`

Alternatif olarak eger projenizde henuz hic init script yoksa mevcut uygulama DB'si ile birlikte asagidaki tarzi bir init de kullanabilirsiniz:

```sql
CREATE USER finance_user WITH PASSWORD 'finance_pass';
CREATE DATABASE finance OWNER finance_user;
GRANT ALL PRIVILEGES ON DATABASE finance TO finance_user;

CREATE USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE keycloak OWNER keycloak;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
```

Bu repo icinde mevcut setup'i bozmamak icin sadece Keycloak DB eklenir.

## Realm Import

`realm/finance-portal-realm.json` bir **starter dev realm** dosyasidir. Icerik:

- Realm: `finance-portal`
- `loginTheme`: `finance-portal`
- `emailTheme`: `finance-portal`
- `accountTheme`: `keycloak.v2`
- `rememberMe`: `true`
- `registrationAllowed`: `true`
- `resetPasswordAllowed`: `true`
- `verifyEmail`: `false` (dev)
- `otpPolicyType`: `totp`
- Realm role'lari: `NORMAL_USER`, `ADMIN`
- Public PKCE client: `finance-portal-frontend`

### Neden `finance-portal-backend` realm import'ta yok?

Repo'daki mevcut backend kodu `KeycloakAdminService` icinde `client_credentials` ile admin token aliyor. Bu su anlama gelir:

- `finance-portal-backend` client'i `bearer-only` olamaz
- `confidential` olmali
- `service accounts enabled` olmali
- `realm-management` altindan en az `view-users` ve `manage-users` role'lari verilmeli
- secret de backend ortamindaki `KEYCLOAK_ADMIN_CLIENT_SECRET` ile eslesmeli

Bu degerler environment'a bagli oldugu icin JSON icine sert sekilde gommedim. Aksi halde calisan mevcut backend setup'ini kirma riski var.

## Manuel Realm Setup

Realm import kullanmak istemezseniz veya mevcut backend Keycloak ayarinizi bozmadan ilerlemek istiyorsaniz:

1. `finance-portal` adinda realm olusturun.
2. `Realm Settings -> Login` altinda:
   - `User registration`: on
   - `Forgot password`: on
   - `Remember me`: on
   - `Verify email`: dev icin off, prod icin on
3. `Realm Settings -> Themes` altinda:
   - `Login Theme`: `finance-portal`
   - `Email Theme`: `finance-portal`
   - `Account Theme`: `keycloak.v2`
4. `Realm Roles` altinda `NORMAL_USER` ve `ADMIN` role'larini olusturun.
5. `Default Roles` tarafinda yeni kullanicilara `NORMAL_USER` verin.
6. `Clients -> Create client` ile `finance-portal-frontend` olusturun:
   - Type: `OpenID Connect`
   - Client authentication: off
   - Standard flow: on
   - PKCE challenge method: `S256`
   - Redirect URIs:
     - `http://localhost:3000/*`
     - `http://localhost:5173/*`
   - Web origins:
     - `http://localhost:3000`
     - `http://localhost:5173`
7. Eger backend'in profile update / admin API senaryolari kullanilacaksa `finance-portal-backend` client'ini ayri olusturun:
   - Client authentication: on
   - Service accounts roles: on
   - Standard flow: off
   - Direct access grants: off
   - Generated secret degeri backend ortamindaki `KEYCLOAK_ADMIN_CLIENT_SECRET` ile ayni olmali
   - `Service Account Roles -> realm-management` altindan en az:
     - `view-users`
     - `manage-users`

## Prod Build

JAR paketlemek icin:

```bash
cd keycloak-theme
mvn clean package
```

Uretilen artefact:

```text
target/keycloak-theme-finance-portal-1.0.0.jar
```

Prod kurulum adimlari:

1. JAR'i `${KEYCLOAK_HOME}/providers/` altina koyun.
2. Keycloak build alin:

```bash
${KEYCLOAK_HOME}/bin/kc.sh build
```

3. Keycloak'i yeniden baslatin.
4. Realm tarafinda `loginTheme` ve `emailTheme` olarak `finance-portal` secili oldugunu dogrulayin.

## Yeni FTL Override

Yeni ekran override etmek istediginde resmi kaynak yol:

```text
https://github.com/keycloak/keycloak/tree/main/themes/src/main/resources/theme/keycloak.v2/login
```

Bu tema `parent=keycloak.v2` oldugu icin yalnizca degistirmek istediginiz `.ftl` dosyalarini child theme altina koymaniz yeterlidir.

## Frontend Token Guncelleme

Frontend tasarim dili degisirse once su dosyayi referans alin:

```text
frontend/src/styles/kapital.css
```

Ardindan su dosyayi guncelleyin:

```text
src/main/resources/theme/finance-portal/login/resources/css/tokens.css
```

Genelde degisecek alanlar:

- `--fp-primary`
- `--fp-bg`
- `--fp-surface`
- `--fp-text-*`
- `--fp-radius-*`
- `--fp-space-*`
- `--fp-font-family`

Tek bir token degisikligiyle tum login ve email gorunumu donusur.
