---
name: agent-readiness-generator
description: >
  Auto-generate agent-readiness files (llms.txt, agent.json, .well-known/
  endpoints, Content-Signal) when building websites. Coaches users on content
  structure for AI citation. Targets high scores on Cloudflare's Agent Readiness
  Index (isitagentready.com).
---

# Agent Readiness Generator

Automatically generate agent-readiness files for any website being built or
modified, targeting all four dimensions of the **Cloudflare Agent Readiness
Index** (https://isitagentready.com/):

1. **Discoverability** — robots.txt, sitemap, llms.txt
2. **Content** — markdown mirrors, structured data, answer-first format
3. **Bot Access Control** — Content-Signal, AI bot allowlists
4. **Capabilities** — agent.json, MCP server card, agent skills, API catalog

## When to Use

Activate this skill when ANY of these conditions are met:

- The agent is **creating a new website** (detects `index.html`, static site
  generator config like `astro.config.*`, `next.config.*`, `nuxt.config.*`,
  `vite.config.*`, or `package.json` with `build`/`dev` scripts).
- The agent is **modifying an existing website** (editing HTML/CSS/JS pages,
  updating content, adding new routes).
- The user **asks about agent readiness**, AEO, llms.txt, or AI discoverability.
- The user asks the agent to **improve their website's Cloudflare Agent
  Readiness score**.

## Instructions

### Step 1 — Detect Website Context

Identify the website's technology stack and deployment target:

```
Technology: [Astro/Next.js/Vite/Hugo/plain HTML/etc.]
Deployment: [GitHub Pages/Cloudflare Pages/Vercel/Netlify/self-hosted/etc.]
Domain: [detected from config or ask user]
Existing pages: [list discovered HTML/MD pages]
```

Check which agent-readiness files already exist:
- `/robots.txt` — does it have AI bot rules and Content-Signal?
- `/llms.txt` — does it exist and follow the llmstxt.org spec?
- `/agent.json` — AWP manifest present?
- `/.well-known/mcp/server-card.json` — MCP discovery present?
- `/.well-known/agent-skills/index.json` — skills advertised?
- `/.well-known/api-catalog` — RFC 9727 catalog present?
- `/sitemap.xml` or `/sitemap-index.xml` — sitemap accessible?

### Step 2 — Generate Discoverability Files

#### 2a. robots.txt

If robots.txt is missing or lacks AI bot rules, create or update it:

```
User-agent: *
Allow: /

# AI crawler allowlists
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Anthropic-AI
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

# Content signal for AI agents
Content-Signal: search=yes, ai-input=yes

# Sitemap
Sitemap: https://<domain>/sitemap-index.xml
```

#### 2b. llms.txt

Scan all pages in the website and generate `/llms.txt` following the
[llmstxt.org](https://llmstxt.org/) specification:

```markdown
# <Site Name>

> <2-3 sentence description of what the site/product does and who it serves.>

## <Section Name>

- [Page Title](https://domain/path/): One-sentence description of the page
- [Page Title](https://domain/path/): One-sentence description of the page

## <Another Section>

- [Page Title](https://domain/path/): One-sentence description
```

Rules for llms.txt:
- **H1**: Site/product name
- **Blockquote**: Concise summary (2-3 sentences)
- **Sections**: Group pages logically (Documentation, Blog, API, etc.)
- **Links**: Each with a one-sentence description
- **Limit**: 5-15 most important pages (not every page)
- **URLs**: Must be absolute (https://...)

#### 2c. Sitemap

If no sitemap exists, generate a basic `sitemap.xml` or `sitemap-index.xml`
listing all public pages with `<lastmod>`, `<changefreq>`, and `<priority>`.

### Step 3 — Generate Capabilities Files

#### 3a. agent.json (Agent Web Protocol)

Create `/agent.json` following AWP v0.2:

```json
{
  "awp_version": "0.2",
  "domain": "<domain>",
  "intent": "<1-2 sentence description of what the site does>",
  "capabilities": {
    "streaming": false,
    "batch_actions": false,
    "webhooks": false
  },
  "actions": [
    {
      "id": "browse-docs",
      "description": "Browse documentation index",
      "auth_required": false,
      "endpoint": "/llms.txt",
      "method": "GET"
    }
  ],
  "agent_hints": {
    "primary_use_case": "<main purpose of the site>",
    "content_types": "<what kind of content is available>",
    "update_frequency": "<how often content is updated>"
  }
}
```

Add additional actions if the site has APIs, forms, or interactive features.

#### 3b. MCP Server Card

Create `/.well-known/mcp/server-card.json`:

```json
{
  "$schema": "https://modelcontextprotocol.io/schemas/server-card/v1",
  "version": "1.0",
  "protocolVersion": "2025-03-26",
  "serverInfo": {
    "name": "<site-name>",
    "version": "1.0.0"
  },
  "title": "<Site Name>",
  "description": "<What the site offers to AI agents>",
  "iconUrl": "https://<domain>/favicon.png",
  "documentationUrl": "https://<domain>/llms.txt",
  "capabilities": {
    "tools": false,
    "resources": true,
    "prompts": false
  }
}
```

Set `tools: true` if the site exposes APIs or interactive capabilities.

#### 3c. Agent Skills Index

Create `/.well-known/agent-skills/index.json`:

```json
{
  "version": "1.0",
  "skills": [
    {
      "name": "<skill-name>",
      "description": "<What this skill does>",
      "capabilities": ["<capability-1>", "<capability-2>"],
      "url": "https://<domain>/"
    }
  ]
}
```

List each major site capability as a separate skill entry.

#### 3d. API Catalog (RFC 9727)

Create `/.well-known/api-catalog` as a linkset+json document:

```json
{
  "linkset": [
    {
      "anchor": "https://<domain>/",
      "service-desc": [
        {
          "href": "https://<domain>/agent.json",
          "type": "application/json",
          "title": "Agent Web Protocol manifest"
        }
      ],
      "service-doc": [
        {
          "href": "https://<domain>/llms.txt",
          "type": "text/markdown",
          "title": "Documentation index for LLMs"
        }
      ]
    }
  ]
}
```

### Step 4 — Content Structure Coaching

After generating the technical files, **advise the user** on content patterns
that increase AI citation likelihood:

> **Recommendations for better AI citation:**
>
> 1. **Answer-first format**: Start each page/section with a direct 40-60 word
>    answer to the question the page addresses, before diving into details.
>
> 2. **FAQ sections**: Add a FAQ with 3-5 questions at the bottom of key pages.
>    Use `<details>` elements for expandable Q&A. Add `FAQPage` JSON-LD schema.
>
> 3. **Question-based headings**: Use H2/H3 as questions (e.g., "What is
>    sovereign AI?" instead of "Sovereign AI"). This matches how users query AI.
>
> 4. **Consistent entity naming**: Always use the same name for your product
>    (e.g., always "Omni AI", never "the Omni platform" or "our product").
>
> 5. **Statistics with citations**: Include a data point every 150-200 words
>    with its source. AI engines prefer content backed by verifiable evidence.
>
> 6. **Structured data**: Add JSON-LD for key schema types:
>    - `Organization` (site-wide, in layout/header)
>    - `Article` or `BlogPosting` (blog posts)
>    - `FAQPage` (pages with Q&A)
>    - `HowTo` (tutorial/guide pages)
>    - `SoftwareApplication` (product pages)
>    - `BreadcrumbList` (navigation)
>
> 7. **Content freshness**: AI citations decay after ~13 weeks. Plan quarterly
>    content refreshes for key pages.

Present these as a checklist the user can work through.

### Step 5 — Validation Summary

After generating all files, produce a summary:

```
## Agent Readiness Files Generated

| File | Status | Purpose |
|------|--------|---------|
| /robots.txt | ✅ Created/Updated | AI bot allowlists + Content-Signal |
| /llms.txt | ✅ Created | Documentation index for AI agents |
| /agent.json | ✅ Created | Agent Web Protocol manifest |
| /sitemap-index.xml | ✅ Created | XML sitemap for crawlers |
| /.well-known/mcp/server-card.json | ✅ Created | MCP server discovery |
| /.well-known/agent-skills/index.json | ✅ Created | Agent skills index |
| /.well-known/api-catalog | ✅ Created | RFC 9727 API catalog |

**Cloudflare Agent Readiness dimensions covered:**
- ✅ Discoverability (robots.txt + sitemap + llms.txt)
- ✅ Content (llms.txt + structured data coaching)
- ✅ Bot Access Control (Content-Signal + AI bot rules)
- ✅ Capabilities (agent.json + MCP + skills + API catalog)

**Next steps for the user:**
- [ ] Review and customize the generated files
- [ ] Apply content coaching recommendations to key pages
- [ ] Test score at https://isitagentready.com/
```

### Important Notes

- **Static hosting constraints**: GitHub Pages cannot do server-side content
  negotiation. Generate `.md` file mirrors and link them from `llms.txt` instead.
- **Do NOT overwrite**: If a file already exists and contains meaningful custom
  content, merge or suggest changes rather than overwriting blindly.
- **Minimal intervention**: Generate only what is missing. If robots.txt already
  has Content-Signal, do not regenerate it.
- **Ask before modifying**: If unsure about the site's purpose or branding,
  ask the user before generating agent.json intent or llms.txt descriptions.
