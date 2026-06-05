# Omni App Quick Reference

> Condensed reference for all Omni features. For full details, read the
> individual documentation files from `docs/user-guide/` in the repo.

## Product Summary

Omni is an **enterprise AI development assistant** built on **TAEA** principles:
**Transparent** (tool calls and execution streamed live), **Auditable** (changes
tied to conversations, users, branches, PRs, timestamps), and **Explainable**
(AI cites files, logs, and command output as evidence). Teams use AI conversations
to manage cloud services, develop code, and monitor product health. Once cloud
credentials (GCP, AWS, GitHub, etc.) are set up, the AI can access your
services like a senior engineer familiar with your environment.

---

## Feature Quick Reference

### Space (spaces.md)

A shared workspace for a team or project. Contains conversations, repos,
credentials, skills, and automation settings.

- **Create**: Corporate Admin creates in Settings > Corporate
- **Members**: Admin invites by email; default role is Developer
- **Shared Memory**: 5 categories (environment, architecture, convention,
  discovery, domain) — persists across conversations
- **Archive/Delete**: Archive hides from list; delete is permanent

### Ads MCP (ads-mcp.md)

Audited Google Ads / Meta Ads MCP tools. Reads use Space-linked
Environment Variable credentials; those env vars may come from Space
credentials or Corporate credentials linked into the Space. Writes require
`corporations.ads_mutations_enabled=true`, a non-empty Z Decision /
confirmation reference, and are unavailable in viewer or plan mode. Approval
status is verified operationally in Z before calling the tool; the tool records
the reference but does not independently verify Z state.

### Conversation (conversations.md)

Real-time AI chat sessions within a Space.

- **Message types**: User, Assistant, System, Tool Result, Error
- **File attachments**: Click + to attach any file (PDF, images, spreadsheets, etc.)
- **Web search**: AI can search the web for up-to-date information when needed
- **Canvas panel**: 6 tabs — Logs, Files, Code, Preview, Changes, Canvas.
  Canvas auto-extracts tables, Mermaid diagrams, and HTML artifacts from chat;
  click "Show in Canvas" on any extractable item to view it full-screen.
- **AI Models**: Sonnet (daily), Opus (complex), Codex (high-throughput), Gemini
- **Multi-user**: Multiple users can send messages in the same conversation
- **Comments panel**: Asynchronous team discussion via speech-bubble icon near chat input
- **Loop**: `/loop 5 run tests and fix` — repeat AI tasks N times; also supports
  `/loop every 30m: prompt` for timed intervals and
  `/loop every 30m wait: prompt` to wait one interval before the first run;
  max 3 per conversation, 72h expiry
- **Schedule**: `/schedule "0 9 * * 1-5": prompt` — create cron-based
  scheduled conversation tasks. Supports `tz=<timezone>`, `max <N>`/`x<N>`,
  `model=<name>`, `once`, `/schedule list`, and `/schedule stop [id]`.
  Limits: 5 schedules per conversation, 20 per Space, recurring schedules
  auto-expire after 7 days, one-time schedules auto-complete after execution.
- **Long-Loop**: `/long-loop every 2h: prompt` — same as /loop but with a 30-day
  hard cap instead of 72h, max interval 7 days. Requires Pro plan.
- **Tags**: 8 built-in (heartbeat, nrem, admin-ai, daily-insight, cron-job, loop, monitor, schedule)
- **Plan Mode**: AI proposes plan before making changes; user approves

### Monitor (docs/features/monitor.md)

**Event-driven background monitoring** — run shell commands in the background
and get real-time alerts when issues are detected.

- **Command**: `/monitor <command>: <description>` — start a background monitor
- **Timeout**: `/monitor timeout 5m <command>: <description>` — auto-stop after duration
- **Stop**: `/monitor stop` (all) or `/monitor stop <id>` (specific)
- **List**: `/monitor list` — show active monitors
- **Event-driven**: Only stdout triggers events (200ms batching, zero cost when silent)
- **Severity classification**: Two-phase — (1) prefix-based (`WARNING:` / `CRITICAL:` on
  first line, lets scripts control severity) then (2) keyword fallback pattern matching
- **AI auto-reaction**: warning/critical events automatically trigger AI analysis
  via ClaudeCodeAdapter (5-min cooldown per monitor, 300s timeout)
- **info events**: Record-only — no AI triggered, zero token cost
- **Limits**: Max 3 per conversation, 10 per space, 24h default / persistent never expires
- **Restart recovery**: Monitors auto-recover on server restart (same as Loop/Schedule)
- **Rate limit**: >100 events/min → auto-stop

**Monitor vs Loop vs Heartbeat**:
- Monitor = event-driven background process (zero cost when silent)
- Loop = scheduled repeated AI tasks (`/loop every 1h`)
- Heartbeat = system-level health monitoring (Pulse every 4h, Rhythm every 24h)

### Workspace Memory (.omni/memory.md)

Per-conversation persistent context file that the AI reads at the start of
every turn and updates as it learns about the workspace.

- **Location**: `.omni/memory.md` in the conversation workspace root
  (previously named `.omni/WORKSPACE.md` — same file, auto-migrated)
- **Auto-maintained sections**:
  - `## Repositories` — system-managed, lists linked repos and branches
  - `## Environment & Tools` — AI records runtime versions, package managers,
    build tools, key config files, database/service dependencies
  - `## Key Discoveries` — AI records architecture patterns, conventions,
    database findings, cloud configs, cross-repo relationships
- **Lifecycle**: Created automatically when a conversation starts. The AI
  reads it before every task and writes new findings back after each task.
  The `## Repositories` section is refreshed by the system on each turn.
- **Scope**: Per-conversation only — not shared across conversations.
  For cross-conversation knowledge, use **Shared Memory** instead.
- **User interaction**: Users can read the file to understand what the AI
  knows. Users can also ask the AI to update or correct entries. Do NOT
  modify the `## Repositories` section manually.

### Shared Space Memory

Cross-conversation knowledge store visible to all conversations in a Space.

- **5 categories**: `environment`, `architecture`, `convention`, `discovery`,
  `domain` — each entry must belong to exactly one category
- **Limits**: Max 50 entries per space, max 500 characters per entry
- **Deduplication**: Entries with the same first 80 characters in the same
  category are auto-merged (update instead of insert)
- **CRUD operations**:
  - **Write**: AI calls `mcp__memory__workspace_memory_write` when it discovers
    Space-level facts that benefit other conversations
  - **List**: `mcp__memory__workspace_memory_list` — view all entries with IDs
  - **Delete**: `mcp__memory__workspace_memory_delete` — remove by ID (AI
    confirms with user before deleting, per TAE-AI)
- **Scope**: Shared across ALL conversations in the Space. Survives
  conversation deletion. Managed by AI, Heartbeat/NREM, or users.
- **vs Workspace Memory**: `.omni/memory.md` is per-conversation context;
  Shared Memory is Space-wide knowledge visible everywhere.

### Cloud Credentials (credentials.md)

Connect cloud services so the AI can operate on your behalf.

- **7 providers**: GCP, AWS, GitHub, Firebase, Supabase, Web3 (Metamask), API Key
- **Corporate vs Space**: Corporate credentials shared across all spaces;
  Space credentials are isolated
- **Security**: AES-128-CBC encryption, RLS access control, never shown in AI responses
- **Environment variables**: AI accesses via env vars — auto-injected per provider:
  - GitHub: `$GITHUB_TOKEN`, `$GH_TOKEN`
  - GCP: `$GOOGLE_APPLICATION_CREDENTIALS`, `$CLOUDSDK_CONFIG`, `$GCLOUD_PROJECT`
  - AWS: `$AWS_ACCESS_KEY_ID`, `$AWS_SECRET_ACCESS_KEY`, `$AWS_DEFAULT_REGION`
  - Firebase: `$FIREBASE_SERVICE_ACCOUNT`, `$FIREBASE_PROJECT`
  - Web3: `$WEB3_PRIVATE_KEY`, `$PRIVATE_KEY`, `$WEB3_RPC_URL`, `$ETH_RPC_URL`
  - Supabase: `$SUPABASE_ACCESS_TOKEN`, `$SUPABASE_PROJECT_REF`
  - API Key: Custom env var name or auto-derived `SERVICE_NAME_API_KEY`
- **Verification**: Use `[ -n "$VAR_NAME" ] && echo "configured"` to check availability;
  never echo secret values directly

### GitHub Repositories (repositories.md)

Link GitHub repos so the AI can read/write code.

- **Clone states**: waiting → cloning → ready (or failed)
- **PR creation**: Via Canvas Changes tab, conversation toolbar, or AI suggestion
- **Auto-commit**: System auto-commits with conventional commit messages
- **Multi-repo**: Multiple repos can be linked to one Space. Each repo is
  cloned into its own subdirectory. The AI must `cd` into the correct repo
  directory before running git commands. `.omni/memory.md` tracks which repos
  are linked and their current branches.
- **Base branch**: Configurable per conversation (default: main)
- **CI/CD**: PRs trigger normal CI checks; mention `@claude` in PR comments
  for AI-powered code review via Claude Code Action

### Heartbeat (heartbeat.md)

AI-powered **automated health monitoring** for your product and infrastructure.

- **Pulse**: Quick scan every 4h using Sonnet
- **Rhythm**: Deep analysis every 24h using Opus
- **Health indicators**: Green (healthy), Yellow (warning), Red (error), Resolved
- **Dashboard**: Trend chart, AI insights, check history
- **Role split**: Regular handles routine monitoring, Deep performs longer
  analysis and issue/PR workflows, and NREM directly maintains monitoring config
- **Setup**: Settings > Space > Heartbeat toggle (Admin only)

### NREM (nrem.md)

AI **memory consolidation** — like slow-wave sleep for your workspace.

- **Purpose**: AI reviews conversations and heartbeat results to directly maintain
  shared memory, skills, prompt sections, and monitor scripts
- **Proposals**: config-only — memory CRUD, skill install/create, prompt section,
  monitor script
- **Auto-apply**: Enable to skip manual approval
- **Self-evolving config**: retained under NREM via `nrem_auto_apply`;
  Heartbeat itself no longer auto-mutates config
- **3 levels**: Space NREM, Corporate NREM, System NREM
- **Privacy**: Each level only sees data within its own scope

**Heartbeat vs NREM**:
- Heartbeat = monitors your product's health, opens issues, and can modify
  software logic through PR handling
- NREM = maintains the AI's non-code config based on deep/regular results

### Agent Skills (agent-skills.md)

Teach the AI new capabilities through structured instruction files.

- **Creation**: Tell AI "create a skill for deploying to GCP" — skill-creator
  generates SKILL.md
- **Two tiers**: Space skills (shared) and Conversation skills (local)
- **Triggering**: AI auto-detects when a skill is relevant
- **Structure**: SKILL.md + optional scripts/references/assets (max 500KB)
- **System harness skills**: `harness-plan`, `harness-execution`, and
  `harness-dev` are always installed for every Space and every model family.
  Use `harness-dev` for phase-based software development with separated code
  review and agent-browser QA. `harness-dev` should show role/model assignment
  clearly in responses and artifacts: Developer uses `claude-sonnet-4-6`,
  Reviewer uses `claude-opus-4-6`, and QA Tester uses `gpt-5.5`. Review and QA
  run as one-shot sub-loops (`max_iterations=1`) so Ops canvas / Loops Overview
  and Corporate Admin Dashboard display separate model badges and run history.
  If the user asks for manual loop commands, include explicit model arguments:
  `/loop every 1m x1 model=claude-opus-4-6: [harness-dev Reviewer] ...` and
  `/loop every 1m x1 model=gpt-5.5: [harness-dev QA] ...`. Never omit
  `model=gpt-5.5` for QA; if unavailable, open a Z App agent ticket instead of
  silently falling back to Sonnet.

**Skills vs Shared Memory**:
- Skills = structured procedures (how to do something)
- Memory = facts and preferences (what to remember)

#### How the AI actually installs / promotes a skill

The AI persists skills by editing the filesystem at
`.claude/skills/` and the sibling `.manifest.json`.  The backend's
reverse-sync step (runs automatically at the end of every AI turn) reads
that state and writes it to Supabase:

1. **Create the skill folder** under `.claude/skills/<skill-name>/` with
   a `SKILL.md` (and any scripts/references).  Keep the name lowercase,
   alphanumeric, hyphen-separated.
2. **Decide the scope** by editing `.claude/skills/.manifest.json`:
   - **Conversation-level** (default): leave the name out of `"space"`.
     Reverse-sync upserts it into `conversation_agent_skills`.
   - **Space-level**: add the name to the `"space"` array, e.g.
     `{"space": ["deploy-to-gcp"], ...}`.  Reverse-sync will call
     `upsert_space_skill` and (if a conversation copy with the same
     name exists) deactivate it.  The caller's JWT must have
     space-admin or developer role on the target space — RLS on
     `space_agent_skills` enforces this.
3. **To promote later**, just re-add the name to `"space"` in the
   manifest (or have the frontend call `POST /api/skills/space/promote`).

Do **not** tell the user "go to Settings UI to install the skill" — the
Settings list is read-only by design.  If the promotion fails because
the caller lacks admin/developer role, surface that specific reason.

### Agent Subagents (subagent-delegation.md)

Allow the AI to **delegate complex tasks** to specialized sub-agents.

- **Three tiers**: System (built-in), Space (shared), Conversation (local)
- **System builtins**: 5 pre-installed subagents (general-purpose, code-searcher,
  test-runner, data-collector, subagent-creator)
- **Custom subagents**: AI or users can create `.md` files in `.omni/agents/`
  with YAML frontmatter defining name, model, and tools
- **Forward sync**: DB → filesystem on conversation start (atomic mirror)
- **Reverse sync**: Filesystem → DB on conversation end (captures AI-created agents)
- **Admin control**: Settings > Space > Agent Subagents toggle (default: on)
- **TAEA**: System and space subagents visible in Settings panel with scope badges

**Skills vs Subagents**:
- Skills = instructions the AI follows (how to do something)
- Subagents = autonomous agents the AI delegates tasks to (who does something)

### Health Check (health-check.md)

**Quick-start guide** for enabling Heartbeat monitoring in 3 steps:
1. Set up cloud credentials
2. Enable Heartbeat in Settings
3. Trigger first check

> Health Check is NOT a separate feature — it IS the Heartbeat system.

### AEO / AI Bot Traffic (aeo.md)

Analyze how **AI search engines crawl your website** and optimize visibility.
Aligned with **Cloudflare Agent Readiness Index** (isitagentready.com).

**3 system skills:**

- **ai-bot-traffic skill**: Detects 12+ AI crawlers (GPTBot, ClaudeBot,
  PerplexityBot, etc.) from GCP/AWS/Cloudflare access logs
- **aeo-assessment skill**: 7-step assessment aligned with Cloudflare's 4
  scoring dimensions (Discoverability, Content, Bot Access Control, Capabilities).
  Produces a 12-check Agent Readiness Scorecard + actionable recommendations.
- **agent-readiness-generator skill** (always-on, no toggle needed): When
  building websites, auto-generates agent-readiness files (llms.txt, agent.json,
  robots.txt with Content-Signal, .well-known/ endpoints) and coaches content
  structure for AI citation (answer-first format, FAQ, JSON-LD, etc.)

**Setup:**
- ai-bot-traffic + aeo-assessment: Settings > Space > AI Bot Traffic & AEO
  toggle (Admin only). Requires at least one cloud credential for log access.
  Runs within Heartbeat checks.
- agent-readiness-generator: Always available — no toggle needed. Activates
  automatically when the AI detects it is building or modifying a website.
- **TAE-AI**: All findings cite evidence, independently verifiable

### MS Office Document Creation

Create, read, and edit **Microsoft Office files** via built-in `ms-office-suite` skill.

- **PowerPoint** (.pptx): Slide decks with layouts, charts, images (python-pptx)
- **Word** (.docx): Reports, proposals, memos with tables, headers/footers (python-docx)
- **Excel** (.xlsx): Spreadsheets with formulas, charts, conditional formatting (openpyxl)
- **Download**: Generated files appear in the FILES tab; click to preview, then download

### Google Workspace Integration

When corporate has GWS credentials configured (Domain-Wide Delegation),
Omni provides **45+ MCP tools** across 6 services:

- **Gmail**: Search, read, compose, draft, manage labels (send requires confirmation)
- **Calendar**: List, create, update, delete events; RSVP
- **Drive**: Browse, search, upload, download, share files/folders
- **Docs**: Create, read, insert/append/replace text
- **Sheets**: Create, read/write ranges, append rows, manage tabs
- **Tasks**: List, create, update, complete, delete tasks

High-risk operations (send email, share file, permanent delete) require user
confirmation. Setup: Corporate Admin configures GWS credential with service
account JSON and delegated domain.

### LINE Bot Integration (line-bot.md)

Connect a **LINE Official Account** to a Space so AI agents can communicate
with external LINE groups.

**Architecture**: Per-space integration — each Space can link one LINE channel.
Modeled after the Z App integration pattern (dual-gate: config check → MCP
register + skill install).

**Setup (Space Admin only)**:
1. Settings > Space > LINE Bot section > Click "Connect"
2. Enter LINE channel credentials:
   - **Channel ID**: From LINE Developers Console > Messaging API > Basic settings
   - **Channel Secret**: Same location (used for webhook signature verification)
   - **Channel Access Token**: Messaging API > Issue (long-lived token for Push API)
3. Click "Set Up" — Omni verifies credentials against LINE API
4. Copy the **Webhook URL** displayed and paste it into LINE Developers Console >
   Messaging API > Webhook settings > Webhook URL. Enable "Use webhook".

**Group Mapping**: After setup, link LINE groups to Omni conversations:
- Add the LINE Bot to a LINE group
- In `conversation_settings.webhook_metadata`, set `line_group_id` (the group's
  LINE ID, starts with `C`) and optionally `line_partner_id`
- When a message arrives in that LINE group, Omni routes it to the mapped
  conversation and triggers the AI agent

**Agent Capabilities**:
- **Passive reply**: Incoming LINE messages appear as `[LINE 訊息] sender: content`.
  The agent's reply is automatically forwarded back to the LINE group — no tool
  call needed.
- **Active notification**: Use `line_send_message` MCP tool to proactively send
  messages to any mapped LINE group (e.g., task completion reports, reminders).
- **Group discovery**: Use `line_list_groups` MCP tool to list all linked groups
  with names and member counts.

**MCP Tools** (available when LINE integration is enabled):
- `line_send_message(to, text)` — Push a text message to a LINE group/user
- `line_list_groups()` — List LINE groups linked to this Space

**System Skill**: `line-messaging` — automatically installed when LINE is enabled.
Teaches the agent passive reply patterns, active notification guidelines, and
message formatting rules (Traditional Chinese, under 500 chars, no emoji, no
internal system names).

**Teardown**: Settings > Space > LINE Bot > Disconnect. Removes credentials
and disables the integration. LINE group mappings in conversation settings
are preserved but inactive.

### Space Library & RAG

Upload documents as a **knowledge base** for the Space. The AI searches
uploaded documents using semantic (vector) search and answers with citations.

- **Supported formats**: PDF, DOCX, XLSX, PPTX, TXT, CSV, MD
- **File size limit**: 50 MB per document
- **Upload**: Settings > Space > Library panel; drag-and-drop or click to upload
- **Processing pipeline**: Upload → Parse text → Chunk → Generate embeddings → Ready.
  Status transitions: `uploading` → `processing` → `ready` (or `failed`)
- **Semantic search**: When a user asks a question, the AI searches document
  chunks by cosine similarity. Only chunks above a relevance threshold are
  returned. Low-relevance results are silently filtered out.
- **Citations**: Relevant chunks are numbered 【1】【2】【3】 etc. The AI cites
  these markers in its response. Users can click a citation to see the source
  document title, page number, and excerpt.
- **Library Only mode**: Toggle on (per-conversation or Space default) to
  restrict the AI to answer **only** from uploaded documents. If no relevant
  content is found, the AI must say so — it will NOT fall back to its own
  training data.
- **Delete / retry**: Click the trash icon next to a document to remove it.
  If a document shows "Failed", delete it and re-upload.
- **Setup**: Settings > Space > Library; toggle Library feature on, then
  upload files via the Library panel

### Web Preview & Live Preview

For web development projects, the Canvas **PREVIEW tab** shows live output.

- **3 modes**: Dev server (auto-detected), Public preview URL, Static file serving
- **Public URL**: Shareable via `omnitunnel.numbersprotocol.io/p/{token}/`
- **Auto-build**: Omni detects project type and runs install → build → dev server
- **Supported frameworks**: Vite, Next.js, Create React App, plain HTML, and more

### Monitor (monitor.md)

**Real-time shell command monitoring** within a conversation.

- **Start**: `/monitor <shell-command>` — e.g., `/monitor tail -f /var/log/app.log`
- **Events**: Streamed with 200ms batching, auto-classified as info/warning/critical
- **Limits**: 3 per conversation, 10 per Space, 24h default (persistent = no expiry), 100 events/min
- **Restart recovery**: Auto-recovered on server restart — subprocesses re-started from DB
- **UI**: MonitorIndicator banner shows severity; admin panels for corporate/system
- **Heartbeat bridge**: Heartbeat can auto-create monitors for real-time detection

### Admin AI Assistant

Dedicated AI assistants at each admin level for data analysis and operations.

- **Space Admin AI**: Embedded in Space Dashboard; answers health/usage questions
- **Corporate Admin AI**: Full layout with Insights panel, Chat, Canvas; renders
  charts, manages Cron Jobs, generates daily insights
- **System Admin AI**: Platform-wide analysis across all corporates (read-only focus)

### Cron Jobs (Scheduled AI Tasks)

Corporate Admin AI can create and manage **scheduled tasks** that run automatically.

- **Fields**: name, schedule (5-field cron), timezone (IANA), model, prompt
- **Management**: Create conversationally via Admin AI or through the Cron Jobs tab
- **System schedule**: Daily Insights runs automatically at midnight (Taiwan time)

### Dashboards

Three levels of admin dashboards:

- **Space Dashboard**: Summary cards (7d activity), Heartbeat vitality trend, member list
- **Corporate Dashboard**: 5 tabs — Dashboard (Red Alerts, AI Usage chart), Admin AI,
  Cron Jobs, Loops, Monitors. Includes stop-all controls.
- **System Dashboard**: 5 tabs — Admin AI, AI Prompts, Task Timeline (30s auto-refresh),
  Loops (EMERGENCY STOP ALL), Monitors (EMERGENCY STOP ALL)

### Browser Automation (browser-automation.md)

**Headless Playwright browser** for web interaction and screenshots.

- Login to websites, fill forms, click buttons, take screenshots
- Used for UI testing, data collection, and visual verification
- Available via MCP browser tools or Playwright scripts

### External Conversation API (external-api.md)

Let **external systems** call Omni AI programmatically.

- **Setup**: Enable External Messaging > Generate API Key (`omni_xxxx`)
- **Endpoints**:
  - `POST /api/external/conversations` — create conversation
  - `POST /api/external/conversations/{id}/run` — send message & trigger AI
  - `GET /api/external/tasks/{id}` — poll for result (supports long-polling)
  - `GET /api/external/conversations/{id}/messages` — get messages
- **Models**: External/headless API currently allows Sonnet plus legacy Haiku;
  interactive member UI tiers expose Sonnet and Opus
- **Webhook**: Optional HTTPS callback when AI completes
- **Multi-turn**: Same conversation_id preserves context across calls
- **Rate limits**: 60 req/min, 10 runs/min, max 5 concurrent tasks globally
- **Security**: API key SHA-256 hashed; credentials never in API responses

### Roles & Permissions (roles-permissions.md)

Two-axis permission model:

**Roles (what you can do)**:
- **Space Admin**: Full control — members, settings, Heartbeat, credentials
- **Developer**: Create conversations, send messages, deploy, manage own resources
- **Viewer**: Read-only — can view but cannot send messages or modify anything
- **Corporate Admin**: Auto-admin in all spaces under the corporate
- **Global Admin**: System-wide super admin

**AI Levels (which models)**:
- **Basic**: Sonnet only, read-only memory
- **Advanced**: Sonnet + Opus, read/write memory
- **Pro**: All models, full access (Corporate Admin always Pro)

### Corporate Admin (corporate-admin.md)

Enterprise-level management across multiple Spaces.

- **Dashboard** (`/:slug/admin`): Summary cards, health overview, red alerts,
  AI usage analytics
- **AI Usage Analytics**: By model or category, 5 time ranges, cost/token metrics
- **Member management**: Add by email, set role (Admin/Member), set AI level
- **Corporate credentials**: Shared across all Spaces in the corporate
- **Corporate NREM**: Enterprise-level memory consolidation
- **Auto-join**: Users with matching email domain auto-join as Member (Basic)

---

## Common Questions Quick Answers

**Q: How do I enable Heartbeat?**
Settings > select Space > Heartbeat section > toggle on Pulse and/or Rhythm.
Requires Admin role and at least one cloud credential.

**Q: What's the difference between Heartbeat and NREM?**
Heartbeat monitors your product (code, cloud, CI/CD). NREM improves the AI
itself (memories, skills, prompts).

**Q: How do I create an Agent Skill?**
In a conversation, tell the AI: "Create a skill for [your task]". The
skill-creator will generate a SKILL.md automatically.

**Q: Why can't I see certain AI models?**
Your AI capability level (Basic/Advanced/Pro) determines available models.
Contact your Corporate Admin to upgrade.

**Q: How do I connect my GitHub repo?**
Settings > select Space > Repositories > search and select your repo.

**Q: What is AEO?**
Answer Engine Optimization — analyzes AI search engine crawlers visiting your
site and recommends optimizations for AI discoverability. Aligned with
Cloudflare's Agent Readiness Index (isitagentready.com) scoring dimensions.

**Q: What is agent-readiness-generator?**
An always-on system skill that auto-generates agent-readiness files (llms.txt,
agent.json, .well-known/ endpoints, Content-Signal in robots.txt) when the AI
builds websites. Also coaches users on content structure for AI citation
(answer-first format, FAQ sections, JSON-LD). No toggle needed.

**Q: What are Agent Subagents?**
Subagents are specialized AI agents that the main AI can delegate tasks to.
5 system subagents are built-in. Space Admins can create custom ones, or
let the AI create them via the subagent-creator. Toggle in Settings > Space >
Agent Subagents.

**Q: What's the difference between Skills and Subagents?**
Skills are instructions the AI follows itself (e.g., "how to deploy to GCP").
Subagents are autonomous agents the AI delegates work to (e.g., "run tests
in parallel while I continue coding").

**Q: How does the External API work?**
Enable External Messaging in Settings, generate an API Key, then call
`POST /api/external/conversations/{id}/run` with your message. AI runs
headlessly using the Space's configured credentials.

**Q: How do I create Office documents (PowerPoint, Word, Excel)?**
Just ask in a conversation: "Create a PowerPoint about Q1 results" or
"Build an Excel spreadsheet for monthly expenses". The AI uses the built-in
ms-office-suite skill. Download the file from the FILES tab in Canvas.

**Q: How does Google Workspace integration work?**
Corporate Admin sets up a GWS credential (service account + Domain-Wide
Delegation). Once configured, you can ask the AI to read emails, create
calendar events, manage Drive files, edit Docs/Sheets, etc. 45+ tools
across Gmail, Calendar, Drive, Docs, Sheets, and Tasks.

**Q: How do I set up LINE Bot integration?**
Settings > Space > LINE Bot > Connect. Enter your LINE Channel ID, Channel
Secret, and Channel Access Token (from LINE Developers Console > Messaging
API). Omni verifies the credentials, then displays a Webhook URL — copy it
into LINE Developers Console > Webhook settings. Requires Space Admin role.

**Q: How does the AI reply to LINE messages?**
When a LINE group message arrives, it appears in the mapped conversation as
`[LINE 訊息] sender: content`. The AI's reply is automatically forwarded
to the LINE group — no tool call needed. For proactive messaging (e.g.,
reporting completed tasks), the AI uses the `line_send_message` MCP tool.

**Q: How do I link a LINE group to a conversation?**
After enabling LINE Bot in Space Settings, add the bot to your LINE group.
Then set `conversation_settings.webhook_metadata.line_group_id` to the
group's LINE ID (starts with `C`). Messages from that group will be
routed to the mapped conversation.

**Q: What is the Space Library?**
The Space Library lets you upload documents (PDF, DOCX, XLSX, PPTX, TXT,
CSV, MD) to create a knowledge base for the Space. Documents are parsed,
chunked, and embedded into vectors. When you ask a question, the AI performs
a semantic search across all uploaded documents and answers with numbered
citations (【1】【2】 etc.). Enable "Library Only" mode to restrict the AI
to answer exclusively from uploaded documents. Setup: Settings > Space >
Library.

**Q: How do I upload documents to the Library?**
Go to Settings > select your Space > Library section. Drag-and-drop files
onto the upload area, or click to browse. Files are processed automatically:
uploaded → parsed → chunked → embedded → ready. Processing typically takes
a few seconds to a minute depending on file size. Max file size is 50 MB.

**Q: What file formats does the Library support?**
PDF, DOCX (Word), XLSX (Excel), PPTX (PowerPoint), TXT, CSV, and MD
(Markdown). The system extracts text content from each format — for example,
PDF pages are extracted with PyMuPDF, DOCX paragraphs with python-docx, and
XLSX/CSV cells are converted to text rows.

**Q: Why did my Library document upload fail?**
A document can fail due to: (1) the file exceeds the 50 MB size limit,
(2) the file is corrupted or password-protected, (3) a transient network
error during storage upload. Check the document status in the Library panel
— failed documents show a "Failed" badge. Delete the failed document and
re-upload. If the problem persists, verify the file opens correctly on your
computer.

**Q: How do Library citations work?**
When the AI finds relevant content in uploaded documents, each chunk is
numbered 【1】【2】【3】 etc. The AI references these markers in its answer.
Clicking a citation shows the source document title, page number (for PDFs),
and a text excerpt. Citations only appear for chunks above the relevance
threshold — low-quality matches are filtered out automatically.

**Q: What is Library Only mode?**
Library Only mode restricts the AI to answer ONLY from uploaded documents.
If the AI cannot find relevant information in the Library, it will tell you
so instead of using its general knowledge. This is useful for compliance,
policy Q&A, or any scenario where answers must be grounded in specific
documents. Toggle it in the conversation settings or set it as the Space
default in Settings > Space > Library.

**Q: How do I delete a document from the Library?**
In Settings > Space > Library, click the trash/delete icon next to the
document you want to remove. Confirm the deletion. This removes the
document, all its chunks, and embeddings from the system.

**Q: How do I preview a website I'm building?**
The Canvas PREVIEW tab shows live output. For sharing, click "Public Preview"
to get a shareable URL via omnitunnel. Auto-build detects your framework
(Vite, Next.js, etc.) and runs install → build → dev server.

**Q: How do I use /monitor?**
Type `/monitor <command>: <description>` in a conversation to start a
background monitoring process. Example:
`/monitor tail -f /var/log/app.log | grep --line-buffered ERROR: Watch for errors`
Use `/monitor stop` to stop all monitors. Use `/monitor list` to see active ones.

**Q: When does Monitor trigger AI?**
Only when a monitor event is classified as **warning** or **critical**. Info-level
events are recorded but do NOT trigger AI — keeping token costs at zero for
routine output. There is a 5-minute cooldown per monitor to prevent cost explosion.

**Q: How does Monitor classify event severity?**
Two-phase classification:
1. **Prefix-based (Phase 1)**: If the first stdout line starts with `WARNING:` or
   `CRITICAL:` (case-insensitive), that severity is used immediately. This lets
   custom scripts fully control severity via stdout prefixes.
2. **Keyword fallback (Phase 2)**: If no prefix is found, the system scans the full
   event text for known keywords (e.g., FATAL, PANIC, OOM → critical; WARN,
   TIMEOUT, RETRY → warning). Unmatched text defaults to info.
Scripts should use the prefix approach for reliable, deterministic classification.

**Q: How do I write a custom monitor script?**
Write a shell script that outputs to stdout only when something noteworthy
happens. Use `WARNING:` or `CRITICAL:` prefixes to control severity:
```
echo "WARNING: Disk usage above 80%"      # triggers AI (warning)
echo "CRITICAL: Database connection lost"  # triggers AI (critical)
# Normal state: output nothing (zero token cost)
```
The AI determines what action to take from the event content (entity IDs,
service names, etc.) using available MCP tools — no special prompt or magic
string is needed. See `docs/user-guide/monitor.md` for a full template.

**Q: What's the difference between Monitor, Loop, and Heartbeat?**
Monitor runs a background shell command and reacts to stdout events (zero cost
when silent). Loop repeats AI tasks on a schedule. Heartbeat is system-level
health monitoring (Pulse every 4h, Rhythm every 24h). Monitor is event-driven;
Loop and Heartbeat are time-driven.

**Q: What is Admin AI?**
A dedicated AI assistant at each admin level (Space, Corporate, System) for
data analysis and operations. Corporate Admin AI can generate daily insights,
render charts, and manage Cron Jobs.

**Q: What are Cron Jobs?**
Scheduled AI tasks managed by Corporate Admin AI. Define a cron expression,
model, and prompt — the AI runs automatically on schedule. Example: "Check
deployment status every weekday at 9 AM."

**Q: How do I use /schedule in a conversation?**
Use `/schedule "<cron>": <prompt>` in the chat. The cron format is 5 fields:
`minute hour day-of-month month day-of-week`. Examples:
- `/schedule "0 9 * * 1-5": summarize yesterday's git commits` — weekdays at 9am
- `/schedule "*/30 * * * *": check build status` — every 30 minutes
- `/schedule "0 9 * * 1-5" tz=Asia/Taipei: 每日站會摘要` — specify timezone
- `/schedule "0 9 * * 1-5" max 20: daily review` — stop after 20 iterations
- `/schedule once "30 14 21 4 *": deploy release notes` — run once
Manage schedules with `/schedule list`, `/schedule stop`, or
`/schedule stop <id>`.

**Q: What's the difference between /schedule and Cron Jobs?**
`/schedule` is created inside a normal conversation and runs that conversation's
prompt on a cron expression. Corporate Cron Jobs are managed from Corporate
Admin AI or the Cron Jobs tab for organization-level scheduled tasks. Both use
cron timing, but `/schedule` is conversation-scoped while Cron Jobs are admin-
managed.

**Q: What is TAEA?**
Transparent, Auditable, Explainable AI — Omni's governance framework. Tool
calls are streamed live (Transparent), changes are tied to conversations and
timestamps (Auditable), and AI cites evidence for its conclusions (Explainable).

**Q: Can I use Omni's browser to take screenshots or fill forms?**
Yes. Omni has a headless Playwright browser. Use MCP browser tools to navigate
websites, login, click elements, fill forms, and capture screenshots.

**Q: How do I use Canvas to view tables and diagrams?**
Canvas is a panel next to the chat with 6 tabs: Logs, Files, Code, Preview,
Changes, and Canvas. The Canvas tab auto-extracts tables, Mermaid diagrams,
and HTML artifacts from the conversation. Click "Show in Canvas" on any
extractable item to view or interact with it full-screen.

**Q: What is Plan Mode?**
Plan Mode lets the AI propose an implementation plan before making changes.
The AI explores the codebase, designs an approach, and presents it for your
approval. You can review, suggest modifications, or approve — the AI only
proceeds after confirmation. Useful for complex or multi-file changes.

**Q: How does Loop work for deep research?**
Loop repeats AI tasks automatically. Syntax: `/loop 5 run tests and fix`
(repeat 5 times) or `/loop every 30m: check status` (timed intervals).
Timed loops run the first iteration immediately by default; add `wait`, `delay`,
or `defer` before the colon to wait one full interval first, e.g.
`/loop every 30m wait: check status`.
Max 3 loops per conversation, 72h expiry. Great for iterative research,
monitoring, or build-fix-test cycles.

**Q: What is /long-loop and how does it differ from /loop?**
Long-Loop is the same as /loop but with extended limits: 30-day hard cap
(instead of 72h), max interval of 7 days (instead of 24h). Requires Pro
plan. Syntax: `/long-loop every 2h x10: deep analysis`. Long-loops stop
when max iterations are reached, after 30 days, or when stopped manually.
The conversation gets a distinctive "long-loop" tag (indigo) instead of
the regular "loop" tag.

**Q: What happens when a loop iteration fails?**
If a loop iteration fails (timeout, error, or exception), the run is
marked as failed and the loop continues to the next scheduled iteration.
After 3 consecutive failures, the loop is automatically paused to prevent
wasting resources. You can resume a paused loop from the admin dashboard
(Corporate or System level) or via the REST API. Each iteration has a
configurable timeout (default 600s). On server restart, any running iterations
are marked as failed and loops resume on their next scheduled time.

**Q: Loop timing — are loops guaranteed to run exactly on schedule?**
Loops are best-effort, not real-time. The scheduler polls every 60 seconds,
so execution may be delayed by up to ~60s from the scheduled time. System
load, other running tasks, and server restarts can cause additional delays.
If precise timing is critical, consider shorter intervals with tolerance
for variance.

**Q: How do I build and deploy a website with Omni?**
Describe what you want (e.g., "Build a landing page for my SaaS product").
The AI creates the project, writes code, and starts a dev server. Use the
Canvas PREVIEW tab for live output. Click "Public Preview" for a shareable
URL. Auto-build detects your framework (Vite, Next.js, etc.) automatically.

**Q: How do I review code changes in Omni?**
Use the Canvas CHANGES tab to see all file modifications made by the AI.
It shows diffs for each changed file. You can also create PRs directly
from the Changes tab, the conversation toolbar, or accept AI suggestions.

**Q: How does CI/CD work with Omni?**
PRs created by Omni trigger your normal CI pipeline (GitHub Actions, etc.).
You can also mention `@claude` in PR comments to get AI-powered code review
via Claude Code Action. The AI can read CI logs and fix failing checks.

**Q: How do I add members and manage roles?**
Settings > Space > Members. Invite by email, set role (Admin/Developer/Viewer)
and AI level (Basic/Advanced/Pro). Corporate Admins are auto-admin in all
spaces. Viewers are read-only. AI level controls which models are available.

**Q: How do I set up cloud credentials?**
Settings > Space > Credentials > Add. Choose provider (GCP, AWS, GitHub,
Firebase, Supabase, Web3, API Key). Paste the credential value — it's
encrypted with Fernet (AES-128-CBC) before storage. Corporate credentials
(Settings > Corporate) are shared across all spaces.

**Q: What dashboards are available?**
Three levels: Space Dashboard (7d activity, Heartbeat trend, member list),
Corporate Dashboard (Red Alerts, AI Usage charts, Admin AI, Cron Jobs,
Loops, Monitors), and System Dashboard (platform-wide analysis, Task
Timeline, emergency stop controls).

**Q: What is .omni/memory.md and how does it work?**
`.omni/memory.md` (previously `.omni/WORKSPACE.md`) is a per-conversation
persistent context file. The AI reads it at the start of every turn to
understand what repos are linked, what tools are available, and what it
has discovered. The AI updates it after each task with new findings.
The `## Repositories` section is system-managed (auto-refreshed each
turn). Users can read it to see what the AI knows, or ask the AI to
correct entries. Do not manually edit the Repositories section.

**Q: What's the difference between workspace memory and shared memory?**
Workspace memory (`.omni/memory.md`) is per-conversation — it stores
context about that specific conversation's workspace (linked repos,
environment, discoveries). Shared memory is per-Space — it stores
knowledge visible across ALL conversations in the Space (environment,
architecture, convention, discovery, domain). Use workspace memory for
conversation-specific context; use shared memory for team-wide facts
that benefit everyone.

**Q: How do I use Shared Memory?**
The AI manages shared memory automatically. It writes when it discovers
Space-level facts (e.g., "Database: PostgreSQL 15 on Cloud SQL"). You
can also ask the AI to write, list, or delete shared memories. There are
5 categories: environment, architecture, convention, discovery, domain.
Limits: max 50 entries per Space, max 500 characters per entry. To view
all entries, ask "list shared memories" or the AI calls
`mcp__memory__workspace_memory_list`. To delete, the AI must confirm
with you first (TAE-AI principle).

**Q: How do credentials become environment variables?**
When cloud credentials are configured in Settings, the AI automatically
gets them as environment variables in every bash command:
- GitHub: `$GITHUB_TOKEN`, `$GH_TOKEN`
- GCP: `$GOOGLE_APPLICATION_CREDENTIALS`, `$GCLOUD_PROJECT`
- AWS: `$AWS_ACCESS_KEY_ID`, `$AWS_SECRET_ACCESS_KEY`, `$AWS_DEFAULT_REGION`
- Firebase: `$FIREBASE_SERVICE_ACCOUNT`, `$FIREBASE_PROJECT`
- Supabase: `$SUPABASE_ACCESS_TOKEN`, `$SUPABASE_PROJECT_REF`
- Web3: `$WEB3_PRIVATE_KEY`, `$ETH_RPC_URL`
- API Key: Custom name or auto-derived `SERVICE_NAME_API_KEY`
To verify: `[ -n "$GITHUB_TOKEN" ] && echo "configured"`. Never echo
secret values directly.

**Q: What do quota or budget errors mean?**
Quota errors occur when AI token usage exceeds configured limits. Omni
has a dual-layer quota system: personal quotas (per user) and corporate
quotas (per organization). When you see a budget/quota error, it means
one of these limits has been reached for the current billing period.
Contact your Corporate Admin to check usage in the Corporate Dashboard
(AI Usage Analytics section) and adjust limits if needed. Using more
efficient models (Sonnet instead of Opus) or shorter prompts can help
reduce token consumption.

**Q: How do I work with multiple repos in a Space?**
Link multiple GitHub repos in Settings > Space > Repositories. Each
repo is cloned into its own subdirectory in the workspace. The AI must
`cd` into the correct repo directory before running git commands (the
workspace root has its own `.git` which is NOT the repo). Check
`.omni/memory.md` to see which repos are linked and their branches.
Each conversation works on its own branch per repo. You can switch
between repos by telling the AI which one to work on.
