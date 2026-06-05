---
name: aeo-assessment
description: >
  Perform Agent Readiness and Answer Engine Optimization (AEO) assessment aligned
  with Cloudflare's Agent Readiness Index (isitagentready.com). Checks all four
  scoring dimensions: Discoverability, Content, Bot Access Control, and Capabilities.
---

# AEO (Answer Engine Optimization) Assessment

Assess how AI agents and answer engines can discover, consume, and interact with
this space's content. Aligned with **Cloudflare's Agent Readiness Index**
(https://isitagentready.com/) scoring dimensions. This skill follows **Transparent,
Auditable, Explainable AI (TAE-AI)** principles.

## When to Use

- During health checks (when the space has AEO analysis enabled)
- When a user asks about AEO, AI discoverability, agent readiness, or content
  optimization for AI
- After running the `ai-bot-traffic` skill (AEO assessment uses bot traffic data)
- When evaluating a website's score on isitagentready.com

## Prerequisites

Run or reference the `ai-bot-traffic` skill first — AEO assessment builds on the
bot traffic data collected there. If no bot traffic data is available, note this
limitation and focus on the checks that can be performed independently.

## Instructions

### Step 1 — Discoverability Assessment

Check how easily AI agents can find the space's content. For each domain associated
with this space, use `curl` to check:

1. **robots.txt**: Fetch `robots.txt`. Are AI bots explicitly allowed or
   disallowed? Look for `User-agent: GPTBot`, `ClaudeBot`, `PerplexityBot`, etc.
   Flag if AI crawlers are blocked or if the file is missing.
2. **Sitemap**: Check if `sitemap.xml` or `sitemap-index.xml` is accessible and
   returns valid XML (HTTP 200). Verify it is referenced in robots.txt.
3. **llms.txt**: Check if `/llms.txt` exists (HTTP 200). This is the machine-
   readable documentation index for AI agents, following the llmstxt.org spec.
   Verify it contains an H1 title, blockquote summary, and curated resource links.
4. **HTTP Response Analysis**: From bot traffic data, what response codes are bots
   receiving? Flag high rates of `403`/`429` for bots that should be allowed.

### Step 2 — Content Accessibility Assessment

Check whether content can be consumed in agent-friendly formats:

1. **Markdown Content Negotiation**: Test if the site returns `text/markdown`
   content when requesting with `Accept: text/markdown` header:
   ```bash
   curl -sI -H "Accept: text/markdown" <domain> | head -5
   ```
   On static hosts (like GitHub Pages) that cannot do server-side negotiation,
   check if `.md` file mirrors exist alongside HTML pages and are linked from
   `llms.txt`.
2. **JSON-LD / Schema.org**: Do key pages serve structured data markup? Check for
   `<script type="application/ld+json">` blocks. Key types: Organization, WebSite,
   Article, FAQPage, HowTo, BreadcrumbList, SoftwareApplication.
3. **OpenGraph**: Are social/sharing metadata tags present (`og:title`,
   `og:description`, `og:type`)?
4. **Content Freshness**: Are pages returning appropriate cache headers
   (`Last-Modified`, `ETag`) so AI bots can efficiently re-crawl?

### Step 3 — Bot Access Control Assessment

Check how the site manages AI agent permissions:

1. **Content-Signal Directive**: Check robots.txt for the `Content-Signal` line.
   Expected format: `Content-Signal: search=yes, ai-input=yes`. Only ~4% of sites
   have this, but it is part of the Cloudflare Agent Readiness score.
2. **AI Bot Rules**: Verify explicit `User-agent` + `Allow` rules for major AI
   crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, etc.)
   in robots.txt.
3. **Web Bot Auth**: Check if `/.well-known/http-message-signatures-directory`
   exists. This is a JWKS endpoint for cryptographic bot verification (IETF
   WebBotAuth standard). Note: this is an advanced check — many sites skip it.

### Step 4 — Capabilities Discovery Assessment

Check whether the site advertises its capabilities via standard agent protocols:

1. **Agent Web Protocol (AWP)**: Fetch `/agent.json`. Does it return valid JSON
   with `awp_version`, `domain`, `intent`, and `actions[]`? This tells agents
   what the site can do.
2. **MCP Server Card**: Fetch `/.well-known/mcp/server-card.json`. Does it
   describe available MCP tools and capabilities?
3. **Agent Skills**: Fetch `/.well-known/agent-skills/index.json`. Does it
   advertise discoverable agent skills?
4. **API Catalog (RFC 9727)**: Fetch `/.well-known/api-catalog`. Does it return
   a valid linkset document with `service-desc` and `service-doc` links?

For each endpoint, record:
- ✅ Present and valid
- ⚠️ Present but malformed (describe the issue)
- ❌ Missing (404 or error)

### Step 5 — Bot Behavior Pattern Analysis

Using traffic data from the `ai-bot-traffic` skill:

1. **Activity Distribution**: Which AI bots are most active? Rank by request
   volume.
2. **Resource Consumption**: Are any bots consuming disproportionate bandwidth?
3. **Pattern Anomalies**: Unusual patterns (e.g., repeated hits to the same
   endpoint, unusual crawl times)?
4. **Cross-Period Trends**: If historical data is available, compare with the
   previous analysis period.

### Step 6 — Produce Agent Readiness Scorecard & Recommendations

Produce a **scorecard** covering all four Cloudflare Agent Readiness dimensions:

```
## Agent Readiness Scorecard

| Dimension | Check | Status |
|-----------|-------|--------|
| Discoverability | robots.txt | ✅/❌ |
| Discoverability | Sitemap | ✅/❌ |
| Discoverability | llms.txt | ✅/❌ |
| Content | Markdown negotiation | ✅/❌ |
| Content | JSON-LD structured data | ✅/❌ |
| Bot Access Control | Content-Signal | ✅/❌ |
| Bot Access Control | AI bot Allow rules | ✅/❌ |
| Bot Access Control | Web Bot Auth | ✅/❌ |
| Capabilities | agent.json (AWP) | ✅/❌ |
| Capabilities | MCP Server Card | ✅/❌ |
| Capabilities | Agent Skills | ✅/❌ |
| Capabilities | API Catalog | ✅/❌ |
```

Then provide **1-5 specific, actionable recommendations**. Each must include:

- **(a) What to do** — Clear, specific action
- **(b) Why it matters** — Which Agent Readiness dimension it improves
- **(c) Evidence** — The data supporting this recommendation

**Priority examples** (from highest to lowest impact):
- "Create `/llms.txt` with curated documentation links — Discoverability + Content"
- "Add `Content-Signal: search=yes, ai-input=yes` to robots.txt — Bot Access
  Control (only 4% adoption, high signal to Cloudflare)"
- "Create `/agent.json` with AWP v0.2 format — Capabilities dimension"
- "Create `/.well-known/mcp/server-card.json` — Capabilities dimension"
- "Generate `.md` file mirrors and link from llms.txt — Content dimension"

Apply TAE-AI for each recommendation:
- **Transparent**: What was observed
- **Auditable**: Cite the HTTP response, status code, and URL checked
- **Explainable**: Which Agent Readiness dimension it improves and why

If running inside a health check, include the scorecard and recommendations in
`detail_html` under `<h3>AI Bot Traffic & AEO</h3>`.

### Step 7 — Create GitHub Issues (with Deduplication)

For each actionable recommendation, create a GitHub issue in the space's linked
repositories so improvements can be tracked and assigned.

**Deduplication — CRITICAL**: Before creating any issue:

1. Check for existing open issues:
   ```bash
   gh issue list --repo <owner/repo> --label "aeo" --state open \
     --json number,title,body --limit 20
   ```
2. If an existing open issue already covers the same recommendation (same topic,
   same action), **skip creation**. Optionally add a comment with fresh evidence.
3. Only create a new issue for genuinely **new** recommendations not covered by
   existing open issues.

**Issue format:**
```bash
gh issue create --repo <owner/repo> \
  --title "[AEO] <concise recommendation title>" \
  --body "<detailed description: what to do, why it matters, evidence>" \
  --label "aeo"
```

**IMPORTANT**: If the `aeo` label doesn't exist, create it first:
```bash
gh label create "aeo" --repo <owner/repo> \
  --description "Answer Engine Optimization recommendations" --color "0e8a16"
```

**Assign to Copilot** after creating each issue:

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

**IMPORTANT**: Only create issues for genuinely significant, actionable
recommendations. Do NOT create trivial issues. If no significant recommendations
exist, skip issue creation entirely.
