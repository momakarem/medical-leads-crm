# TikTok Lead Generation Integration v1

Scope: one TikTok account, one Advertiser, one Lead Form, one test lead. No Snapchat, bulk sync, retries, queues, notifications, reports, duplicate detection, or assignment.

## Env

```env
TIKTOK_APP_ID=your-app-id
TIKTOK_APP_SECRET=your-app-secret
TIKTOK_REDIRECT_URI=https://your-domain.com/tiktok/callback
TIKTOK_TOKEN_ENCRYPTION_KEY=long-random-encryption-key
TIKTOK_API_BASE_URL=https://business-api.tiktok.com/open_api/v1.3
TIKTOK_OAUTH_AUTHORIZE_URL=provided-by-tiktok-business-api
TIKTOK_OAUTH_TOKEN_URL=provided-by-tiktok-business-api
TIKTOK_SCOPES=lead_management,advertiser_management
```

TikTok webhooks require public HTTPS.

## Admin Flow

All `/tiktok/*` endpoints require Admin login.

1. `GET /tiktok/connect` returns `auth_url`.
2. Open `auth_url` and grant Lead Generation / Lead Retrieval / Webhook-related permissions required by TikTok.
3. TikTok redirects to `GET /tiktok/callback?code=...` and CRM returns `session_id` + advertisers.
4. `GET /tiktok/sessions/:sessionId/forms?advertiser_id=ADVERTISER_ID` returns lead forms.
5. `POST /tiktok/connections` with:

```json
{
  "session_id": "temporary-session-id",
  "advertiser_id": "advertiser-id",
  "form_id": "form-id"
}
```

CRM stores one active connection. Access and refresh tokens are encrypted and never returned or logged.

## Webhook

```http
POST /webhooks/tiktok
```

Expected minimal payload:

```json
{
  "lead_id": "lead-id",
  "advertiser_id": "advertiser-id",
  "form_id": "form-id"
}
```

CRM retrieves lead details from TikTok API and creates a CRM lead:

- `source_channel = TikTok`
- `status = new`
- `owner_agent_id = null`
- `campaign_name = selected form name`

Activity created:

- `type = lead_created_via_tiktok`
- metadata: `advertiser_id`, `form_id`, `lead_id`

## Production Test Report

- Advertiser:
- Lead Form:
- TikTok App ID:
- Webhook URL:
- Result: PASS / FAIL
- Lead Name:
- Lead Phone:
- Lead created in DB: YES / NO
- Activity created: YES / NO

If failed, check OAuth URLs/scopes, permissions, expired token, wrong advertiser/form, webhook payload shape, lead mapping, and DB errors.
