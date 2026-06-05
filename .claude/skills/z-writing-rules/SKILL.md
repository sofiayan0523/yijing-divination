---
name: z-writing-rules
description: >
  Shared formatting and behavior rules for ALL content written to Z App —
  comments, entity descriptions, and reports. Always follow these rules
  when composing any text destined for Z, regardless of which skill or
  trigger initiated the write.
---

# Z Writing Rules

These rules apply to **every piece of text** written to Z App, including:
- Comments on any entity (agent_tickets, releases, posts, projects, etc.)
- Description fields when creating or updating entity records
- Report content posted as comments
- Any other structured text sent via `z_insert` or `z_update`

All Z skills (z-ticket-check, z-agent-ticket-creation, z-report-status,
z-check-comment) inherit these rules automatically.

## Rule 1 — Markdown Formatting

- Use `### ` (h3) for section headings — NEVER `**bold**` as a heading substitute
- Use `* ` bullets for lists
- Use backtick `` ` `` for code, IDs, commands, and technical terms
- Use fenced code blocks for multi-line code or config
- Do NOT use HTML tags
- Keep paragraphs short (2-3 sentences max)

## Rule 2 — @Name Mentions (Push Notifications)

Z App has a DB trigger `notify_comment_mentions()` that parses `@Name`
patterns in comment `content` and creates push notifications.

- **Always** include `@<Name>` for the target person in comments
- This applies to ALL agent-generated comments including automated
  progress updates, loop/schedule outputs, and monitor reactions
- Use the workspace profile display name (e.g. `@Tammy`, `@Sherry`)
- The display name is **case-sensitive** — the exact casing from the
  profile must match. NEVER use profile UUIDs (e.g. `@3e3f50ed`) —
  only the exact display name triggers the push notification
- Without `@mention`, comments are **silent** — users may miss them
- The header `@email` format is for human readability only; only
  `@Name` (matching a workspace member profile name) triggers push
- For multiple recipients: `@Tammy @Sherry <content>`

## Rule 3 — Entity Links

When referencing any Z entity, use a clickable markdown link:

```
[<display title>](https://zwork.one/?<entity_type>=<uuid>)
```

| Entity Type | URL Pattern | Example |
|-------------|-------------|---------|
| agent_ticket | `?agent_ticket=<uuid>` | `[Fix deploy](https://zwork.one/?agent_ticket=367044c7-...)` |
| release | `?release=<uuid>` | `[v0.144.3](https://zwork.one/?release=128dd168-...)` |
| post | `?post=<uuid>` | `[Omni需求](https://zwork.one/?post=386779cc-...)` |
| project | `?project=<uuid>` | `[ProofSnap](https://zwork.one/?project=91f6cfe8-...)` |
| decision | `?decision=<uuid>` | `[Q2 Policy](https://zwork.one/?decision=6239ce30-...)` |
| idea | `?idea=<uuid>` | `[Design v2](https://zwork.one/?idea=abc123-...)` |

**NEVER** use raw UUIDs, short IDs without links, or `Ticket #1` style
references. Z-side users need clickable links to navigate.

## Rule 4 — No Local File Paths (Artifact Handoff)

Z-side users **cannot** open Omni workspace files. Never mention only a
local filename (e.g. `execution-suggestions.md`, `medium-draft.md`).

Choose the appropriate handoff method:

| Situation | Action |
|-----------|--------|
| File in a linked repo, safe for VCS | Commit to branch → share GitHub PR or file link |
| Small non-repo content (< ~8K chars) | Paste directly in the comment/description |
| Long non-repo content | Create a Google Doc (follow GWS confirmation rules) → share link |
| No external tool available | Paste the key excerpt; never leave only a filename |

**Always** redact secrets, credentials, private keys, and tokens before
publishing any artifact.

## Rule 5 — Archived / Resolved Entity Guard

- Do NOT post substantive content on `resolved`, `closed`, or archived entities
- Users will not check these; your comment will be lost
- **Exception**: A brief cross-reference when creating a follow-up record
  (e.g. "Blocker persists — follow-up: [title](url)")

## Rule 6 — Language

- Match the conversation language (default: 繁體中文 for this workspace)
- If the entity or comment thread is in a specific language, follow that
- Section heading names in templates (e.g. `### 特別注意事項`) must NOT
  be translated unless the template explicitly allows it

## Rule 7 — Security

- NEVER include API keys, tokens, passwords, private keys in Z content
- If referencing a credential, say "configured" or "available via env var"
- Inspect all content before posting; redact sensitive data

## Rule 8 — Comment Authorship (`commented_by_name`)

When inserting comments via `z_insert(table="comments", ...)`, **always**
include `commented_by_name` and `commented_by_id` in the `data` payload:

```
z_insert(
  table="comments",
  data={
    "entity_type": "...",
    "entity_id": "...",
    "content": "...",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>"
  }
)
```

- **`commented_by_id`**: Always use the Agent profile ID
  (`b90f38a1-86d7-4e3f-92e3-7faff798ef29`)
- **`commented_by_name`**: Derive from the agent's own identity:
  - If the agent has a specific name (from IDENTITY in system prompt,
    e.g. "Atlas"), use `"<Name> Agent"` → `"Atlas Agent"`
  - If no specific name, default to `"Omni AI Agent"`
- Without these fields, comments appear with no author in Z App, and
  the comment watcher cannot identify agent-authored comments for
  self-loop filtering

## Record Creation Checklist

Before creating **any** entity record in Z (not just agent_tickets):

1. **Check config** — `z_get_config()` to confirm the entity module is enabled
2. **Deduplicate** — `z_query` with title/name/subject filter; update if exists
3. **Format description** — Follow Rules 1-4 above (markdown, no local paths,
   include links to referenced entities)
4. **Identify assignee/owner** — `z_query(table="profiles")` to find UUID
5. **Approval workflow** — If entity requires approval (check config):
   `z_assign_confirmation_reviewers` → `z_assign_approval_reviewers` →
   `z_request_approval`
6. **Notify stakeholders** — After insert, post a comment with `@Name`
   mentions if humans need to be informed

## Reference Data — Profile Names for @Mentions

| Display Name | profile_id | Email |
|-------------|-----------|-------|
| Tammy | `9c611629-1cb6-47ca-8ee6-b62830489ffd` | tammy@numbersprotocol.io |
| White | `6b2cb121-ad8e-4cf7-b1ce-81fd871275dd` | white@numbersprotocol.io |
| Sherry | `0b8dc4f7-4a31-42d1-a5bf-340b0bc2173f` | sherry@numbersprotocol.io |
| Olga | `3e3f50ed-c037-4f9f-827a-d1f78d4b70f2` | olga@numbersprotocol.io |
| Sofia | `54d58944-1c93-4711-9a90-0753b42e2b17` | sofia@numbersprotocol.io |
| Bofu | `56ced4bb-11f1-4ffc-91ab-e4712a5149d8` | bofu@numbersprotocol.io |
| Steffen | `8f997e50-aa93-42b6-bd71-d8938b6e77f0` | steffendarwin@numbersprotocol.io |
| **Agent** | `b90f38a1-86d7-4e3f-92e3-7faff798ef29` | (agent profile) |
