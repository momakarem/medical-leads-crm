# Generic Inbound Lead Webhook v1

## URL

`POST /webhooks/leads`

No authentication is required in v1.

## Request Body

```json
{
  "name": "Mohammed Ahmed",
  "phone": "+201012345678",
  "source_channel": "Meta",
  "campaign_name": "Hair Transplant Campaign",
  "treatment": "Hair Transplant"
}
```

## Required Fields

- `name`
- `phone`
- `source_channel`

## Optional Fields

- `campaign_name`
- `treatment`

If `treatment` does not match an active treatment by name, the lead is still created with `treatment_id = null`.

## Success Response

Status: `201 Created`

```json
{
  "success": true,
  "message": "Lead created successfully.",
  "lead_id": "lead-uuid"
}
```

## Validation Error Response

Status: `400 Bad Request`

```json
{
  "success": false,
  "message": "Validation failed."
}
```

## Behavior

- Creates a new lead with status `new`.
- Leaves `owner_agent_id = null`.
- Does not trigger Round Robin assignment.
- Does not run capacity rules.
- Does not perform duplicate detection.
- Creates an activity with type `lead_created_via_webhook`.