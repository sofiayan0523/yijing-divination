---
name: meta-ads
description: >
  Analyze Meta Ads accounts, campaigns, and performance using Space-provided
  Meta Marketing API credentials. Use for Meta/Facebook Ads reporting,
  permission checks, BUC quota visibility, and carefully audited ad operations.
---

# Meta Ads

Use this skill when the user asks to inspect, report on, or operate Meta Ads
accounts from Omni. Prefer read-only queries unless the user explicitly asks for
a change.

## Required Credentials

The Space must provide these environment variables:

- `META_APP_ID`
- `META_ADS_ACCESS_TOKEN`
- `META_ADS_BUSINESS_ID`
- `META_ADS_AD_ACCOUNT_ID`

`META_ADS_ACCESS_TOKEN` should be a Meta Business System User token. Never print
the token value. To check credential presence, use the helper's `check-env`
command or shell checks that only print `configured`.

## Quick Start

Use the bundled helper for deterministic API calls:

```bash
python .claude/skills/meta-ads/scripts/meta_ads_helper.py check-env
python .claude/skills/meta-ads/scripts/meta_ads_helper.py probe-permissions
python .claude/skills/meta-ads/scripts/meta_ads_helper.py account-summary
python .claude/skills/meta-ads/scripts/meta_ads_helper.py list-campaigns --limit 20
python .claude/skills/meta-ads/scripts/meta_ads_helper.py insights --date-preset last_7d
```

## Current Verified Context

- Meta Graph API version: `v25.0`
- This Space has used Business `353899295593802` (`NumbersProtocol`)
- This Space has used ad account `act_4371652422934618` (`Numbers`, TWD,
  Asia/Taipei)
- Meta hosted MCP (`https://mcp.facebook.com/ads`) was tested but is not usable
  for Numbers Protocol yet: user OAuth is beta-allowlisted and System User
  tokens are rejected. Use this Marketing API helper instead.

## Safe Workflow

1. Run `check-env` before any Meta Ads task.
2. Run `probe-permissions` to confirm the token type and ad account access.
3. Use `account-summary`, `list-campaigns`, or `insights` for reporting.
4. Before any mutate operation, explain the exact ad account, object ID,
   intended changes, and rollback path, then ask the user for confirmation.
5. After any mutate operation, record a TAEA audit entry with evidence.

## TAEA Audit Requirements

Every Meta Ads action must be transparent, auditable, and explainable.

For read-only queries, report:

- business ID
- ad account ID
- Graph API endpoint and fields
- time range or date preset
- returned row count
- BUC quota summary from `X-Business-Use-Case-Usage` when present
- any skipped fields or API errors

For mutation requests, record:

```json
{
  "service": "meta_ads",
  "api_version": "v25.0",
  "operation": "campaign.update",
  "business_id": "353899295593802",
  "ad_account_id": "act_4371652422934618",
  "confirmation": "explicit user approval text",
  "request_summary": "Pause campaign 123",
  "resource_names": ["act_4371652422934618/campaigns/123"],
  "buc_usage": {"call_count": 12, "total_cputime": 3, "total_time": 4},
  "result": "success_or_error",
  "evidence": "API response summary or error code"
}
```

Do not create or modify campaigns, ad sets, ads, budgets, audiences, catalogs,
pixels, pages, leads, or billing settings without explicit user confirmation in
the current conversation.

## Common Commands

Account summary:

```bash
python .claude/skills/meta-ads/scripts/meta_ads_helper.py account-summary
```

Campaign list:

```bash
python .claude/skills/meta-ads/scripts/meta_ads_helper.py list-campaigns --limit 50
```

Last 7 days campaign insights:

```bash
python .claude/skills/meta-ads/scripts/meta_ads_helper.py insights \
  --date-preset last_7d \
  --level campaign \
  --limit 50
```

## Error Handling

- `OAuthException` code `190`: token is invalid or expired; replace
  `META_ADS_ACCESS_TOKEN`.
- Permission errors: verify the System User is assigned to the Business, App,
  and ad account with campaign management rights.
- Missing ad account: rerun `list-ad-accounts` and confirm
  `META_ADS_AD_ACCOUNT_ID` includes the `act_` prefix.
- Rate limiting or BUC pressure: inspect the `buc_usage` object and reduce query
  frequency or date range.

## Security

- Never echo credentials or include them in GitHub issues, PRs, logs, or final
  answers.
- Never write token values into `.env`, source files, tests, screenshots, or
  examples.
- Redact Authorization headers and access tokens from command output.
