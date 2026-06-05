---
name: z-check-comment
description: >
  Set up a background Monitor to watch for new comments on a Z App entity
  (release, project, agent_ticket, etc.) and auto-react with AI. Teaches the
  agent how to use the built-in z_comment_watch.sh script via /monitor or
  mcp__numbers__monitor_create.
---

# Z Comment Watcher — Monitor Setup Guide

Set up a persistent background monitor that watches a Z App entity for new
comments and triggers AI reaction when they arrive.

## When to Use

- User asks to "watch comments on release X" or "monitor Z comments"
- A loop/cron needs real-time awareness of human replies on a Z entity
- Heartbeat or NREM proposes comment monitoring for a tracked entity

## Prerequisites

- **Z integration enabled** for the Space (Settings > Space > Z App)
- The `z_comment_watch.sh` script is pre-installed at
  `backend/src/numbers_omni/monitor/scripts/z_comment_watch.sh`
- MonitorManager auto-injects `Z_GATEWAY_URL` and `Z_API_KEY` env vars
  into monitor subprocesses for Z-enabled spaces

## Step 1 — Identify the Entity

Determine the entity type and ID to watch. Common entity types:

| entity_type | Example use case |
|-------------|-----------------|
| `release` | Watch review comments on a release |
| `project` | Watch updates on a project |
| `agent_ticket` | Watch human replies on an agent ticket |
| `minutes` | Watch feedback on meeting minutes |
| `post` | Watch reactions to a post |

If the user gives you a name instead of an ID, query Z first:

```
z_query(
  table="<entity_type>s",
  filters={"name": "<search term>"},
  select="id, name, status"
)
```

## Step 2 — (Optional) Author Scope

### Watch a specific person only

If the user wants to watch only a specific person's comments:

```
z_query(
  table="profiles",
  filters={"name": "<person name>"},
  select="id, name, email"
)
```

Use the profile `id` as the `--watch-author` argument. If omitted, all
human comments on the entity are watched.

### Ignore additional authors

Use `--ignore-author <display name>` to skip specific people (repeatable).

Self-loop prevention is automatic: `MonitorManager` injects `Z_SELF_PROFILE_ID`
into the subprocess environment. The script filters by `commented_by_id`,
catching ALL system-posted comments regardless of display name (Atlas, null, etc.).

## Step 3 — Create the Monitor

### Option A: Via MCP Tool (Recommended)

```
mcp__numbers__monitor_create(
  command="bash z_comment_watch.sh --entity-type <type> --entity-id <uuid> --watch-author <profile-uuid> --interval 900",
  description="Watch <entity_type> <name> for comments",
  persistent=true
)
```

> **Note**: The `persistent` parameter prevents the monitor from auto-expiring
> after 24 hours. Bundled script paths (e.g. `z_comment_watch.sh`) are
> automatically resolved to absolute paths — no need to specify the full path.

### Option B: Via /monitor Command

```
/monitor persistent bash z_comment_watch.sh \
  --entity-type <type> --entity-id <uuid> \
  --watch-author <profile-uuid> --interval 900 \
  : Watch comments on <entity_type> <name>
```

### Script Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--entity-type` | Yes | — | Z entity type (`release`, `project`, `agent_ticket`, etc.) |
| `--entity-id` | Yes | — | UUID of the entity to watch |
| `--watch-author` | No | all | Profile UUID — only watch this person's comments |
| `--interval` | No | `900` | Polling interval in seconds (15 min default) |
| `--self-profile-id` | No | auto | Profile UUID of the agent (auto-set via `Z_SELF_PROFILE_ID` env) |
| `--ignore-author` | No | — | Display name to skip (repeatable) |
| `--include-ai-comments` | No | off | Disable all self-loop filtering |
| `--replay-history` | No | off | Replay all historical comments on first run |

### Self-Loop Prevention

The script uses **profile-ID-based** filtering to prevent AI-triggers-AI loops.
`MonitorManager` automatically injects the space's `Z_SELF_PROFILE_ID` env var
(resolved from the Z integration's `agent_profile_id`). The script filters
`commented_by_id` — catching ALL system-posted comments regardless of their
display name (e.g. "Atlas", "Omni AI Agent", or null).

**Fallback**: If `Z_SELF_PROFILE_ID` is not available (e.g. manual script run),
the script falls back to name-based filtering: skipping "Omni AI Agent" and
null/empty author names.

Use `--include-ai-comments` only if you explicitly need the AI to see its
own previous responses (e.g., for audit or debugging).

### First-Run Baseline

On first run (no state file), the script records the current UTC timestamp
and only watches for **future** comments. Historical comments are never
replayed. Use `--replay-history` to override (e.g., for backfill).

### Choosing the Interval

| Scenario | Recommended interval |
|----------|---------------------|
| Active review (expecting replies soon) | `300` (5 min) |
| Normal monitoring | `900` (15 min, default) |
| Long-term passive watch | `1800` (30 min) |

## How It Works — Under the Hood

1. **Script polls Z gateway** every `--interval` seconds, querying the
   `comments` table for the specified entity
2. **New comments detected** → script outputs:
   ```
   WARNING: [Z-COMMENT] entity_type=release entity_id=abc comment_id=xyz author=Sherry has_image=single preview=...
   ```
   The `has_image` field is included only when images are attached:
   - `has_image=single` — `image_url` is set (one image)
   - `has_image=multiple` — `image_urls` has entries (multiple images)
   - (omitted) — no images attached
3. **MonitorManager classifies severity** from the `WARNING:` prefix
   (Phase 1 prefix-based classification — the script controls severity)
4. **AI reaction triggered** — the agent receives the event as a
   conversation message and automatically responds using MCP tools:
   - `z_query` / `z_get` to read the full comment (including
     `image_url` and `image_urls` fields)
   - If images are attached: download with `curl -sL` and view with
     the Read tool (Claude is multimodal)
   - `z_insert(table="comments")` to reply
   - Any other MCP tools as needed

The AI determines the appropriate action from the entity IDs in the
event content. No special prompt or magic string is needed.

## Step 4 — Verify the Monitor

After creation, confirm the monitor is running:

```
/monitor list
```

You should see the monitor as `active` with the description you provided.

## Examples

### Watch all comments on a release

```
mcp__numbers__monitor_create(
  command="bash z_comment_watch.sh --entity-type release --entity-id 7a3f9b21-4c8e-4d2f-b5a6-1e9f3c7d8e2a --interval 900",
  description="Watch LINE Bot release for review comments"
)
```

### Watch only Sherry's comments on a project

```
mcp__numbers__monitor_create(
  command="bash z_comment_watch.sh --entity-type project --entity-id 2b4c6d8e-1a3f-5b7d-9e1c-3a5b7d9e1f3a --watch-author 0b8dc4f7-4a31-42d1-a5bf-340b0bc2173f --interval 300",
  description="Watch Sherry's comments on project"
)
```

### Watch replies on an agent ticket

```
mcp__numbers__monitor_create(
  command="bash z_comment_watch.sh --entity-type agent_ticket --entity-id <ticket-uuid> --interval 600",
  description="Watch human replies on agent ticket"
)
```

## Monitor Lifecycle

- **Default expiry**: 24 hours (monitors auto-expire)
- **Persistent**: Add `persistent` keyword in `/monitor` command or set `persistent=true` in `monitor_create` MCP tool
- **Restart recovery**: Monitors auto-recover on server restart — subprocesses are re-started from DB records (same as Loop/Schedule). SIGTERM/SIGKILL exits are treated as recoverable; DB status stays `active` for recovery.
- **Stop**: `/monitor stop` or `/monitor stop <monitor_id>`
- **Limits**: Max 3 monitors per conversation, 10 per space

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Monitor fails to start | Z integration not enabled | Check Settings > Space > Z App |
| No events detected | Entity has no new comments | Wait for someone to comment, or lower interval |
| AI reacts to its own comments | `--include-ai-comments` was used, or script is outdated | Remove `--include-ai-comments` flag; redeploy if script predates self-loop fix |
| All historical comments replayed | `--replay-history` was used, or state file was deleted | Remove `--replay-history` flag; script baselines on first run by default |
| Multi-line comments produce broken events | Script is outdated (pre-sanitization) | Redeploy; current script sanitizes newlines/tabs/pipes in preview |
| `CRITICAL: Z_GATEWAY_URL or Z_API_KEY not set` | Z credentials not injected | Verify Z integration is enabled and credentials are valid |
| `CRITICAL: jq is required` | jq not installed in workspace | This should not happen — jq is pre-installed on the VM |

## Reference Data — Profile IDs

| Name | profile_id |
|------|-----------|
| Tammy | `9c611629-1cb6-47ca-8ee6-b62830489ffd` |
| White | `6b2cb121-ad8e-4cf7-b1ce-81fd871275dd` |
| Sherry | `0b8dc4f7-4a31-42d1-a5bf-340b0bc2173f` |
| Olga | `3e3f50ed-c037-4f9f-827a-d1f78d4b70f2` |
| Sofia | `54d58944-1c93-4711-9a90-0753b42e2b17` |
| Bofu | `56ced4bb-11f1-4ffc-91ab-e4712a5149d8` |
| Steffen | `8f997e50-aa93-42b6-bd71-d8938b6e77f0` |
| **Agent** | `b90f38a1-86d7-4e3f-92e3-7faff798ef29` |
