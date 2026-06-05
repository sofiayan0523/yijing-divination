---
name: harness-execution
description: >
  SOP for the execution phase of a two-layer agentic harness. Executor
  runs tasks from an approved plans.md while Evaluator scores and
  supervises. Supports Z App integration. Trigger on "harness execution",
  "harness 執行", or "執行階段".
---

# Harness Execution Phase

## Language Rule (CRITICAL)
Mirror the user's language exactly. If the user writes in English,
all execution artifacts, scoring, and responses MUST be in English.
If the user writes in 繁體中文, everything MUST be in 繁體中文.
Detect language from the user's LATEST message each turn.

## Prerequisites
Before starting execution:
1. Verify `.omni/harness/plans.md` exists and has `# APPROVED` header
2. Verify `.omni/harness/goal.md` exists with scoring criteria
3. If either is missing, inform the user to complete harness-plan first

## Phase 0: Setup

### Step 1 — Write SOP to memory.md
Append the following to `.omni/memory.md` under `## Harness Execution`:

```
## Harness Execution

In this conversation, the AI agent operates in two roles on a daily cycle:
- **Executor (任務執行員)**: Executes tasks based on plans.md,
  maintains todo.md, records progress in execution-diary.md
  (active during scheduled execution + main loop)
- **Evaluator (任務審查員/Supervisor)**: Scores execution against
  goal.md criteria, provides supervision via execution-suggestions.md,
  performs web searches, brainstorms new approaches when blocked
  (active during daily scoring schedule)

Goal: [copy from goal.md]
Scoring: 5 criteria, max 5 points (see .omni/harness/goal.md)
Artifacts directory: .omni/harness/
```

### Step 2 — Configure Daily Report Destination

Ask the user where daily execution reports should be delivered.

**If Z integration is available** (z-sync, z-report-status skills and
Z MCP tools are accessible):

1. Ask the user which Z entity type to use for the harness tracking
   record: **decision** (minutes) or **idea**
2. Create a Z record to serve as the report destination:

```
z_insert(
  table="minutes",   # use "minutes" for decision, "ideas" for idea
  data={
    "title": "[Harness] <goal title from goal.md>",
    "tags": ["harness"],
    "description": "<brief harness objective summary from goal.md>"
  }
)
```

3. Record the entity type and record ID in `.omni/harness/config.md`:

```
# Harness Configuration

## Daily Report Destination
- Z Entity Type: <minutes|ideas>
- Z Record ID: <uuid returned by z_insert>
- Z Record Link: https://zwork.one/?<entity_type>=<uuid>
```

The `[Harness]` title prefix and `harness` tag make these records
easy to filter and identify in Z App.

**If Z integration is NOT available:**
- Reports are written to `.omni/harness/execution-diary.md` only
- Write to `.omni/harness/config.md`:

```
# Harness Configuration

## Daily Report Destination
- Target: local (execution-diary.md only)
```

### Step 3 — Configure Assignee & Mentions

Ask the user to confirm:

1. **Primary assignee** for agent tickets created during execution
   (this person receives ticket notifications and is responsible for
   resolving blockers)

**If Z integration is available**, also ask:

2. **Daily report @mentions** — which users should be @mentioned in
   Z daily reports (triggers push notifications). Suggest including
   the primary assignee by default.

Query the Z workspace profile list if needed:
```
z_query(table="profiles", select="id, display_name, email")
```

Append to `.omni/harness/config.md`:

```
## Agent Ticket Assignee
- Primary Assignee: <name> (<email>)
- Profile ID: <profile_uuid>

## Daily Report Mentions (Z App)
- @<Name1> (<email1>)
- @<Name2> (<email2>)
```

These values are referenced by:
- The Executor when creating tickets (`assignee_id`)
- The `z-report-status` SOP when composing daily reports (`@mentions`)

### Step 4 — Initialize todo.md
Read `.omni/harness/plans.md` and create an initial task breakdown
in `.omni/harness/todo.md`:

```
# Task List

Generated from plans.md on [date]

## Phase 1: [phase name]
- [ ] Task 1.1: [description]
- [ ] Task 1.2: [description]

## Phase 2: [phase name]
- [ ] Task 2.1: [description]
...
```

## Phase 1: Execution Cycles

### Daily Cycle Structure
Set up the following schedule (adjust times to avoid peak hours):

| Step | Schedule | Role | Action |
|------|----------|------|--------|
| 1 | Daily AM | Executor | Summarize last 24h into execution-diary.md |
| 1.1 | +10min | System | Verify summary written |
| 2 | +30min | Evaluator | Score execution + write execution-suggestions.md |
| 2.1 | +10min | System | Verify scoring written |
| 3 | +30min | Executor | Read suggestions, create new tasks in todo.md |
| 4 | Every 2-4h | Executor | Execute pending tasks from todo.md |

### Executor SOP

**Daily Summary (Step 1):**
1. Check current date/time
2. Read `.omni/harness/execution-diary.md` (previous entries)
3. Summarize all execution activities of the last 24 hours
4. Append to `.omni/harness/execution-diary.md`:

```
## [Date] - Day [N] Execution Summary

### Completed Tasks
- [task]: [result/outcome]

### In-Progress Tasks
- [task]: [current status, % complete]

### Blockers
- [blocker]: [impact, attempted resolution]

### Metrics
- [KPI 1]: [current value] (target: [target])
- [KPI 2]: [current value] (target: [target])

### Cost Tracking
- Today's spend: [amount]
- Cumulative spend: [amount] / [budget]
```

**Task Execution (Step 4 — Main Loop):**
1. Read `.omni/harness/todo.md` for pending tasks
2. Read `.omni/harness/tickets.md` — check if blockers are resolved
3. Re-verify: can I truly not resolve ticket items myself?
4. If tasks exist and no blocking tickets → execute and mark done
5. Skip if: no pending tasks OR unresolved blocking tickets

### Evaluator SOP

**Scoring (Step 2):**
1. Re-read `.omni/harness/goal.md` — refresh objective and criteria
2. Read `.omni/harness/plans.md` — verify alignment
3. Read `.omni/harness/execution-diary.md` — assess progress
4. Score using the 5 criteria from goal.md (0 or 1 point each)
5. Write to `.omni/harness/execution-suggestions.md`:

```
## [Date] - Evaluation Report

### Score: [X]/5

| # | Criterion | Score | Assessment |
|---|-----------|-------|------------|
| 1 | [name]    | 0/1   | [detail]   |
| 2 | [name]    | 0/1   | [detail]   |
| 3 | [name]    | 0/1   | [detail]   |
| 4 | [name]    | 0/1   | [detail]   |
| 5 | [name]    | 0/1   | [detail]   |

### Detailed Feedback
[For each deducted point, provide:]
- Problem identified
- Evidence/data supporting the assessment
- Specific actionable suggestion

### Web Research Findings
[At least 1 web search per evaluation cycle]
- [finding 1]: [relevance to execution]

### Over-Optimism Check
[Flag any areas where executor may be too optimistic]

### Strategic Recommendations
[If execution is struggling, provide:]
- Alternative approaches
- New resources or tools to consider
- Revised timeline suggestions
```

**Supervisor Role (CRITICAL):**
The Evaluator is NOT limited to reviewing documents. The Evaluator acts
as a **Supervisor** who:
- Re-examines plans.md and goal.md when execution stalls
- Brainstorms alternative approaches
- Performs web searches for industry benchmarks, tools, competitors
- Monitors for over-optimism in the executor's reports
- Suggests plan revisions when the current approach clearly fails
- Provides strategic direction, not just numerical scoring

### Blocker Management

When the executor encounters a task requiring human intervention:

1. Write to `.omni/harness/tickets.md`:

```
## Ticket [N]: [Title]
- **Status**: Open
- **Created**: [date]
- **Blocker Type**: [human-resource / access / decision / external]
- **Description**: [what is needed]
- **Impact**: [what is blocked]
- **Attempted Resolution**: [what was tried]
```

2. Before each execution cycle, re-verify tickets:
   - Can I actually resolve this myself? (Re-attempt if possible)
   - Has the human resolved it? (Check and update status)

## Z App Integration

### Prerequisite Check
At the start of execution, check if Z integration is available:
- Look for z-sync, z-ticket-check, z-agent-ticket-creation skills
- Check if Z MCP tools (z_query, z_insert, etc.) are accessible

### If Z Integration is Available

**Ticket Management:**
- Use the `z-agent-ticket-creation` skill SOP to create tickets
  in Z App instead of (or in addition to) local tickets.md
- Use the primary assignee from `.omni/harness/config.md` as the
  default `assignee_id` when creating tickets
- Use the `z-ticket-check` skill SOP to check ticket status
- Do NOT invent your own ticket format — follow the Z skill SOPs

**Status Reporting:**
- When writing to execution-diary.md, also use the
  `z-report-status` skill SOP to post a progress report to Z App
- Post reports as comments on the Z record specified in
  `.omni/harness/config.md` (Daily Report Destination section)
- Include `@mentions` for all users listed in the config.md
  Daily Report Mentions section
- Include: score, completed tasks, blockers, next steps

### If Z Integration is NOT Available
- Use local `.omni/harness/tickets.md` only
- Status reports are written only to execution-diary.md

## Execution Loop Template

Suggest this schedule/loop set to the user.

IMPORTANT: Before suggesting schedules, detect the user's timezone from
conversation context (e.g. prior messages, calendar info, or ask the
user). Replace `{timezone}` with the detected IANA timezone. Pick a
start hour that avoids the user's peak working hours and distributes
load (e.g. 7am, 9am, 11am, 2pm).

```
/schedule "0 {H} * * 1-5" tz={timezone}: [Executor] Summarize last 24h
execution into .omni/harness/execution-diary.md. Include metrics,
completed tasks, blockers, and cost tracking.
All responses must mirror the user's language.

/schedule "10 {H} * * 1-5" tz={timezone}: Verify that the executor's
daily summary has been written to .omni/harness/execution-diary.md.
If already done, skip this cycle.

/schedule "30 {H} * * 1-5" tz={timezone}: [Evaluator] Re-read the goal
in .omni/harness/goal.md. Score execution results in execution-diary.md
against the 5 criteria. Write feedback to execution-suggestions.md.
Perform at least 1 web search. Check for over-optimism. Act as
supervisor if execution stalls.
All responses must mirror the user's language.

/schedule "40 {H} * * 1-5" tz={timezone}: Verify that the evaluator's
scoring and suggestions have been written to execution-suggestions.md.
If already done, skip this cycle.

/schedule "50 {H} * * 1-5" tz={timezone}: [Z Report] If Z integration
is configured in .omni/harness/config.md, use the z-report-status skill
SOP to post a daily progress report as a comment on the Z record
specified in config.md. Include @mentions from config.md. Skip if Z is
not configured or if no new execution activity since last report.
All responses must mirror the user's language.

/schedule "0 {H+1} * * 1-5" tz={timezone}: [Executor] Re-read goal.md
and plans.md. Review execution-diary.md for current status. Read
execution-suggestions.md for evaluator feedback. Create/update task
list in .omni/harness/todo.md. Do NOT execute tasks yet. If human
resources needed, add to tickets.md.
All responses must mirror the user's language.

/loop every {interval}m x{count}: [Executor] Main execution loop.
1. Check todo.md for pending tasks
2. Re-verify tickets.md blockers — can I resolve them myself?
3. Execute tasks and mark done
Skip if: no tasks OR blocking tickets unresolved.
All responses must mirror the user's language.
```

## Execution Loop Interval Guide
Based on task type, suggest appropriate main loop interval:
- Code/development tasks: every 120m x18
- Marketing/campaign tasks: every 240m x18
- Research/analysis tasks: every 180m x12
- Monitoring/maintenance tasks: every 360m x12

## Phase Transition: Plan → Execution
When plans.md is APPROVED, clearly tell the user:
1. Planning phase is complete
2. The approved plan is at `.omni/harness/plans.md`
3. Recommend the appropriate next skill based on goal type:
   - **harness-execution** — general execution (marketing, operations,
     research, monitoring). Uses daily Executor + Evaluator cycle with
     schedule-based scoring.
   - **harness-dev** — software development. Uses Developer + Reviewer +
     QA Tester roles with state-machine loops and model delegation.
4. The next phase will use the same goal.md and scoring criteria

## File Structure

```
.omni/harness/
├── config.md                  # Report destination, assignee, mentions (Phase 0)
├── goal.md                    # Objective + scoring criteria (from planning)
├── plans.md                   # Approved plan (from planning, APPROVED header)
├── plan-suggestions.md        # Reviewer feedback (Plan phase only)
├── todo.md                    # Task list (Executor maintains)
├── execution-diary.md         # Daily execution log (Executor writes)
├── execution-suggestions.md   # Evaluation + feedback (Evaluator writes)
└── tickets.md                 # Human-dependent blockers (Executor writes)
```
