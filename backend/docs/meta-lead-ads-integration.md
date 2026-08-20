# Meta Lead Ads Integration v1

Scope: one Facebook account, one Page, one Lead Form, one real/test lead. No TikTok, Snapchat, retries, queues, reports, notifications, duplicate detection, or assignment.

## Env

```env
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=https://your-domain.com/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=long-random-verify-token
META_TOKEN_ENCRYPTION_KEY=long-random-encryption-key
```

Meta webhooks require public HTTPS. `localhost` will not work unless exposed through ngrok/Cloudflare Tunnel.

## Admin Flow

All `/facebook/*` endpoints require Admin login.

1. `GET /facebook/connect` returns `auth_url`.
2. Open `auth_url` and grant only: `pages_show_list`, `leads_retrieval`, `pages_manage_metadata`.
3. Facebook redirects to `GET /facebook/callback?code=...` and CRM returns `session_id` + pages.
4. `GET /facebook/sessions/:sessionId/forms?page_id=PAGE_ID` returns lead forms.
5. `POST /facebook/connections` with:

```json
{
  "session_id": "temporary-session-id",
  "page_id": "page-id",
  "form_id": "form-id"
}
```

CRM saves one active connection, subscribes the Page to `leadgen`, and stores the Page token encrypted. Tokens are never returned or logged.

## Meta Webhook

Verification:

```http
GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=123
```

Lead event:

```http
POST /webhooks/meta
```

CRM extracts `leadgen_id`, `page_id`, `form_id`, fetches lead details from Meta Graph API, then creates a CRM lead:

- `source_channel = Meta`
- `status = new`
- `owner_agent_id = null`
- `campaign_name = selected form name`

Activity created:

- `type = lead_created_via_meta`
- metadata: `page_id`, `form_id`, `leadgen_id`

## Production Test Report

- Facebook Page:
- Lead Form:
- Meta App ID:
- Webhook URL:
- Result: PASS / FAIL
- Lead Name:
- Lead Phone:
- Lead created in DB: YES / NO
- Activity created: YES / NO
- Logs:
  - Meta Webhook Received.
  - leadgen_id received.
  - Meta Graph API request: lead details.
  - Meta Graph API response received.
  - Meta Lead Created.
  - Meta Activity Created.

If failed, check verify token, expired token, permissions, page subscription, selected Page/Form, mapping, and DB errors.
