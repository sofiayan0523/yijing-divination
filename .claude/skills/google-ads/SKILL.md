---
name: google-ads
description: >
  Analyze Google Ads accounts and campaign performance using Space-provided
  Google Ads API credentials. Use for campaign reporting, GAQL queries,
  credential validation, access-level checks, and carefully audited ad
  operations.
---

# Google Ads

Use this skill when the user asks to inspect, report on, or operate Google Ads
accounts from Omni. Prefer read-only queries unless the user explicitly asks for
a change.

## Required Credentials

The Space must provide these environment variables:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

Never print these values. To check presence, use the helper's `check-env`
command or shell checks that only print `configured`.

## Quick Start

Use the bundled helper for deterministic API calls:

```bash
python .claude/skills/google-ads/scripts/google_ads_helper.py check-env
python .claude/skills/google-ads/scripts/google_ads_helper.py list-customers
python .claude/skills/google-ads/scripts/google_ads_helper.py customer-summary \
  --customer-id 9840325374
```

For custom GAQL:

```bash
python .claude/skills/google-ads/scripts/google_ads_helper.py search \
  --customer-id 9840325374 \
  --query "SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 10"
```

## Current Verified Context

- Google Ads API version: `v24`
- Login customer ID is the MCC account in `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
- This Space has used MCC `6639532050` and ad account `9840325374`
- Current developer token level observed in this Space: Explorer Access

Explorer Access can query production accounts and perform many mutate calls, but
does not allow Keyword Planner, Reach Planner, customer creation, or billing
operations. If a user asks for keyword ideas and the helper returns an Explorer
Access 403, tell them Basic Access is required.

## Safe Workflow

1. Run `check-env` before any Google Ads task.
2. Run `list-customers` to confirm accessible customers.
3. Use `customer-summary` or `search` for reporting.
4. Before any mutate operation, explain the exact customer ID, resource type,
   intended changes, and rollback path, then ask the user for confirmation.
5. After any mutate operation, record a TAEA audit entry with evidence.

## TAEA Audit Requirements

Every Google Ads action must be transparent, auditable, and explainable.

For read-only queries, report:

- customer ID
- GAQL query or endpoint
- time range
- returned row count
- any skipped fields or API errors

For mutation requests, record:

```json
{
  "service": "google_ads",
  "api_version": "v24",
  "operation": "campaign_budget.mutate",
  "customer_id": "9840325374",
  "login_customer_id": "configured_mcc",
  "confirmation": "explicit user approval text",
  "request_summary": "Set campaign budget X to amount Y",
  "resource_names": ["customers/9840325374/campaignBudgets/..."],
  "ops_consumed_estimate": 1,
  "result": "success_or_error",
  "evidence": "API response summary or error code"
}
```

Do not create or modify campaigns, budgets, ads, assets, keywords, audiences, or
billing settings without explicit user confirmation in the current conversation.

## Common GAQL Queries

List enabled/recent campaigns:

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type
FROM campaign
ORDER BY campaign.id
LIMIT 50
```

Recent campaign performance:

```sql
SELECT
  campaign.id,
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
ORDER BY metrics.clicks DESC
LIMIT 50
```

Customer summary:

```sql
SELECT
  customer.id,
  customer.descriptive_name,
  customer.currency_code,
  customer.time_zone
FROM customer
LIMIT 1
```

## Error Handling

- `OPERATION_NOT_PERMITTED_FOR_ACCESS_LEVEL` or "not allowed for use with
  explorer access": explain that Basic or Standard Access is required.
- `USER_PERMISSION_DENIED`: verify the OAuth user has access to the customer and
  the MCC login customer is linked.
- `CUSTOMER_NOT_FOUND`: rerun `list-customers` and use the returned ID without
  dashes.
- `INVALID_ARGUMENT` for GAQL: show the API error message and revise the query.

## Security

- Never echo credentials or include them in GitHub issues, PRs, logs, or final
  answers.
- Never write credential values into `.env`, source files, tests, screenshots, or
  examples.
- Redact Authorization headers and developer tokens from command output.
