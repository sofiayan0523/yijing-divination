---
name: doc-coauthoring
description: >-
  Guide users through a structured workflow for co-authoring documentation.
  Use when user wants to write documentation, proposals, technical specs,
  decision docs, or similar structured content. This workflow helps users
  efficiently transfer context, refine content through iteration, and verify
  the doc works for readers.
---

# Doc Co-Authoring Workflow

This skill provides a structured workflow for guiding users through
collaborative document creation. Act as an active guide, walking users through
three stages: Context Gathering, Refinement & Structure, and Reader Testing.

## When to Offer This Workflow

**Trigger conditions:**
- User mentions writing documentation: "write a doc", "draft a proposal", "create a spec"
- User mentions specific doc types: "PRD", "design doc", "decision doc", "RFC"
- User seems to be starting a substantial writing task

**Initial offer:**
Offer the user a structured workflow for co-authoring the document. Explain the three stages:

1. **Context Gathering**: User provides all relevant context while the agent asks clarifying questions
2. **Refinement & Structure**: Iteratively build each section through brainstorming and editing
3. **Reader Testing**: Test the doc with a fresh agent (no context) to catch blind spots

If user declines, work freeform. If user accepts, proceed to Stage 1.

## Stage 1: Context Gathering

**Goal:** Close the gap between what the user knows and what the agent knows.

### Initial Questions

Start by asking the user for meta-context:
1. What type of document is this? (e.g., technical spec, decision doc, proposal)
2. Who's the primary audience?
3. What's the desired impact when someone reads this?
4. Is there a template or specific format to follow?
5. Any other constraints or context to know?

### Info Dumping

Once initial questions are answered, encourage the user to dump all context:
- Background on the project/problem
- Related team discussions or shared documents
- Why alternative solutions aren't being used
- Organizational context (team dynamics, past incidents)
- Timeline pressures or constraints
- Technical architecture or dependencies

Advise them not to worry about organizing it -- just get it all out.

**During context gathering:**
- Track what's being learned and what's still unclear
- Ask clarifying questions (5-10 numbered questions) once initial dump is done
- Let user answer in shorthand or link to more docs

**Exit condition:** Sufficient context gathered when edge cases and trade-offs
can be discussed without needing basics explained.

## Stage 2: Refinement & Structure

**Goal:** Build the document section by section through brainstorming, curation,
and iterative refinement.

For each section:
1. Ask clarifying questions about what to include
2. Brainstorm 5-20 options depending on complexity
3. User indicates what to keep/remove/combine
4. Draft the section
5. Refine through surgical edits (use `str_replace`, never reprint whole doc)

Start with whichever section has the most unknowns.

**Section workflow:**
- **Brainstorming**: Generate numbered options. Offer to brainstorm more.
- **Curation**: Ask which points to keep/remove/combine with brief justifications.
- **Gap Check**: Ask if anything important is missing.
- **Drafting**: Write the section content.
- **Iteration**: Make edits based on feedback. Continue until user is satisfied.

### Quality Checking

After 3 consecutive iterations with no substantial changes, ask if anything can
be removed without losing important information.

### Near Completion

When 80%+ sections done:
1. Re-read entire document
2. Check for flow, consistency, redundancy, contradictions
3. Verify every sentence carries weight
4. Provide feedback

## Stage 3: Reader Testing

**Goal:** Test the document with a fresh agent (no context bleed) to verify
it works for readers.

### If sub-agents are available (e.g., in Claude Code):
1. Predict 5-10 reader questions
2. Test each with a fresh sub-agent instance
3. Run additional checks (ambiguity, false assumptions, contradictions)
4. Report and fix any issues found
5. Loop back to refinement for problematic sections

### If no sub-agents:
1. Predict reader questions
2. Instruct user to open a fresh conversation and test with those questions
3. Ask what the fresh agent got wrong or struggled with
4. Fix those gaps

### Exit Condition

When the reader agent consistently answers questions correctly and doesn't
surface new gaps, the doc is ready.

## Final Review

1. Recommend the user do a final read-through themselves
2. Suggest double-checking facts, links, and technical details
3. Ask if they want one more review or if the work is done

## Tips for Effective Guidance

- Be direct and procedural
- Handle deviations gracefully (offer to skip stages or adjust)
- Address context gaps as they come up, don't let them accumulate
- Use `str_replace` for all edits, never reprint whole documents
- Quality over speed -- each iteration should make meaningful improvements
