# Snapchat Lead Generation Integration v1

Scope: one Snapchat account, one Ad Account, one Lead Form, one test lead. No Google Lead Forms, bulk sync, historical import, retries, queues, notifications, reports, duplicate detection, or assignment.

## Env

```env
SNAPCHAT_CLIENT_ID=your-client-id
SNAPCHAT_CLIENT_SECRET=your-client-secret
SNAPCHAT_REDIRECT_URI=https://your-domain.com/snapchat/callback
SNAPCHAT_TOKEN_ENCRYPTION_KEY=long-random-encryption-key
SNAPCHAT_API_BASE_URL=https://adsapi.snapchat.com/v1
SNAPCHAT_OAUTH_AUTHORIZE_URL=provided-by-snapchat
SNAPCHAT_OAUTH_TOKEN_URL=provided-by-snapchat
SNAPCHAT_SCOPES=snapchat-marketing-api
```

Snapchat webhooks require public HTTPS.

## Admin Flow

All `/snapchat/*` endpoints require Admin login.

1. `GET /snapchat/connect` returns `auth_url`.
2. Open `auth_url` and grant required Lead Generation / Lead Retrieval / Webhook permissions.
3. Snapchat redirects to `GET /snapchat/callback?code=...` and CRM returns `session_id` + ad accounts.
4. `GET /snapchat/sessions/:sessionId/forms?ad_account_id=AD_ACCOUNT_ID` returns lead forms.
5. `POST /snapchat/connections` with:

```json
{
  "session_id": "temporary-session-id",
  "ad_account_id": "ad-account-id",
  "form_id": "form-id"
}
```

CRM stores one active connection. Tokens are encrypted and never returned or logged.

## Webhook

```http
POST /webhooks/snapchat
```

Expected minimal payload:

```json
{
  "lead_id": "lead-id",
  "ad_account_id": "ad-account-id",
  "form_id": "form-id"
}
```

Snapchat acts only as a provider adapter. It retrieves lead details and passes normalized data to `LeadIngestionService`.

CRM creates a lead:

- `source_channel = Snapchat`
- `status = new`
- `owner_agent_id = null`
- `campaign_name = selected form name`

Activity created:

- `type = lead_created_via_snapchat`
- metadata: `ad_account_id`, `form_id`, `lead_id`, `source_channel`

## Production Test Report

- Ad Account:
- Lead Form:
- Snapchat Client ID:
- Webhook URL:
- Result: PASS / FAIL
- Lead Name:
- Lead Phone:
- Lead created in DB: YES / NO
- Activity created: YES / NO

If failed, check OAuth URLs/scopes, permissions, expired token, wrong ad account/form, webhook payload shape, lead mapping, and DB errors.
