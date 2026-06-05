---
name: ai-bot-traffic
description: Detect and report third-party AI bot/crawler traffic from cloud access logs using TAE-AI principles.
---

# AI Bot Traffic Detection

Analyze access logs to detect third-party AI bot/crawler traffic for this space.
This skill follows **Transparent, Auditable, Explainable AI (TAE-AI)** principles —
every finding must cite its evidence source, every conclusion must be independently
verifiable.

## When to Use

- During health checks (when the space has AI bot traffic detection enabled)
- When a user asks about AI bot traffic, crawler activity, or bot detection
- When investigating unusual traffic patterns

## Instructions

### Step 1 — Identify Available Log Sources

Check which credentials are available and determine queryable log sources:

- **GCP credentials** → `gcloud logging read` with `httpRequest.userAgent` filters.
  Check resource types: `http_load_balancer`, `gae_app`, `cloud_run_revision`,
  `gce_instance`, `firebase_domain`. Use `--freshness=4h --format=json --limit=500`
  (or `--freshness=24h` for deep/on-demand analysis).
- **AWS credentials** → `aws logs filter-log-events` on relevant log groups filtering
  for bot user-agent patterns.
- **Cloudflare credentials** → Cloudflare Analytics API to query bot traffic per zone.
  List zones: `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/zones`, then query analytics or firewall
  events filtered by known bot user-agents.
- **No credentials for a source** → Skip it. Note which sources were skipped and why.
- **GitHub Pages** → No access logs available. Note this limitation.

### Step 2 — Detect AI Bot Traffic

Search for requests from known AI agents by checking user-agent strings
(case-insensitive):

| Provider | User-Agent Patterns |
|----------|-------------------|
| OpenAI | `GPTBot`, `ChatGPT-User`, `OAI-SearchBot` |
| Anthropic | `ClaudeBot`, `anthropic-ai` |
| Perplexity | `PerplexityBot` |
| ByteDance | `Bytespider` |
| Common Crawl | `CCBot` |
| Google Gemini | `Google-Extended` |
| Amazon | `Amazonbot` |
| Meta | `FacebookBot`, `Meta-ExternalAgent` |
| Apple | `Applebot-Extended` |
| Cohere | `cohere-ai` |
| Diffbot | `Diffbot` |
| Huawei | `PetalBot` |
| You.com | `YouBot` |

Count requests per bot, identify the top 5 endpoints per bot (sorted by request
count descending). If multiple sources are available, combine the data and note
which source each data point came from (**Auditable**).

### Step 3 — Report Findings

Produce a structured report with:

- **Bot Traffic Summary**: Table with bot name, request count, top endpoints, HTTP
  response codes.
- **Transparent**: State exactly what was observed (which bot, which endpoint, how
  many requests, what response code).
- **Auditable**: Cite the log source, time range, and query used so the finding can
  be independently verified.
- **Explainable**: Explain *why* each observation matters.

If running inside a health check, include findings in the `detail_html` under
`<h3>AI Bot Traffic & AEO</h3>`.

### Step 4 — Create GitHub Issues (with Deduplication)

When significant bot traffic findings warrant action (e.g., bots consuming excessive
resources, bots being blocked that should be allowed, or unusual patterns), create
GitHub issues for the space's linked repositories.

**Deduplication — CRITICAL**: Before creating any issue:

1. Check for existing open issues:
   ```bash
   gh issue list --repo <owner/repo> --label "ai-bot-traffic" --state open \
     --json number,title,body --limit 20
   ```
2. If an existing open issue already covers the same finding (same bot, same
   pattern), **skip creation** and optionally add a comment with updated data.
3. Only create a new issue for genuinely **new** findings not covered by existing
   open issues.

**Issue format:**
```bash
gh issue create --repo <owner/repo> \
  --title "[AI Bot Traffic] <concise summary of finding>" \
  --body "<detailed description with evidence, impact, and recommended action>" \
  --label "ai-bot-traffic"
```

**IMPORTANT**: If the `ai-bot-traffic` label doesn't exist, create it first:
```bash
gh label create "ai-bot-traffic" --repo <owner/repo> \
  --description "AI bot traffic findings from health monitor" --color "1d76db"
```

**Assign to Copilot** after creating each issue (same GraphQL pattern as code review):

```bash
# Get Copilot bot node ID (once per repo)
BOT_ID=$(gh api graphql \
  -H "GraphQL-Features: issues_copilot_assignment_api_support" \
  -f query='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){suggestedActors(capabilities:[CAN_BE_ASSIGNED],first:10){nodes{login ...on Bot{id}}}}}' \
  -f owner="$REPO_OWNER" -f repo="$REPO_NAME" \
  --jq '.data.repository.suggestedActors.nodes[] | select(.login | startswith("copilot")) | .id')

# Assign issue
ISSUE_NODE_ID=$(gh api graphql \
  -f query='query($owner:String!,$repo:String!,$num:Int!){repository(owner:$owner,name:$repo){issue(number:$num){id}}}' \
  -f owner="$REPO_OWNER" -f repo="$REPO_NAME" -F num=<ISSUE_NUMBER> \
  --jq '.data.repository.issue.id')

gh api graphql \
  -H "GraphQL-Features: issues_copilot_assignment_api_support" \
  -f query='mutation($assignable:ID!,$actor:ID!){replaceActorsForAssignable(input:{assignableId:$assignable,actorIds:[$actor]}){assignable{...on Issue{assignees(first:5){nodes{login}}}}}}' \
  -f assignable="$ISSUE_NODE_ID" -f actor="$BOT_ID"
```

**IMPORTANT**: If Copilot is not enabled for the repository, skip assignment
silently. Do NOT fail the analysis.
