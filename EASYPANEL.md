# EasyPanel Deployment — Medical Leads CRM

The repository is a monorepo. Deploy it as three EasyPanel services, not one:

1. PostgreSQL database.
2. NestJS API from `/backend`.
3. React/Nginx web app from `/frontend`.

Use the `main` branch for all services.

## Recommended domains

```text
Web: https://crm.example.com
API: https://api.crm.example.com
```

Create DNS `A` records for both names pointing to the EasyPanel server.

## 1. PostgreSQL

Create a PostgreSQL service from the EasyPanel template.

- Service name: `medical-leads-crm-db`
- Database: `medical_crm`
- User: generate a dedicated user.
- Password: generate a long random password.
- Do not expose port 5432 publicly.
- Enable persistent storage and backups.

Copy the internal connection URL supplied by EasyPanel. It should be similar to:

```text
postgresql://USER:PASSWORD@INTERNAL_POSTGRES_HOST:5432/medical_crm?schema=public
```

## 2. Backend service

Create a GitHub application service:

| EasyPanel field | Value |
|---|---|
| Owner | `momakarem` |
| Repository | `medical-leads-crm` |
| Branch | `main` |
| Build Path | `/backend` |
| Build method | Dockerfile |
| Dockerfile | `Dockerfile` |
| Container port | `3000` |
| Health path | `/health` |

Suggested service name: `medical-leads-crm-api`.

Add an HTTPS domain such as `api.crm.example.com` and enable the platform certificate.

### Backend environment

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<EASYPANEL_INTERNAL_POSTGRES_URL>
JWT_SECRET=<LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS>
JWT_EXPIRES_IN=3600
AUTH_COOKIE_NAME=medical_crm_access
COOKIE_SECURE=true
CORS_ORIGIN=https://crm.example.com
LOG_LEVEL=log
SECURITY_ENFORCE_HTTPS=true
SECURITY_HSTS_MAX_AGE=15552000
DUPLICATE_WINDOW_DAYS=30

META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://api.crm.example.com/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=<LONG_RANDOM_VERIFY_TOKEN>
META_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>

TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
TIKTOK_REDIRECT_URI=https://api.crm.example.com/tiktok/callback
TIKTOK_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>
TIKTOK_API_BASE_URL=https://business-api.tiktok.com/open_api/v1.3
TIKTOK_OAUTH_AUTHORIZE_URL=
TIKTOK_OAUTH_TOKEN_URL=
TIKTOK_SCOPES=lead_management,advertiser_management

SNAPCHAT_CLIENT_ID=
SNAPCHAT_CLIENT_SECRET=
SNAPCHAT_REDIRECT_URI=https://api.crm.example.com/snapchat/callback
SNAPCHAT_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>
SNAPCHAT_API_BASE_URL=https://adsapi.snapchat.com/v1
SNAPCHAT_OAUTH_AUTHORIZE_URL=https://accounts.snapchat.com/login/oauth2/authorize
SNAPCHAT_OAUTH_TOKEN_URL=https://accounts.snapchat.com/login/oauth2/access_token
SNAPCHAT_SCOPES=snapchat-marketing-api
```

Generate a different random value for each secret. Never copy `.env` from a development machine into GitHub.

Test after deployment:

```text
https://api.crm.example.com/health
```

Expected JSON contains `"status":"ok"`.

## 3. Frontend service

Create a second GitHub application service:

| EasyPanel field | Value |
|---|---|
| Owner | `momakarem` |
| Repository | `medical-leads-crm` |
| Branch | `main` |
| Build Path | `/frontend` |
| Build method | Dockerfile |
| Dockerfile | `Dockerfile` |
| Container port | `80` |
| Health path | `/healthz` |

Suggested service name: `medical-leads-crm-web`.

Add the HTTPS domain `crm.example.com`.

Set this Docker build argument before the first build:

```env
VITE_API_BASE_URL=https://api.crm.example.com
```

`VITE_API_BASE_URL` is a build-time value. Rebuild the frontend after changing it.

## GitHub access

The repository should be private because this is a CRM project. The EasyPanel warning shown for private repositories is expected: configure a GitHub token or GitHub App connection in EasyPanel Settings before saving the source.

Grant EasyPanel access only to the `medical-leads-crm` repository when possible. Do not paste the token into application environment variables.

## Values shown in the supplied screenshot

For the single service shown:

- Owner `momakarem`: correct if that is the GitHub account/organization that owns the repository.
- Repository `medical-leads-crm`: correct.
- Branch: must be `main`; leaving it empty is incorrect.
- Build Path `/`: incorrect for the current monorepo service layout.
  - Use `/backend` for the API service.
  - Use `/frontend` for the web service.
- Private repository warning: correct and must be resolved by connecting GitHub in EasyPanel Settings.

## Production blockers

Before handling real patient leads, complete the security gaps documented in `INSTALLATION.md`, especially webhook signature validation, token refresh, generic webhook authentication, and a production-safe first-admin creation flow.

