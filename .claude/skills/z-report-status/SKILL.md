---
name: z-report-status
description: >
  SOP for posting structured progress reports to a designated Z App
  record comment. Gathers agent ticket status, suggestion file findings,
  and execution context before composing a concise formatted update.
  Invoke at the end of supervisor/executor cycles, during scheduled
  loops, or when a user requests a status report.
---

# Z Status Report — Progress Update SOP

Post a structured progress report as a comment on a specified Z App
record. The report summarizes agent ticket status, supervisor/executor
findings, and key action items for human stakeholders.

## When to Use

- **End of supervisor/executor cycle**: Summarize outcomes and next steps
- **Scheduled loop / cron**: Periodic progress updates to stakeholders
- **User request**: When a user asks to report status or post an update

## Step A — Determine Report Target and Recipients

### A1. Identify Target Entity

The report is posted as a comment on a Z record. Determine the target
from the loop/cron prompt, user instruction, or conversation context:

```
entity_type: "<post|project|agent_ticket|minutes|...>"
entity_id: "<uuid>"
```

If not specified, ask the user which Z record should receive the report.
Verify the entity exists before composing:
```
z_get(table="<entity_type>", record_id="<entity_id>")
```

### A2. Identify Recipients

Collect stakeholder emails for the report header. Sources:
1. Explicitly listed in the prompt (e.g. `@tammy@numbersprotocol.io`)
2. Assignees or authors of the target entity
3. Authors of recent agent ticket comments

Also resolve each email to their workspace `@Name` for push
notification triggers (see Comment Rules).

## Step B — Gather Agent Ticket Data

Query current ticket state across all active statuses:

```
z_query(table="agent_tickets", filters={"status": "open"},
        select="id, title, status, priority, assignee_id, updated_at")
z_query(table="agent_tickets", filters={"status": "in_progress"},
        select="id, title, status, priority, assignee_id, updated_at")
z_query(table="agent_tickets", filters={"status": "resolved"},
        select="id, title, status, priority, assignee_id, updated_at",
        order="updated_at.desc", limit=10)
```

For each open/in_progress ticket, query comments to identify:
- Tickets with unprocessed human replies (human commented, agent
  has not responded)
- Stale tickets (no activity > 48 h)

Group results by status for the report.

## Step C — Check Suggestion Files

Search the workspace for supervisor/executor output:

```
glob("**/*suggestion*.md")
glob("**/*suggestions*.md")
```

If found, parse for:
- Error counts and descriptions
- Improvement recommendations
- Priority ordering for the next executor cycle
- Deadline warnings

**Important**: Never reference local filenames in the Z comment
(Z-side users cannot open them). Summarize findings inline. If
the full content is useful for human review, follow the Artifact
Handoff rules: GitHub link for repo files, paste small content
directly, or Google Doc for long non-repo artifacts.

## Step D — Compose the Report

### D1. Template

Copy the template below **verbatim** — keep every `### ` heading prefix
and every Chinese section name exactly as shown. Do NOT replace `###`
headings with `**bold**`. Do NOT translate section names to English.

```markdown
進度更新日期 -- Y<YYYY>-<MM>-<DD> <HH>:<mm> (<Day>) <@recipient_emails>

### 特別注意事項

<max 150 chars — urgent items, deadline warnings, or "本次執行無特殊注意事項">

### 執行摘要

<max 150 chars — one-paragraph summary of cycle outcomes and status>

### Z Agent Ticket 巡查結果

* <N> 張 resolved（<who responded>）：<titles>
* <N> 張 in_progress：<titles>
* <N> 張 open：<titles>

<one-line note if unprocessed human replies or stale tickets exist>

### 監督員發現問題

* <bullet list — issues, deadline warnings, suggestions summary>
```

**CRITICAL**: The four section headings must be literal `### ` (h3)
markdown — never `**bold**`. The names must stay in Chinese:
`### 特別注意事項`, `### 執行摘要`, `### Z Agent Ticket 巡查結果`,
`### 監督員發現問題`. Any deviation breaks Z App rendering.

### D2. Section Rules

- **特別注意事項**: ≤ 150 characters. Highlight only P0 / deadline
  items. Use "本次執行無特殊注意事項" when nothing urgent.
- **執行摘要**: ≤ 150 characters. Summarize what was done this cycle
  and the overall status. Trim with "…" if over limit.
- **Z Agent Ticket 巡查結果**: Group by status. If resolved tickets
  have unprocessed human replies, flag as next-cycle priority.
- **監督員發現問題**: Summarize suggestion file findings inline
  (e.g. "監督員建議已完成：1 錯誤 + 3 改善 + 3 建議"). Omit section
  entirely if no suggestion files exist and no issues found.

### D3. Date Format

Use the current UTC+8 timestamp:
`Y2026-05-13 02:04 (Wed)` — include day-of-week abbreviation.

### D4. Ticket References

When mentioning specific tickets, use markdown links:
`[<title>](https://zwork.one/?agent_ticket=<uuid>)`

Never use raw UUIDs or local short IDs without links.

## Step E — Post the Report

```
z_insert(
  table="comments",
  data={
    "entity_type": "<target_entity_type>",
    "entity_id": "<target_entity_id>",
    "commented_by_id": "b90f38a1-86d7-4e3f-92e3-7faff798ef29",
    "commented_by_name": "<agent display name>",
    "content": "<composed report>"
  }
)
```

## Comment & Writing Rules

Follow **z-writing-rules** skill for all formatting: markdown headings,
@Name mentions, entity links, artifact handoff, and resolved-entity guard.

## Reference Data

Profile IDs, emails, and @Name mappings: see **z-writing-rules** skill.

## Error Handling

| Scenario | Action |
|----------|--------|
| Target entity not found | Ask user to specify entity_type and entity_id |
| Z MCP connection fails | Output report to conversation only; log failure |
| No agent tickets found | Report "目前無 Agent Ticket" in ticket section |
| No suggestion files found | Omit 監督員發現問題 section or note "無監督員建議" |
| Character limit exceeded | Trim to most critical content, append "…" |
