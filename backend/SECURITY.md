# Medical Leads CRM Security Notes

## Encryption in transit

The NestJS API is prepared for production HTTPS behind a reverse proxy or load balancer.

Production settings:

- Terminate TLS at Nginx, Cloudflare, AWS ALB, Azure App Gateway, or the hosting platform.
- Set `COOKIE_SECURE=true`.
- Set `SECURITY_ENFORCE_HTTPS=true` after TLS is active.
- Keep `SECURITY_HSTS_MAX_AGE=15552000` or higher after validating HTTPS.

In local Docker development, HTTP is intentionally allowed for `127.0.0.1` / `localhost`.

## Encryption at rest

Patient data must be stored on an encrypted database/storage layer in production:

- Use a managed PostgreSQL database with encryption at rest enabled, or
- Use encrypted VM disks / encrypted Docker volumes for self-hosted PostgreSQL.

The local Docker Compose file is a development environment and does not replace production disk/database encryption controls.

## Export restrictions

Lead export is restricted in the backend to Admin and Manager roles only. Frontend export controls are hidden for users without `leads.export` permission, but backend authorization remains the source of truth.

## Sensitive secrets

Access tokens, refresh tokens, JWT secrets, and passwords must never be logged or returned by APIs. Integration tokens are stored encrypted by provider-specific token encryption services.
