---
name: z-sync
description: >
  Domain knowledge for Z App data synchronization. Use the MCP tools
  z_get_config, z_query, z_get, z_insert, z_update, z_delete, z_log,
  z_request_approval, z_assign_confirmation_reviewers, and
  z_assign_approval_reviewers to interact with Z App. Do NOT invoke
  autonomously — only when explicitly requested.
---

# Z App Data Sync

Read and write structured data to/from Z App.
Z App serves as the structured output database — data written here is visible
to the organization with full audit trails, approval workflows, and entity
management UI.

## How to Interact with Z

Use the MCP tools to interact with Z App. Do NOT use curl.

| MCP Tool | Action | Description |
|----------|--------|-------------|
| `z_get_config` | get_workspace_config | Get workspace config (modules, workflows, labels) |
| `z_query` | query | Query records with filters, select, order, limit |
| `z_get` | get | Get a single record by ID |
| `z_insert` | insert | Insert a new record |
| `z_update` | update | Update an existing record |
| `z_delete` | delete | Delete (soft-delete) a record |
| `z_log` | log | Log an event with level, message, metadata |
| `z_request_approval` | request_approval | Submit entity for human approval |
| `z_assign_confirmation_reviewers` | assign_confirmation_reviewers | Assign confirmation reviewers to an entity |
| `z_assign_approval_reviewers` | assign_approval_reviewers | Assign an approval reviewer to an entity |

## Workspace Context — Call z_get_config First

Before performing operations on Z App, call `z_get_config` to understand the
workspace setup. The returned configuration includes:

- **features**: Which modules are enabled (tasks, CRM, finance, etc.)
- **approvalWorkflow**: Approval rules for payments, deals, and other entities
- **entityCustomization**: Custom labels and fields for each entity type
- **finance**: Currency, tax settings, payment categories
- **instructions**: Workspace-level instructions and conventions
- **ai**: AI behavior settings and preferences

Use this context to:
1. Only operate on modules the workspace has enabled
2. Respect approval workflows when creating records
3. Use custom entity labels in responses (e.g. if "tasks" are renamed to "tickets")
4. Apply correct finance settings (currency, categories)
5. Follow workspace-specific instructions

## Entity Type Aliases

Z App has entity type aliases where the DB/approval system may use a
different name than the frontend. The MCP tools **auto-normalize** these:

| Input | Canonical | Notes |
|-------|-----------|-------|
| `decision` | `minutes` | Meeting minutes / decisions |
| `ticket` | `issue` | Issue tracking |

You can use either name — the tools will normalize to the canonical form
before sending to the gateway. This ensures consistency in DB records
and notification routing.

## Approval Workflow

Z App has a multi-stage approval workflow for certain entity types. Check
the workspace config (`z_get_config`) to see which entities require approval.

**Entity types that commonly require approval:**
- payments, posts, releases, minutes (also known as "decision")

**Workflow after inserting an approval-required entity:**
1. Insert the record via `z_insert` (record is created in draft state)
2. Assign confirmation reviewers via `z_assign_confirmation_reviewers`
3. Assign an approval reviewer via `z_assign_approval_reviewers`
4. Optionally call `z_request_approval` to submit for review
5. Reviewers confirm/approve in Z App's UI

**Confirmation vs Approval:**
- **Confirmation** (first stage): Multiple reviewers verify the content.
  Use `z_assign_confirmation_reviewers` with an array of profile UUIDs.
  Query `entity_confirmation_reviewers` to check confirmation status.
- **Approval** (final stage): A single reviewer approves or rejects.
  Use `z_assign_approval_reviewers` (only the first reviewer_id is used).
  Query `entity_approvals` to check approval status.

**Finding reviewer profile IDs:**
- Use `z_query` on `profiles` or `workspace_members` to find profile UUIDs
- Match by name, email, or role

**Approval status flow:**
```
draft → pending_confirmation → pending_approval → approved
```

**Querying approval status:**
- Use `z_query` on `entity_approvals` table to check approval status
- Use `z_query` on `entity_confirmation_reviewers` to check confirmations
- Use `z_query` on `approval_rules` table to see workspace approval rules

**Important:**
- Do NOT set `status` to "approved" directly — always use the approval workflow
- Updating an approved entity may require re-approval
- `entity_approvals` records are immutable (cannot be deleted)

## Agent Tickets — Requesting Human Action

Use `agent_tickets` when you need a human to take action that you cannot
perform yourself. This is your primary mechanism for human-in-the-loop
collaboration.

**When to create an Agent Ticket:**
- You need human approval for something (ticket_type: `approval_needed`)
- You need to assign a task to a human (ticket_type: `task`)
- You need a human decision or input (ticket_type: `question`)
- You hit a capability limit and need handoff (ticket_type: `escalation`)
- You want a human to review your work (ticket_type: `review_request`)

**DO NOT confuse with Issue Reports:**
- `agent_tickets` = Agent requests human action (agent-created)
- `issue_reports` = Human reports bugs/features about Z App (human-created)
- Never use `z_insert(table="issue_reports")` when you need human action

**Creating a ticket:**
```
z_insert(table="agent_tickets", data={
  "title": "Review Q2 budget projections",
  "ticket_type": "review_request",
  "priority": "high",
  "description": "I've compiled the Q2 projections based on...",
  "assignee_id": "<profile_uuid>",
  "agent_context": {
    "attempted_actions": ["Compiled data from payments table"],
    "needed_info": "Human judgment on assumptions"
  }
})
```

**Checking ticket status:**
```
z_query(table="agent_tickets", filters={"status": "open"})
```

**Status flow:** open → in_progress → blocked → resolved → closed
- Humans update status via Z App UI
- Agent can query status but should NOT change status fields

**Priority levels:** critical, high, medium (default), low

## Readable Tables (Query-Only)

In addition to writable tables, the following tables are available for
reading via `z_query` and `z_get`:

| Table | Description |
|-------|-------------|
| audit_log | Audit trail of all changes |
| profiles | User profiles in the workspace |
| workspace_members | Workspace membership |
| accounts | Financial accounts |
| subjects | Subject/topic categorization |
| approval_rules | Configured approval rules |
| entity_approvals | Approval status for entities |
| entity_confirmation_reviewers | Confirmation reviewer assignments |
| agent_tickets | Agent-created tickets (query status, check resolution) |

## When to Write to Z — Explicit Only

Only write structured data to Z when explicitly requested. Examples of
explicit triggers:

1. **User explicitly requests it**: The user says something like "write this
   to Z", "sync to Z", "save to Z App", or similar direct instructions.
2. **Scheduled task (Loop/Cron)**: A `/loop` or cron job prompt explicitly
   instructs Z writes (e.g., "search latest trends and write to Z posts").
3. **Skill invocation**: The user or system explicitly calls this skill.

When triggered, write these types of structured data:

- **Entity records**: payments, tasks, leads, contacts, deals, partners,
  projects, goals, ideas, posts, releases, minutes
- **Comments/annotations**: observations, analysis notes, or follow-up items
  tied to an existing entity
- **Meeting minutes or decisions**: structured records of decisions made

Do NOT write to Z for:
- Casual conversation or clarification
- Intermediate reasoning steps
- Data the user says should not be persisted

## Deduplication — CRITICAL

Before inserting a new entity, ALWAYS use `z_query` first to check if a
similar record already exists. If a matching record exists, use `z_update`
instead of `z_insert`.

## Comments & Writing

Follow **z-writing-rules** for formatting, including Rule 8 (Comment
Authorship): always include `commented_by_id` and `commented_by_name`
when inserting comments.

## Image Attachments in Comments

Z App comments may include image attachments via two fields:

- `image_url` — a single image URL (string, may be null)
- `image_urls` — an array of image URLs (JSON array, may be empty)

When reading comments with `z_query` or `z_get`:

1. **Check for images**: If `image_url` is non-null or `image_urls` is
   non-empty, the comment has attached images.
2. **View images**: Download the image locally with
   `curl -sL "<url>" -o /tmp/z_image.jpg`, then use the Read tool on
   the local file to see its contents (Claude is multimodal).
3. **Mention images in replies**: When responding to a comment that has
   images, acknowledge the image(s) in your reply so the author knows
   their attachments were reviewed.
4. **Image-only comments**: Some comments may have empty `content` but
   a valid `image_url` — treat these as image messages, not blank ones.

## Image Attachments in Comments

Z App comments may include image attachments via two fields:

- `image_url` — a single image URL (string, may be null)
- `image_urls` — an array of image URLs (JSON array, may be empty)

When reading comments with `z_query` or `z_get`:

1. **Check for images**: If `image_url` is non-null or `image_urls` is
   non-empty, the comment has attached images.
2. **View images**: Download the image locally with
   `curl -sL "<url>" -o /tmp/z_image.jpg`, then use the Read tool on
   the local file to see its contents (Claude is multimodal).
3. **Mention images in replies**: When responding to a comment that has
   images, acknowledge the image(s) in your reply so the author knows
   their attachments were reviewed.
4. **Image-only comments**: Some comments may have empty `content` but
   a valid `image_url` — treat these as image messages, not blank ones.

## Soft-Delete Behavior

Delete uses soft-delete for archivable tables (partners, projects, goals,
ideas, releases, contacts, deals, agent_tickets) via `is_archived=true`.
Other tables use hard-delete with audit log preservation.

## Writable Tables

| Table | Required Fields | Notes |
|-------|----------------|-------|
| payments | amount, description | Financial records |
| tasks | title | Task tracking |
| leads | name | CRM leads |
| contacts | name | CRM contacts |
| deals | name | CRM deals |
| partners | name | Partner organizations |
| projects | name | Project management |
| goals | title | OKR / goal tracking |
| ideas | title | Brainstorming / ideation |
| posts | title, content | Content / announcements |
| releases | version | Release tracking |
| minutes | title, content | Meeting minutes |
| comments | entity_type, entity_id, content | Annotations on any entity |
| chat_messages | content | Chat messages |
| agent_tickets | title, ticket_type | Agent-created tickets for human action (NOT bug reports) |

## Error Handling

- If Z returns an error, report it to the user but continue the conversation
- If Z is unreachable (timeout), gracefully skip the write and inform the user:
  "Note: Could not sync to Z App (service unavailable). The data was not persisted."
- Never retry more than once on timeout
- Always inform the user what was written to Z (briefly, e.g. "Synced payment record to Z")

## Audit Compliance (TAEA)

Every write to Z is automatically logged in both Z's audit system and
Omni's z_sync_log table:
- **Transparent**: The agent identifies itself via the API key
- **Auditable**: All changes are tracked with agent_profile_id and timestamps
- **Explainable**: Include meaningful descriptions in records and comments
