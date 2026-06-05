---
name: harness-dev
description: >
  SOP for the software development phase of a two-layer agentic harness.
  Developer implements code phase-by-phase while Reviewer provides separated
  code review (context reset between loops) and QA Tester validates with
  agent browser. Supports Z App integration for blockers.
  Trigger on "harness dev", "harness 開發", or "開發階段".
---

# Harness Development Phase

## Language Rule (CRITICAL)
Mirror the user's language exactly. If the user writes in English,
all development artifacts, reviews, and responses MUST be in English.
If the user writes in 繁體中文, everything MUST be in 繁體中文.
Detect language from the user's LATEST message each turn.

## Prerequisites
Before starting development:
1. Verify `.omni/harness/plans.md` exists and has `# APPROVED` header
   (If the user wrote plans.md manually without using harness-plan,
   ask them to confirm readiness — then add `# APPROVED` yourself)
2. Read `.omni/harness/goal.md` if it exists — note the scoring criteria
   defined there. These will be used as the starting point for Step 4.
3. If plans.md is missing, inform the user to create a plan first
   (via harness-plan or manually writing `.omni/harness/plans.md`)

## Three Roles

| Role | Accepted Model(s) | Responsibility |
|------|-------------------|---------------|
| **Developer (開發員)** | `claude-sonnet-4-6` or `gpt-5.5` | Implements code, commits, deploys, fixes bugs |
| **Reviewer (審查員)** | `claude-opus-4-8` | Code review with context reset (separate loop), architecture checks |
| **QA Tester (測試員)** | `gpt-5.5` | Agent browser functional & UI testing, writes qa.md |

**Model Assignment Rationale:**
- Developer: Sonnet (fast, cost-efficient) or GPT-5.5 (broad tool-use). The
  model is set by the `/loop model=...` command — do not mix models mid-loop.
- Reviewer uses Opus (stronger reasoning for architecture & quality judgement).
- QA Tester uses GPT-5.5 (strong vision + browser interaction capabilities).

**CRITICAL: Separation Principle**
The Reviewer MUST operate in a SEPARATE loop from the Developer.
This forces a context reset between implementation and evaluation,
preventing self-evaluation bias (models tend to praise their own work).

**CRITICAL: Model Isolation**
Each role MUST run with its designated model. The main loop runs as
Developer (the model specified in the `/loop` command). When a Review
or QA phase is needed, the Developer MUST create a **one-iteration
sub-loop** using the `loop_create` MCP tool with the appropriate model.
This ensures:
1. True context reset (fresh agent session)
2. The right model for the right task
3. Clear visibility in the Ops panel (each sub-loop shows its model badge)

**CRITICAL: No Concurrent Sub-loops**
NEVER create a Reviewer or QA sub-loop while the Developer iteration is
still in progress. Wait for the Developer to commit its phase output
(`dev-diary.md` entry with `Implemented Phase N`) BEFORE creating the
Reviewer sub-loop. Same rule for QA — wait until a PR URL or deploy-log
entry exists before delegating.

## Phase 0: Project Setup

### Step 1 — Write SOP to memory.md
Detect the Developer model from the current loop's `model=` parameter
(visible in the loop prompt or config). Record it to `.omni/harness/config.md`
under `## Developer Model` and append the SOP to `.omni/memory.md`:

```
## Harness Dev

In this conversation, the AI agent operates as a state machine with three roles:
- **Developer (開發員)** → <this loop's model>: Implements code phase-by-phase, deploys, fixes bugs
- **Reviewer (審查員)** → claude-opus-4-8: Code reviews in separate sub-loops (context reset)
- **QA Tester (測試員)** → gpt-5.5: Agent browser testing, writes qa.md

Model delegation: main loop = Developer (<this loop's model>).
Review/QA = one-shot sub-loops with respective models.
State is tracked via dev-plan.md phase statuses and dev-diary.md last entry.
Artifacts directory: .omni/harness/
```

### Step 2 — Configure Assignee & Z Tracking

Ask the user to confirm:

1. **Primary assignee** for blocker tickets created during development
   (this person is pinged when the agent cannot proceed independently)

**If Z integration is available** (z-sync, z-agent-ticket-creation skills
and Z MCP tools accessible), also ask:

2. **Z tracking record** — create a Z record (decision or idea) to
   serve as the project status hub:

```
z_insert(
  table="minutes",   # use "minutes" for decision, "ideas" for idea
  data={
    "title": "[Harness] <project title from plans.md>",
    "tags": ["harness"],
    "description": "<brief project summary from plans.md>"
  }
)
```

3. **Report @mentions** — which users should be @mentioned when the
   agent posts progress updates to the Z record.

Write configuration to `.omni/harness/config.md`:

```
# Harness Configuration

## Daily Report Destination
- Z Entity Type: <minutes|ideas>
- Z Record ID: <uuid returned by z_insert>
- Z Record Link: https://zwork.one/?<entity_type>=<uuid>

## Agent Ticket Assignee
- Primary Assignee: <name> (<email>)
- Profile ID: <profile_uuid>

## Daily Report Mentions (Z App)
- @<Name1> (<email1>)
- @<Name2> (<email2>)
```

**If Z integration is NOT available:**
- Write to `.omni/harness/config.md`:

```
# Harness Configuration

## Agent Ticket Assignee
- Primary Assignee: <name>
- Note: Z not connected; tickets tracked in local tickets.md only
```

### Step 3 — Confirm Deploy Mode (CRITICAL)

Ask the user which deployment model applies to this project:

| Mode | When to use |
|------|-------------|
| `agent` | Agent has credentials and permission to deploy directly (e.g. `firebase deploy`, `wrangler pages deploy`) |
| `ci-on-merge` | Agent creates PRs; CI/CD pipeline deploys on merge (e.g. GitHub Actions, Vercel auto-deploy) |
| `manual` | Agent writes code only; a human handles all deployment |

Write the confirmed mode to `.omni/harness/config.md` under `## Deploy Mode`:

```
## Deploy Mode
- Mode: <agent | ci-on-merge | manual>
- Production URL: <the URL end-users will access, or "N/A" for libraries/CLI tools>
- Preview URL: <Vercel preview, Netlify deploy preview, or "N/A">
- CI Workflow: <path to deploy workflow, e.g. .github/workflows/deploy.yml, or "N/A">
```

This mode determines how Infrastructure Gate, Reviewer, QA, and Scoring
Criteria behave downstream. If the user is unsure, default to `ci-on-merge`
(safest — agent never touches production directly).

### Step 4 — Define Scoring Criteria (CRITICAL)

Before any implementation begins, propose **5 scoring criteria** (max 5 points,
1 point each) tailored to this specific project. These criteria will be used by
the Reviewer to evaluate every phase and by QA Tester for final validation.

**Process:**
1. If `.omni/harness/goal.md` exists (from harness-plan), read its
   `## Scoring Criteria` section and use it as the starting point —
   adapt the criteria for software development context (e.g. replace
   marketing KPIs with code-quality dimensions) while preserving the
   user's original intent
2. Analyse `plans.md` and the project context (tech stack, deploy target,
   user-facing vs backend, existing codebase conventions)
3. Draft 5 criteria that cover the most important quality dimensions for
   THIS project — do NOT use a generic checklist
4. Present the criteria to the user and ask for confirmation or adjustment
5. Only proceed to implementation after the user approves the criteria

**Mandatory Delivery Criterion (5th point):**
The 5th criterion MUST cover delivery readiness, adapted to the deploy mode:

| Deploy Mode | Required 5th Criterion |
|------------|------------------------|
| `agent` | **Production reachable** — Production URL resolves, returns expected content, deploy succeeds |
| `ci-on-merge` | **CI pipeline green** — PR passes all CI checks; preview deploy functional if available |
| `manual` | **Deliverable complete** — PR opened with clear deploy instructions, infra dependencies documented |

This ensures "code works on my machine" is never the final bar.

**Example** (web app, deploy mode = `ci-on-merge`):

| # | Criterion | Description | Points |
|---|-----------|-------------|--------|
| 1 | UI completeness | All pages render correctly with complete information | 1 |
| 2 | Responsive layout | Desktop and mobile display without layout issues | 1 |
| 3 | No regression | Login and existing app features unaffected | 1 |
| 4 | Core feature works | The primary new feature functions end-to-end | 1 |
| 5 | CI pipeline green | PR passes CI checks; preview deploy accessible and functional | 1 |

Write the approved criteria to the top of `.omni/harness/dev-plan.md` under
`## Scoring Criteria`.

### Step 5 — Create dev-plan.md
Read `.omni/harness/plans.md` and create `.omni/harness/dev-plan.md`:

```markdown
# Development Plan

Generated from plans.md on [date]

## Scoring Criteria (Max 5 Points)

| # | Criterion | Description | Points |
|---|-----------|-------------|--------|
| 1 | [name] | [detail] | 1 |
| 2 | [name] | [detail] | 1 |
| 3 | [name] | [detail] | 1 |
| 4 | [name] | [detail] | 1 |
| 5 | [delivery criterion per deploy mode] | [detail] | 1 |

Approved by user on [date].

## Project Config
- Deploy mode: [agent | ci-on-merge | manual]
- Deploy target: [Firebase / GCP / Vercel / Cloudflare Pages / etc.]
- Production URL: [the URL end-users will access, or "N/A"]
- Preview URL: [Vercel preview / Netlify deploy preview / "N/A"]
- CI workflow: [path to deploy workflow, or "N/A"]
- Test strategy: [agent browser + test bypass method]
- Test credentials: [describe how agent can authenticate without human SSO]
- Repository: [repo name and branch strategy]

### Infrastructure Dependencies

List ALL external prerequisites that must be satisfied before the
deliverable can go live. Track status as each is verified.

| # | Dependency | Required Before | Status | Verified By |
|---|-----------|----------------|--------|-------------|
| 1 | [e.g. Cloudflare Pages project created] | deploy | PENDING | [role] |
| 2 | [e.g. GH secret CLOUDFLARE_API_TOKEN set] | deploy | PENDING | [role] |
| 3 | [e.g. DNS record for app.example.com] | deploy | PENDING | [role] |
| 4 | [e.g. Backend CORS allows new origin] | deploy | PENDING | [role] |

**Gate rules by deploy mode:**
- `agent` mode: ALL items must be VERIFIED before Agent runs deploy commands
- `ci-on-merge` mode: ALL items must be VERIFIED before PR is marked ready-to-merge
- `manual` mode: Agent lists PENDING items and creates a blocker ticket for the human deployer

If there are no external dependencies (e.g. pure library, no deploy step),
write "None" and skip the gate check.

## Phase 1: [name]
### Sprint Contract
- **What will be built**: [specific deliverables]
- **Acceptance criteria**:
  - [ ] [testable behavior 1]
  - [ ] [testable behavior 2]
- **Estimated loops**: [1-2]
- **Status**: PENDING

## Phase 2: [name]
### Sprint Contract
...

## Phase N: [name]
...
```

### Step 6 — Determine Loop Count
Based on project complexity and number of phases:

| Scale | Total loops | Interval | Distribution |
|-------|------------|----------|--------------|
| Small (1-2 phases) | 12-16 | 30m | plan:2, impl:4-6, deploy:1, QA:2-3, fix:3-4 |
| Medium (3-5 phases) | 20-28 | 30m | plan:3, impl:8-14, deploy:1, QA:3, fix:4-6 |
| Large (6+ phases) | 30-40 | 45-60m | plan:3, impl:14-22, deploy:1, QA:4-6, fix:6-8 |

Note: Implementation uses 2 loops per phase (1 implement + 1 review).
Failed reviews add extra loops.

## State Machine Logic

Each loop, determine your role by reading state:

```
1. Read dev-plan.md → find first phase with status != COMPLETED
2. Read dev-diary.md → check last entry's action and result
3. Read review-notes.md → check if pending review feedback exists

DECISION TREE:
├─ dev-plan.md not finalized (no sprint contracts)
│  └→ Developer: refine dev-plan.md
├─ Phase N status == "PENDING" or "IN PROGRESS"
│  ├─ dev-diary last shows "implemented phase N" with no review yet
│  │  └→ DELEGATE to Reviewer (claude-opus-4-8) via sub-loop
│  ├─ review-notes.md shows FAIL for phase N
│  │  └→ Developer: fix review issues, re-implement
│  └─ otherwise
│     └→ Developer: implement phase N
├─ All phases COMPLETED, not yet delivered
│  ├─ dev-plan.md Infrastructure Dependencies has PENDING items
│  │  └→ Developer: create blocker ticket for each PENDING item, WAIT
│  ├─ Deploy mode == "agent" (all deps VERIFIED)
│  │  └→ Developer: deploy to target
│  ├─ Deploy mode == "ci-on-merge" (all deps VERIFIED)
│  │  └→ Developer: open/update PR, mark ready for review
│  └─ Deploy mode == "manual" (all deps VERIFIED or ticketed)
│     └→ Developer: open PR with deploy instructions
├─ Delivered (deployed / PR merged / PR ready), qa.md not yet created
│  ├─ QA-able surface exists (frontend / public API / reachable URL)
│  │  └→ DELEGATE to QA Tester (gpt-5.5) via sub-loop
│  └─ No QA-able surface (backend-only / library / infra / docs-only)
│     └→ Write `## QA Skipped` to qa.md with reason, mark DONE
├─ qa.md has OPEN issues
│  └→ Developer: fix issues + redeploy
├─ qa.md has FIXED items needing VERIFICATION
│  └→ DELEGATE to QA Tester (gpt-5.5) via sub-loop
├─ qa.md all items CLOSED
│  └→ Mark project DONE in dev-diary.md
├─ Project DONE (`# DONE` header exists in dev-diary.md)
│  └→ Emit `LOOP_DONE: need_verify` and stop. Do NOT re-poll PR/CI.
```

### Loop Termination

Once `# DONE` appears in dev-diary.md, the loop MUST end:

- The Developer iteration that writes `# DONE` MUST also output
  `LOOP_DONE: need_verify` on its own line. This triggers the loop
  scheduler's two-step verification stop.
- Iterations that only re-read PR/CI status without producing any file
  changes, commits, or PR comments are wasteful — if the only remaining
  work is human-side (review, merge, deploy), write `# DONE` with the
  PR URL, create a ticket for the human assignee, and exit.
- The agent does NOT block the loop waiting for human actions.

## Model Delegation Protocol

When the state machine requires a role change (Reviewer or QA Tester),
the Developer MUST delegate via `loop_create` MCP tool:

### Delegating to Reviewer (claude-opus-4-8)

```
Use loop_create with:
  prompt: "[harness-dev Reviewer] Code review Phase {N}.
    Read .omni/harness/dev-plan.md Phase {N} sprint contract.
    Read the source code changes (git diff or relevant files).
    Write review to .omni/harness/review-notes.md using the Reviewer SOP format.
    Verdict: PASS or FAIL. If PASS, update dev-plan.md phase status to COMPLETED."
  model: "claude-opus-4-8"
  interval_seconds: 60
  max_iterations: 1
```

Manual slash-command equivalent when the user asks for copy/paste loop commands:

```text
/loop every 1m x1 model=claude-opus-4-8: [harness-dev Reviewer] Code review Phase {N}. Read .omni/harness/dev-plan.md Phase {N}, inspect git diff/relevant files, write .omni/harness/review-notes.md, and return PASS or FAIL.
```

### Delegating to QA Tester (gpt-5.5)

```
Use loop_create with:
  prompt: "[harness-dev QA] Test the deployed application.
    Read .omni/harness/dev-plan.md for test URL and auth method.
    Use agent browser to perform functional + UI tests.
    Write findings to .omni/harness/qa.md using the QA Tester SOP format.
    Test both desktop (1920x1080) and mobile (390x844) viewports."
  model: "gpt-5.5"
  interval_seconds: 60
  max_iterations: 1
```

Manual slash-command equivalent when the user asks for copy/paste loop commands:

```text
/loop every 1m x1 model=gpt-5.5: [harness-dev QA] Test the deployed application. Read .omni/harness/dev-plan.md for URL/auth, use agent browser for functional and UI checks, and write .omni/harness/qa.md.
```

Do not create a QA Tester sub-loop without `model=gpt-5.5`. If GPT-5.5 is not
available for the Space or Corporate, create a Z App agent ticket instead of
silently falling back to Developer/Sonnet.

### After Delegation

After creating a sub-loop, the Developer loop should:
1. Log the delegation in `dev-diary.md` with model and purpose
2. In the NEXT iteration, check whether `review-notes.md` or `qa.md`
   has been updated (indicating the sub-loop completed)
3. If not yet updated, wait (log "Awaiting review/QA sub-loop completion")

### Ops Panel Visibility

Each sub-loop appears as a separate entry in the Corporate Dashboard
Loops Overview Panel with its model badge clearly shown:
- Main loop: Developer model (from config.md)
- Review sub-loops: `claude-opus-4-8` (Reviewer)
- QA sub-loops: `gpt-5.5` (QA Tester)

This provides clear audit trail of which model performed which task.

## Phase 1: Plan Refinement (Developer role)

### Developer SOP — Refine dev-plan.md
1. Read `.omni/harness/plans.md` for the full project plan
2. Break the plan into implementation phases (3-7 phases typical)
3. For each phase, write a **Sprint Contract**:
   - What will be built (specific files, features, endpoints)
   - Acceptance criteria (testable behaviors, not vague goals)
   - Dependencies on previous phases
4. Define deploy target and test strategy
5. CRITICAL: Include a test authentication bypass so the agent can
   test without human SSO credentials (e.g., test token, mock auth,
   Firebase emulator, etc.)
6. Write to `.omni/harness/dev-plan.md`

## Phase 2: Implementation (Developer + Reviewer roles)

### Developer SOP — Implement Phase N
1. Read `.omni/harness/dev-plan.md` → find current phase
2. Read `.omni/harness/review-notes.md` → if FAIL exists, fix those issues
3. Implement the code for this phase
4. Run available tests/linting locally
5. Commit with a meaningful message
6. Update phase status in `dev-plan.md` to `IN REVIEW`
7. Append to `.omni/harness/dev-diary.md` (use the actual Developer model
   from `config.md → ## Developer Model`, not a hardcoded model name):

```markdown
## [Date] Loop [N] — Developer (<model>): Implemented Phase [K]

### Changes
- [file]: [what was added/modified]

### Self-Check (pre-review)
- [ ] Code compiles/runs without errors
- [ ] No hardcoded secrets or credentials
- [ ] Error handling present for external calls
- [ ] Acceptance criteria addressed

### Next
Awaiting Reviewer code review (next loop).
```

### Reviewer SOP — Code Review Phase N (SEPARATE LOOP)
The Reviewer operates with a fresh context. It:

1. Read `.omni/harness/dev-plan.md` → understand what phase N should deliver
   AND read the **Scoring Criteria** section at the top of dev-plan.md
2. Read the actual source code changes (use git diff or read modified files)
3. Score against the project-specific 5-point criteria from dev-plan.md
4. Write to `.omni/harness/review-notes.md`:

```markdown
## Review: Phase [N] — [date] — Reviewer (claude-opus-4-8)

### Score: [X] / 5

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | [criterion from dev-plan.md] | 0 or 1 | [evidence] |
| 2 | [criterion from dev-plan.md] | 0 or 1 | [evidence] |
| 3 | [criterion from dev-plan.md] | 0 or 1 | [evidence] |
| 4 | [criterion from dev-plan.md] | 0 or 1 | [evidence] |
| 5 | [criterion from dev-plan.md] | 0 or 1 | [evidence] |

### Verdict: PASS (5/5) / FAIL ([X]/5)

### Blocking Issues (must fix before PASS)
1. [file:line] — [specific problem and how to fix]

### Non-Blocking Suggestions
1. [improvement idea — can be addressed later]
```

**PASS requires 5/5.** For each point not scored, provide a specific
blocking issue with file path and concrete fix instruction.

**CRITICAL: Deployment-Affecting Changes Rule**
When the phase modifies ANY of the following, extra verification is required:
- CI/CD workflows, deploy scripts, or build configuration
- Deploy target, hosting platform, or domain settings
- Environment variables or secrets references
- CORS, allowed origins, or authentication providers

The Reviewer MUST verify based on deploy mode (from config.md):
- `agent` mode: deploy credentials accessible, target platform exists, production URL will work
- `ci-on-merge` mode: CI workflow valid, required secrets documented in Infrastructure Dependencies
- `manual` mode: deploy instructions clear and complete, infra dependencies listed

Do NOT accept "the code logic is correct" as sufficient when deployment
configuration has changed. Score the delivery criterion as 0 if deployment
readiness cannot be confirmed from available evidence.

5. If PASS:
   - Update phase status in `dev-plan.md` to `COMPLETED`
   - Clear review-notes.md blocking issues
6. If FAIL:
   - Phase remains `IN REVIEW`
   - Developer must address blocking issues in next loop

## Phase 3: Deployment (Developer role)

### Developer SOP — Deploy
1. Read `.omni/harness/dev-plan.md` → get deploy target config
2. Execute deployment commands (firebase deploy, gcloud run deploy, etc.)
3. Verify deployment health (curl endpoints, check logs)
4. Append to `.omni/harness/deploy-log.md`:

```markdown
## Deployment — [date]

### Target
- Platform: [Firebase / GCP / etc.]
- URL: [deployed URL]
- Branch/Commit: [git ref]

### Steps Executed
1. [command] → [result]

### Verification
- Health check: [PASS/FAIL]
- Basic smoke test: [PASS/FAIL]

### Issues
- [any deployment issues encountered]
```

## Phase 4: QA Testing (QA Tester role)

### QA Tester SOP — Functional & UI Testing

**Test Strategy Selection:**
- If test credentials / bypass auth exists → MUST use agent browser
  for at least one full functional test pass
- If project is pure backend/CLI → use automated test scripts
- If both frontend and backend exist → agent browser for UI +
  curl/scripts for API

**CRITICAL: Test Environment Rule**
The QA Tester MUST test against the environment matching the deploy mode
in `config.md` → `Deploy Mode`:

| Deploy Mode | Required Test Target | Acceptable Fallback |
|------------|---------------------|-------------------|
| `agent` | Production URL | NONE — unreachable = BLOCKING OPEN |
| `ci-on-merge` | Preview URL (if available) | Local dev server ONLY IF no preview exists, with explicit note |
| `manual` | Local dev server | N/A — local IS the expected target |

Rules:
1. `agent` mode: if the Production URL is unreachable, record it as a
   critical BLOCKING issue and mark the QA cycle as INCOMPLETE.
   Do NOT fall back to localhost. Do NOT mark items as CLOSED based
   on a different environment.
2. `ci-on-merge` mode: if a preview URL exists but is unreachable,
   it is also BLOCKING. If NO preview mechanism exists, testing on
   local dev server is acceptable BUT the QA report MUST state:
   "No preview deploy available. Tested on local dev server. Production
   behavior may differ. Recommend verifying after merge."
3. `manual` mode: local dev server is the expected target.

**Using Agent Browser:**
1. Read `.omni/harness/dev-plan.md` → get test URL, auth method,
   AND the **Scoring Criteria** section
2. Navigate to deployed URL using MCP browser tools
3. Authenticate using the test bypass method
4. Test each acceptance criterion from all phases
5. Validate each of the 5 scoring criteria end-to-end
6. Test responsive design (desktop + mobile viewport)
7. Write findings to `.omni/harness/qa.md`:

```markdown
# QA Report — QA Tester (gpt-5.5)

Generated on [date]
Test URL: [URL]
Auth method: [test bypass description]

## Functional Tests

| # | Test Case | Steps | Expected | Actual | Status |
|---|-----------|-------|----------|--------|--------|
| 1 | [feature] | [steps taken] | [expected result] | [actual result] | PASS/FAIL |

## UI Tests — Desktop (1920x1080)

| # | Page/Component | Issue | Severity | Status |
|---|----------------|-------|----------|--------|
| 1 | [page name] | [description or "OK"] | minor/major/critical | OPEN/CLOSED |

## UI Tests — Mobile (390x844)

| # | Page/Component | Issue | Severity | Status |
|---|----------------|-------|----------|--------|
| 1 | [page name] | [description or "OK"] | minor/major/critical | OPEN/CLOSED |

## Scoring Criteria Validation

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | [from dev-plan.md] | 0 or 1 | [what was tested and observed] |
| 2 | [from dev-plan.md] | 0 or 1 | [what was tested and observed] |
| 3 | [from dev-plan.md] | 0 or 1 | [what was tested and observed] |
| 4 | [from dev-plan.md] | 0 or 1 | [what was tested and observed] |
| 5 | [from dev-plan.md] | 0 or 1 | [what was tested and observed] |

**QA Score: [X] / 5**

## Open Issues Summary
- [ ] BUG-001: [title] — [severity] — OPEN
- [ ] BUG-002: [title] — [severity] — OPEN
```

## Phase 5: Bug Fix Cycle (Developer + QA Tester alternating)

### Developer SOP — Fix Bugs
1. Read `.omni/harness/qa.md` → gather all OPEN issues
2. Fix each issue in code
3. Commit fixes
4. Redeploy (same process as Phase 3)
5. Update qa.md issue status to `FIXED` (not CLOSED — QA verifies)
6. Append to dev-diary.md

### QA Tester SOP — Verify Fixes
1. Read `.omni/harness/qa.md` → find items marked `FIXED`
2. Re-test each fixed item using agent browser
3. If fixed correctly → update status to `CLOSED`
4. If NOT fixed → update status back to `OPEN` with new notes
5. Check for regression (re-run critical functional tests)

**Completion Condition:**
When ALL items in qa.md are `CLOSED`:
1. Add `# DONE` header to dev-diary.md with completion date
2. Inform the user that development is complete
3. Provide final summary: phases completed, bugs fixed, deploy URL

## Blocker Management

### Ticket Creation
When the Developer or QA Tester encounters an unresolvable issue:

**If Z App integration is available:**
- Use the `z-agent-ticket-creation` skill SOP to create a ticket
- Use the primary assignee from `.omni/harness/config.md` as `assignee_id`
- Leave a comment pinging the @mentions listed in config.md
- Record ticket reference in `.omni/harness/tickets.md`

**If Z App is NOT available:**
- Write to `.omni/harness/tickets.md`:

```markdown
## Ticket [N]: [Title]
- **Status**: Open
- **Created**: [date]
- **Blocker Type**: [credentials / access / decision / external-service / human-resource]
- **Description**: [what is needed and why]
- **Impact**: [which phase/task is blocked]
- **Attempted Resolution**: [what was tried]
- **Assigned to**: [person/team]
```

### Pre-Loop Ticket Check
At the start of each loop:
1. Read `.omni/harness/tickets.md`
2. Re-verify: can this be resolved without human help?
3. If YES → resolve it and continue
4. If NO → skip blocked tasks, work on non-blocked items

## Loop Template

Suggest this loop command to the user (main loop runs as Developer):

```
/loop every {interval}m x{count} model=<developer-model>: [harness-dev] Software development loop.

Read .omni/harness/config.md, .omni/harness/dev-plan.md, and
.omni/harness/dev-diary.md to determine current state via the state machine:
0. If dev-diary.md has a `# DONE` header → emit `LOOP_DONE: need_verify`, stop
1. If dev-plan.md not finalized → Developer (this model): refine plan
2. If phase just implemented → DELEGATE: create sub-loop with model=claude-opus-4-8
   for Reviewer (only ONE sub-loop at a time; wait for review-notes.md)
3. If review FAIL → Developer (this model): fix issues
4. If review PASS + more phases → Developer (this model): implement next phase
5. If all phases done, not delivered → check Infrastructure Dependencies gate
   5a. If PENDING infra deps → create blocker ticket, WAIT
   5b. If agent mode → Developer (this model): deploy to target
   5c. If ci-on-merge mode → Developer (this model): open/update PR
   5d. If manual mode → Developer (this model): open PR with deploy instructions
6. If delivered, needs testing → check for QA-able surface
   6a. If QA-able surface exists → DELEGATE: create sub-loop model=gpt-5.5 for QA
   6b. If NO QA-able surface (backend-only / library / infra / docs)
       → write `## QA Skipped` to qa.md, add `# DONE` to dev-diary.md,
         emit `LOOP_DONE: need_verify`, STOP
7. If qa.md has OPEN issues → Developer (this model): fix + redeploy/update
8. If qa.md has FIXED items → DELEGATE: create sub-loop model=gpt-5.5 for QA verify
9. If qa.md all CLOSED → add `# DONE` to dev-diary.md, emit
   `LOOP_DONE: need_verify`, STOP

DELEGATE means: use loop_create MCP tool with max_iterations=1 and the
specified model. Never create a sub-loop concurrently with an active
Developer iteration — wait for the diary entry first.

If a Reviewer sub-loop fails to produce review-notes.md two iterations in a
row (e.g. auth error), either: (a) create a Z agent ticket for the human to
fix Reviewer credentials, or (b) self-review with an explicit caveat in
review-notes.md.

If blocked, create ticket via Z MCP (assign to relevant people).
All responses must mirror the user's language.
```

### Model Visibility Summary

| Where | What's Shown |
|-------|-------------|
| **config.md** → `## Developer Model` | The Developer model, auto-detected from the loop command |
| **dev-diary.md** | Each entry header includes role + actual model name |
| **review-notes.md** | Review header includes `Reviewer (claude-opus-4-8)` |
| **qa.md** | Report header includes `QA Tester (gpt-5.5)` |
| **Ops Panel (Loops Overview)** | Each loop/sub-loop shows model badge |
| **Corporate Dashboard** | All loops visible with model, creator, status |
| **Loop Runs history** | Each iteration shows which model executed it |

## File Structure

```
.omni/harness/
├── config.md            # Developer model, deploy mode, assignee, daily report destination & mentions (Phase 0)
├── goal.md              # Objective + scoring criteria (from harness-plan, optional)
├── plans.md             # Project plan (required — source of truth for dev-plan)
├── dev-plan.md          # Technical implementation plan with sprint contracts
├── dev-diary.md         # Development log (all roles append, includes model name)
├── review-notes.md      # Code review results (Reviewer/claude-opus-4-8 writes)
├── deploy-log.md        # Deployment records
├── qa.md                # QA findings (QA Tester/gpt-5.5 writes)
└── tickets.md           # Blocker tickets for human intervention
```
