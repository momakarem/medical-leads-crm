# n8n Generic Webhook Workflow

Task 14 validates external lead ingestion through n8n without adding CRM-specific integration logic.

## Workflow Architecture

```text
Manual Trigger
↓
Set Lead Data
↓
HTTP Request
↓
CRM Generic Webhook
↓
Lead Created
↓
Activity Logged
```

n8n acts as middleware and a testing tool. The CRM remains the source of truth for validation, lead creation, activity logging, ownership, and future business rules.

## Files

- Workflow import file: `backend/n8n/medical-leads-crm-generic-webhook.workflow.json`
- CRM webhook documentation: `backend/docs/generic-lead-webhook.md`
- Postman comparison collection: `backend/postman/generic-lead-webhook.postman_collection.json`

## Environment Variables

If n8n runs in Docker, use:

```env
CRM_WEBHOOK_URL=http://host.docker.internal:3000/webhooks/leads
```

If n8n runs directly on Windows without Docker, use:

```env
CRM_WEBHOOK_URL=http://localhost:3000/webhooks/leads
```

The imported workflow defaults to `http://host.docker.internal:3000/webhooks/leads` when `CRM_WEBHOOK_URL` is not set.

## Setup Instructions

1. Make sure the CRM backend is running on port `3000`.
2. Open n8n.
3. Import this workflow:

   ```text
   backend/n8n/medical-leads-crm-generic-webhook.workflow.json
   ```

4. Open the `Set Lead Data` node.
5. Confirm these fields exist:

   - `name`
   - `phone`
   - `source_channel`
   - `campaign_name`
   - `treatment`

6. Open the `Send to CRM Webhook` node.
7. Confirm:

   - Method: `POST`
   - URL: `{{$env.CRM_WEBHOOK_URL || 'http://host.docker.internal:3000/webhooks/leads'}}`
   - Header: `Content-Type: application/json`
   - Body Content Type: JSON

8. Click `Execute Workflow`.

## Sample Payload

```json
{
  "name": "Mohammed Ahmed",
  "phone": "+201012345678",
  "source_channel": "n8n Test",
  "campaign_name": "Testing Campaign",
  "treatment": "Hair Transplant"
}
```

## Expected Success Response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Lead created successfully.",
  "lead_id": "lead-uuid"
}
```

## CRM Verification

After a successful run, verify in the CRM:

- A new lead exists.
- `status = new`.
- `owner_agent_id = null`.
- An activity exists with type `lead_created_via_webhook`.

You can also verify from the database or API. The Leads page should show the new lead after refresh.

## Logging Strategy

CRM logs:

- `Webhook Request Received.`
- `Webhook Lead Created.`
- `Webhook Validation Failed.`

n8n execution logs:

- `Manual Trigger` started the workflow.
- `Set Lead Data` generated the outgoing payload.
- `Send to CRM Webhook` sent the request and shows the CRM response.
- Failed HTTP requests stop the workflow and display the node error.

## Error Handling Tests

### Test 1: Valid Payload

Use the default workflow payload.

Expected:

- HTTP status `201`.
- Lead created.
- Activity logged.

### Test 2: Missing Phone

In `Set Lead Data`, remove or empty `phone`.

Expected:

- HTTP status `400`.
- Workflow stops at the HTTP Request node.
- No lead is created.

### Test 3: Missing Source Channel

In `Set Lead Data`, remove or empty `source_channel`.

Expected:

- HTTP status `400`.
- Workflow stops at the HTTP Request node.
- No lead is created.

### Test 4: Invalid Treatment

Set `treatment` to a value that does not exist, for example:

```text
Unknown Treatment
```

Expected:

- HTTP status `201`.
- Lead created.
- `treatment_id = null`.

### Test 5: Run 50 Times

Run the workflow 50 times from n8n.

Expected:

- 50 successful executions.
- 50 leads created.

### Test 6: Run 100 Times

Run the workflow 100 times from n8n.

Expected:

- 100 successful executions.
- No CRM failures.

## Postman Comparison

The same CRM endpoint can be tested without n8n using:

```text
backend/postman/generic-lead-webhook.postman_collection.json
```

Use Postman when you want to test the CRM webhook directly.

Use n8n when you want to test the real middleware flow:

```text
External Source → n8n → CRM Webhook
```

## Current Scope

Implemented for this task:

- n8n workflow.
- CRM webhook connection.
- End-to-end test instructions.
- Validation scenarios.
- Postman comparison.

Not implemented in this task:

- Meta integration.
- TikTok integration.
- Snapchat integration.
- OAuth.
- Webhook signatures.
- Retry system.
- Queue system.
- Notifications.
- Reports.
