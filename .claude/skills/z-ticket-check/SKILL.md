---
name: z-ticket-check
description: >
  SOP for checking Z App agent ticket status, triaging human comments,
  and taking follow-up actions. Invoke when checking ticket status at
  the start of an executor cycle, during scheduled loops, or when a
  user asks to check tickets.
---

# Z Agent Ticket Status Check

Standard Operating Procedure for checking and responding to agent tickets
in Z App. This skill teaches the agent how to query open tickets, analyse
human comments, decide on follow-up actions, and produce a status report.

## When to Use

- **Executor SOP**: At the start of each executor cycle (Pulse / Rhythm)
- **Scheduled loop / cron**: Periodic ticket status checks
- **User request**: When a user explicitly asks to check ticket status
- **Post-task check**: After completing work, to verify if related tickets
  can be closed

## Step-by-Step Procedure

### Step A — Query All Open Tickets

```
z_query(
  table="agent_tickets",
  filters={"status": "open"},
  select="id, title, ticket_type, status, priority, assignee_id, tags, created_at, updated_at"
)
```

Also query `in_progress` tickets:
```
z_query(
  table="agent_tickets",
  filters={"status": "in_progress"},
  select="id, title, ticket_type, status, priority, assignee_id, tags, created_at, updated_at"
)
```

### Step B — Query Comments for Each Ticket

For every open / in-progress ticket, retrieve its comment thread:

```
z_query(
  table="comments",
  filters={"entity_type": "agent_ticket", "entity_id": "<ticket_id>"},
  order="created_at.asc"
)
```

### Step C — Identify New Human Comments

For each comment returned:

1. Compare `created_at` with the ticket's `updated_at` (or your last check
   timestamp if available).
2. Check `commented_by_id`:
   - If it equals the **Agent profile** (`b90f38a1-86d7-4e3f-92e3-7faff798ef29`),
     it is the agent's own comment — skip.
   - Otherwise it is a **human comment** — analyse it.
3. Check for image attachments: if `image_url` is non-null or `image_urls`
   is non-empty, download the image(s) locally with
   `curl -sL "<url>" -o /tmp/z_image.jpg` and use the Read tool to view
   them. Include observations about the image in your analysis.

### Step D — Write Progress Update Comment

For every ticket that remains `open` or `in_progress` after Steps A–C,
post a progress update so stakeholders can track the agent's work.

1. **Dedup** — If the latest comment is an agent update with no new info, skip.
2. **Gather context** — Check `plans/todo.md`, `.omni/memory.md`, recent tool
   outputs, code changes, PRs, and deployments related to the ticket.
3. **Query schedules** — Use `mcp__numbers__loop_list()` /
   `mcp__numbers__schedule_list()` to find `next_run_at`. If running inside a
   loop/cron, extract the schedule context from the conversation.
4. **Post** — `z_insert(table="comments", ...)` with a concise summary
   (3–5 sentences: what changed, deliverables, blockers) and
   `**Next scheduled check:** <next_run_at>`. Skip if nothing new.

### Step E — Artifact Handoff & Writing Rules

Follow **z-writing-rules** skill for all Z content: markdown formatting,
@Name mentions, entity links, artifact handoff (Rule 4), and the
resolved-entity guard.

## Comment Analysis — Decision Tree

**General principle**: You are a technical collaborator, not a ticket clerk.
When a human comment contains an actionable request, respond with maximum
helpfulness — provide concrete steps, code, configs, or artifacts. Never
reply only with "received, waiting for more info" when you can advance the
solution yourself.

For each new human comment on an `open` or `in_progress` ticket, classify
it into one of the following categories and take the corresponding action:

| Category | How to Identify | Agent Action |
|----------|----------------|--------------|
| **Decision / Reply** | User answers a `question` ticket's options | Reply comment confirming receipt → Execute the decision → Close ticket if done |
| **Help Request / Solution Proposal** | User proposes a technical approach, asks "how to do X", or requests implementation steps | Reply with **concrete, actionable steps** the agent can produce (code, scripts, config instructions, step-by-step guide) → If agent can directly produce the artifact (e.g. write a script, draft a config), do so and include it in the comment → Keep ticket open until implemented |
| **Information Provided** | User provides email, account, link, or resource | Reply comment confirming receipt → Record info to relevant file → Unblock dependent work |
| **Scope Change** | User changes task ownership or scope | Reply comment confirming receipt → Update ticket description → Update `tickets.md` and `memory.md` |
| **Follow-up Question** | User asks a further question | Reply with a detailed, actionable answer — include code, steps, or config if applicable → Keep ticket open |
| **Completion Confirmation** | User says the task is done | Reply comment confirming → Update status to `resolved` |
| **Irrelevant / Chat** | Non-task content | Reply with brief acknowledgement → Do not change ticket status |

## Response Actions

### Action 1 — Reply with a Comment

```
z_insert(
  table="comments",
  data={
    "entity_type": "agent_ticket",
    "entity_id": "<ticket_id>",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>",
    "content": "@<assignee_name> <reply content>"
  }
)
```

### Action 2 — Update Ticket Status

```
z_update(
  table="agent_tickets",
  record_id="<ticket_id>",
  data={"status": "resolved"}
)
```

Valid status transitions:
- `open` → `in_progress` (agent or human started working)
- `open` → `resolved` (completed directly)
- `in_progress` → `resolved` (work finished)

### Action 3 — Sync Local Files

After processing a ticket:
- `plans/tickets.md` — Update the corresponding ticket row with new status
  and notes
- `plans/todo.md` — Change `[!]` (blocked) markers to `[ ]` or `[x]`
- `.omni/memory.md` — Record key state changes under Key Discoveries

## Creating New Tickets

If you discover a new blocker that requires human action during the check:

```
z_insert(
  table="agent_tickets",
  data={
    "title": "...",
    "ticket_type": "<question|task|approval_needed|escalation|review_request>",
    "assignee_id": "<profile_id>",
    "priority": "<high|medium|low>",
    "status": "open",
    "description": "...",
    "tags": [...]
  }
)
```

Also write the new ticket to `plans/tickets.md` for local tracking.

## Output Report Format

After each check, produce a summary in this format:

```markdown
## Z Agent Ticket Status Check — <timestamp>

### Open Tickets: N
| # | Z ID (short) | Title | Type | Priority | Assignee | New Comments | Action Taken |
|---|-------------|-------|------|----------|----------|-------------|--------------|
| 1 | 367044c7... | ...   | question | high | Tammy | 1 (Tammy) | Replied, executing decision |

### Actions This Check
- [Ticket #X](https://zwork.one/?agent_ticket=<uuid>): Received user reply, executed ...
- [Ticket #Y](https://zwork.one/?agent_ticket=<uuid>): No new comments, posted progress update

### Progress Updates Posted: P
| # | Z ID (short) | Summary | Next Check |
|---|-------------|---------|------------|
| 1 | 367044c7... | Completed API integration, pending review | 2026-05-12 14:00 UTC |

### New Tickets Created: M
- (list any newly created tickets)

### Next Steps
- (decisions or actions based on ticket status)
```

## Reference Data

Profile IDs and emails: see **z-writing-rules** skill reference table.

## Reference Data — Ticket Types and Status

**Valid `ticket_type` values:**
- `question` — Need human decision or input
- `task` — Assign a task to a human
- `approval_needed` — Need human approval
- `escalation` — Hit capability limit, need handoff
- `review_request` — Want human to review agent's work

**Valid `status` transitions:**
- `open` → `in_progress` → `resolved`
- `open` → `resolved` (shortcut for simple tickets)

**Priority levels:** `critical`, `high`, `medium` (default), `low`

## Error Handling

| Scenario | Action |
|----------|--------|
| Z MCP connection fails | Fall back to reading `plans/tickets.md` for last-known state; log the failure |
| Comment query returns empty | Normal — no new comments; ticket stays as-is |
| Ticket not found (deleted) | Remove from `plans/tickets.md`; record deletion in `memory.md` |
| Assignee profile lookup fails | Use the profile ID constants above; do not interrupt the flow |
| Rate limit or timeout | Report to user; do not retry more than once |
