---
name: harness-plan
description: >
  SOP for the planning phase of a two-layer agentic harness. Alternates
  Planner and Plan Reviewer roles to produce a scored, approved plans.md.
  Trigger on "harness plan", "harness 規劃", or "規劃階段".
---

# Harness Planning Phase

## Language Rule (CRITICAL)
Mirror the user's language exactly. If the user writes in English,
all planning artifacts, scoring, and responses MUST be in English.
If the user writes in 繁體中文, everything MUST be in 繁體中文.
Detect language from the user's LATEST message each turn.

## Overview
You are operating in the PLANNING phase of a two-layer agentic harness.
In this phase, two roles alternate:
- **Planner (規劃員)**: Proposes and refines plans
- **Plan Reviewer (規劃審查員)**: Evaluates plans against goal and scoring criteria

All artifacts are stored in `.omni/harness/`.

## Phase 0: Goal Validation

### Step 1 — Receive and Validate Goal
When the user provides a goal, evaluate it for:
1. **Clarity**: Is the objective specific and unambiguous?
2. **Measurability**: Are there quantifiable success metrics?
3. **Timeline**: Is there a defined completion timeframe?
4. **Feasibility**: Is the scope realistic for the available resources?

If ANY of these criteria are unclear or missing, act as the
**Plan Reviewer** and ask the user for clarification.
Provide specific suggestions for improvement.

Example of an unclear goal:
> "Make our marketing better"

Suggested improvement:
> "Achieve 500 new paid signups via Google Ads within 14 days,
> with a CAC under $15 USD"

### Step 2 — Write goal.md
Once the goal passes validation, write it to `.omni/harness/goal.md`:

```
# Goal

## Objective
[Clear, measurable objective]

## Success Metrics
[Quantifiable KPIs]

## Timeline
[Start date — End date]

## Constraints
[Budget, resources, dependencies]

## Context
[Background information, market context]
```

### Step 3 — Define Scoring Criteria
Collaborate with the user to define 5 scoring criteria (max 5 points).
Each criterion MUST directly map to the goal's success metrics.

Write to `.omni/harness/goal.md` (append):

```
## Scoring Criteria (Max 5 Points)

| # | Criterion | Description | Weight |
|---|-----------|-------------|--------|
| 1 | [name]    | [detail]    | 1 pt   |
| 2 | [name]    | [detail]    | 1 pt   |
| 3 | [name]    | [detail]    | 1 pt   |
| 4 | [name]    | [detail]    | 1 pt   |
| 5 | [name]    | [detail]    | 1 pt   |
```

## Phase 1: Planning Loops

### Step 4 — Write SOP to memory.md
Before starting loops, append the following to `.omni/memory.md`
under a `## Harness Planning` section:

```
## Harness Planning

In this conversation, the AI agent alternates between two roles:
- **Planner (規劃員)**: Proposes/refines plans based on goal.md
  (active on EVEN loop numbers: 0, 2, 4, ...)
- **Plan Reviewer (規劃審查員)**: Scores plans against criteria in goal.md,
  identifies over-optimistic assumptions, performs web searches for validation
  (active on ODD loop numbers: 1, 3, 5, ...)

Goal: [copy from goal.md]
Scoring: 5 criteria, max 5 points (see .omni/harness/goal.md)
Artifacts directory: .omni/harness/
```

### Step 5 — Determine Loop Count and Interval
Based on goal complexity, set loop count and interval:
- Simple goal (single deliverable, clear path): 6-8 loops, every 90m
- Medium goal (multiple components, some uncertainty): 10-14 loops, every 120m
- Complex goal (cross-functional, high uncertainty): 16-20 loops, every 120m

### Step 6 — Write First Draft of plans.md
Before starting the loop, the Planner writes the FIRST version of
`.omni/harness/plans.md` based on goal.md. This ensures loop 0
(Planner) already has a revision target rather than starting from zero.

### Step 7 — Start Planning Loop
Propose the loop command for the user to execute:

```
/loop every {interval}m x{count}: For each loop, record the loop number
(starting from 0, increment by 1). If (loop number % 2)==0, you are the
Planner; if (loop number % 2)==1, you are the Plan Reviewer.
Read .omni/harness/goal.md for the objective and scoring criteria.

PLANNER role: Read plan-suggestions.md (if exists) for reviewer feedback.
Propose or refine the plan in .omni/harness/plans.md. The plan must include:
- Phased approach with clear milestones
- Resource allocation and timeline
- Risk assessment and mitigation strategies
- Specific, actionable tasks
- KPI targets matching the scoring criteria

PLAN REVIEWER role: Read .omni/harness/plans.md and score each section
against the 5 criteria in goal.md. For each deducted point, provide:
- Specific reason for deduction
- Concrete suggestion for improvement
- Evidence from web search (perform at least 1 search per review)
Write results to .omni/harness/plan-suggestions.md.
Flag any over-optimistic assumptions or unrealistic timelines.

When plans.md scores 5/5 from the reviewer, write APPROVED at the top
of plans.md with the final score and date.

All responses must mirror the user's language.
```

### Step 8 — Loop Execution Rules

**When loop number is EVEN (Planner role):**
1. Read `.omni/harness/goal.md` — refresh objective
2. Read `.omni/harness/plan-suggestions.md` — if exists, address ALL feedback
3. Write/update `.omni/harness/plans.md` with improved plan
4. Include specific responses to each reviewer comment

**When loop number is ODD (Plan Reviewer role):**
1. Read `.omni/harness/goal.md` — ground in objective and criteria
2. Read `.omni/harness/plans.md` — evaluate current plan
3. Score each criterion (0 or 1 point, total max 5)
4. Perform at least ONE web search to validate assumptions
5. Check for over-optimistic projections, missing dependencies, unclear steps
6. Write detailed feedback to `.omni/harness/plan-suggestions.md`

**Completion Condition:**
When plans.md achieves 5/5 score:
1. Add `# APPROVED` header with date and final score to plans.md
2. Inform the user that planning phase is complete
3. Suggest the user proceed to execution phase with harness-execution skill

## File Structure

```
.omni/harness/
├── goal.md              # Objective + scoring criteria (set once)
├── plans.md             # The evolving plan (Planner writes, Reviewer scores)
└── plan-suggestions.md  # Reviewer feedback (Reviewer writes, Planner reads)
```
