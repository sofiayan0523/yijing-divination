---
name: z-agent-ticket-creation
description: >
  SOP for executor agents to create agent tickets when hitting blockers
  they cannot resolve independently. Covers ticket creation with full
  provenance, progress updates, resolution, and re-creation when
  prematurely resolved. Invoke when a blocker is identified during
  executor cycles, loops, or scheduled tasks.
---

# Z Agent Ticket Creation — Executor SOP

## When to Use

- **Blocker identified**: You hit a problem you cannot resolve autonomously
  (missing credentials, ambiguous requirements, permission denied, external
  dependency, need human judgment)
- **Escalation needed**: A task exceeds your capability or authority
- **Decision required**: Multiple valid approaches exist and a human must choose
- **Review requested**: You completed significant work and want human review
  before proceeding

## Prerequisite — Confirm You Cannot Self-Resolve

Before creating a ticket, verify:

1. You have re-read the relevant plan files (`plans/todo.md`,
   `plans/tickets.md`, `.omni/memory.md`)
2. You have checked existing open tickets to avoid duplicates
3. You have attempted at least one alternative approach
4. The blocker genuinely requires human input — not just a retry

If the issue is transient (network timeout, rate limit), retry once before
escalating.

## Step A — Gather Provenance Context

Every ticket must include clear provenance so any human reader knows where
it came from and what the agent is doing.

### A1. Origin Information

The system prompt includes **CONVERSATION CONTEXT** with space name and
conversation title. Use these values directly:

```
Space: <space_name> (ID: <space_id>)
Conversation: <conversation_title> (ID: <conversation_id>)
```

If CONVERSATION CONTEXT is not available in the system prompt, state
"Origin: unknown (provenance not injected)".

### A2. Execution Plan Summary

Read the current execution plan from workspace files:

```
# Check for plan files in this order:
plans/todo.md          # Current task list with status markers
plans/tickets.md       # Existing ticket tracking
.omni/memory.md        # Key discoveries and context
```

Extract:
- The overall goal / mission of the current executor cycle
- Recently completed items (last 3-5)
- Current in-progress item(s)
- The specific step where the blocker occurred

### A3. Next Execution Time

Query active loops and schedules to determine when the executor will
run next:

```
mcp__numbers__loop_list()
mcp__numbers__schedule_list()
```

Extract `next_run_at` from the active loop or schedule. If no active
schedule exists, state "No active schedule — manual trigger only".

## Step B — Create the Ticket

### B1. Deduplication Check

**ALWAYS** query open tickets before inserting — even if you created
a ticket moments ago. Skipping this causes duplicates:

```
z_query(
  table="agent_tickets",
  filters={"status": "open"},
  select="id, title, tags, description"
)
```

If a matching ticket exists, post a comment on it instead of creating
a new one (see Step C).

### B2. Insert the Ticket

```
z_insert(
  table="agent_tickets",
  data={
    "title": "<concise blocker description>",
    "ticket_type": "<question|task|approval_needed|escalation|review_request>",
    "priority": "<critical|high|medium|low>",
    "status": "open",
    "description": "<structured description — see template below>",
    "tags": ["executor", "<relevant-domain-tag>"],
    "agent_context": {
      "agent_name": "<your agent display name>",
      "space_name": "<space_name>",
      "conversation_id": "<conversation_id>",
      "conversation_title": "<conversation_title>",
      "blocker_step": "<which plan step hit the blocker>",
      "attempted_actions": ["<what you tried>"],
      "needed_info": "<what you need from the human>",
      "next_executor_run": "<next_run_at from loop_list>"
    }
  }
)
```

**CRITICAL**: `agent_context` MUST be a populated JSON object with ALL
fields above — never a plain string, never an empty `{}`. An empty or
string-valued `agent_context` is a bug. Fill every field.

### B3. Description Template

Use this structure for the `description` field:

```markdown
## Origin
- **Space**: <space_name> (ID: `<space_id>`)
- **Conversation**: <conversation_title> (ID: `<conversation_id>`)

## Current Execution Plan
<3-5 bullet summary of what the executor is working on>

## Blocker
<Clear description of what is blocked and why>

## What I Tried
<List of approaches attempted before escalating>

## What I Need
<Specific ask — decision, credential, approval, information, etc.>

## Next Executor Run
<next_run_at from loop/schedule, or "No active schedule">
```

### B4. Review Artifact Handoff

If the ticket asks a human to review or confirm a file, follow
**z-writing-rules** Rule 4 (No Local File Paths / Artifact Handoff).
Never leave only a workspace filename — Z users cannot open them.

Quick reference:
- Repo file → GitHub PR or branch file link
- Small non-repo (< 8K chars) → paste directly in comment
- Long non-repo → Google Doc link (follow GWS confirmation rules)
- Always redact secrets before publishing

### B5. Local Tracking

After creating the ticket, update local tracking files:

```
# Append to plans/tickets.md
| <short_id> | <title> | <type> | <priority> | open | <timestamp> |

# Update plans/todo.md — mark the blocked step
[!] <step description> — blocked on ticket <short_id>
```

## Step C — Progress Updates on Open Tickets

During each executor cycle, if a ticket you created is still `open` or
`in_progress`, post a progress update comment. This is coordinated with
the `z-ticket-check` skill (Step D in that skill).

### C1. Check Before Posting

- Read the ticket's latest comment
- If the most recent comment is your own progress update with no new
  information since then, **skip** to avoid noise

### C2. Post Progress Comment

```
z_insert(
  table="comments",
  data={
    "entity_type": "agent_ticket",
    "entity_id": "<ticket_id>",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>",
    "content": "@<assignee_name> **Progress Update**\n\n<what changed>\n\n**Status**: <status>\n**Next scheduled check**: <next_run_at>"
  }
)
```

## Step D — Resolving Tickets

When you determine that a blocker has been resolved (human provided the
needed information, credentials were added, decision was made), mark the
ticket as resolved:

### D1. Verify Resolution

Before marking resolved, confirm:
- The information / action you needed has been provided
- You can proceed with the blocked step without further human input
- Read all comments on the ticket to ensure nothing was missed

### D2. Post Resolution Comment and Update Status

```
z_insert(
  table="comments",
  data={
    "entity_type": "agent_ticket",
    "entity_id": "<ticket_id>",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>",
    "content": "@<assignee_name> **Resolved** — <brief explanation>"
  }
)

z_update(
  table="agent_tickets",
  record_id="<ticket_id>",
  data={"status": "resolved"}
)
```

### D3. Update Local Files

```
# Update plans/tickets.md — change status to resolved
# Update plans/todo.md — change [!] marker to [ ] or [x]
# Update .omni/memory.md — record the resolution under Key Discoveries
```

## Step E — Re-Creating Tickets After Premature Resolution

If you discover that a ticket was marked as `resolved` (by a human or
by a previous executor cycle) but the underlying blocker still exists,
you must create a **new** ticket.

### E1. Detection

During the normal ticket check (z-ticket-check skill), if you find:
- A recently resolved ticket whose blocker is NOT actually cleared
- A closed ticket but the same issue persists
- New information reveals the original resolution was insufficient

### E2. Create Follow-Up Ticket

Create a new ticket (do NOT reopen the old one) with:

```
z_insert(
  table="agent_tickets",
  data={
    "title": "[Follow-up] <original title> — still blocked",
    "ticket_type": "<same as original or updated>",
    "priority": "<same or escalated>",
    "status": "open",
    "description": "<B template + Previous Ticket (ID, Resolution, Why Still Blocked)>",
    "tags": ["executor", "follow-up", "<domain-tag>"],
    "agent_context": {
      "previous_ticket_id": "<original_ticket_id>",
      "reason_reopened": "<why the original resolution was insufficient>",
      "space_name": "<space_name>",
      "conversation_title": "<conversation_title>",
      "conversation_id": "<conversation_id>"
    }
  }
)
```

### E3. Comment on the Original Ticket

Post a brief cross-reference on the resolved ticket (this is the only
allowed comment on resolved tickets):

```
z_insert(
  table="comments",
  data={
    "entity_type": "agent_ticket",
    "entity_id": "<original_ticket_id>",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>",
    "content": "@<assignee_name> Blocker persists — follow-up: [<title>](https://zwork.one/?agent_ticket=<new_uuid>)"
  }
)
```

## Ticket Type Selection Guide

| Scenario | ticket_type | Priority |
|----------|-------------|----------|
| Choose between options | `question` | medium |
| Missing credentials/access | `escalation` | high |
| Human external action | `task` | medium |
| Work ready for review | `review_request` | medium |
| Approval before destructive action | `approval_needed` | high |
| Capability limit reached | `escalation` | high |

## Reference Data

Profile IDs, emails, and @Name mappings: see **z-writing-rules** skill.

## Error Handling

| Scenario | Action |
|----------|--------|
| Z MCP connection fails | Log the blocker locally in `plans/tickets.md`; retry on next cycle |
| Duplicate ticket detected | Post comment on existing ticket instead of creating new one |
| Cannot determine next_run_at | Use "No active schedule — manual trigger only" |
| CONVERSATION CONTEXT missing | Use space_id / conversation_id from system prompt instead |
| Ticket creation fails | Report to user; record blocker in `.omni/memory.md` |
