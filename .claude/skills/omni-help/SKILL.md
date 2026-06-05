---
name: omni-help
description: Answer questions about Omni App features, settings, and workflows.
---

# Omni Help

Help users understand Omni App features, settings, and workflows.

## When to Use

- When a user asks about an Omni feature (Heartbeat, NREM, AEO, Agent Skills, Library, etc.)
- When a user asks how to configure settings (credentials, repos, permissions, etc.)
- When a user asks about differences between features (e.g., "Heartbeat vs NREM")
- When a user asks "how do I..." or "what is..." regarding the Omni platform
- When a user asks about uploading documents, Library search, citations, or Library Only mode

## Instructions

### Step 1 — Check the Quick Reference

Read `references/index.md` in this skill directory. It contains a condensed summary
of all Omni features (~8KB). For most questions, this reference is sufficient to
provide an accurate, helpful answer.

### Step 2 — Read Full Documentation (if needed)

If the quick reference does not have enough detail, read the full documentation
from the `numbers-omni` repository. Check these paths in order:

1. **Workspace repo**: Look for `docs/user-guide/` in any cloned repository in the
   workspace (e.g., `numbers-omni/docs/user-guide/`).
2. **GitHub API**: If not found locally, fetch via `gh api`:
   ```bash
   gh api repos/numbersprotocol/numbers-omni/contents/docs/user-guide/heartbeat.md \
     --jq '.content' | base64 -d
   ```

**Available documentation files:**

| Feature | File |
|---------|------|
| Feature Overview | `docs/user-guide/index.md` |
| Spaces | `docs/user-guide/spaces.md` |
| Conversations | `docs/user-guide/conversations.md` |
| Cloud Credentials | `docs/user-guide/credentials.md` |
| GitHub Repositories | `docs/user-guide/repositories.md` |
| Ads MCP | `docs/user-guide/ads-mcp.md` |
| Heartbeat | `docs/user-guide/heartbeat.md` |
| NREM | `docs/user-guide/nrem.md` |
| Agent Skills | `docs/user-guide/agent-skills.md` |
| Health Check | `docs/user-guide/health-check.md` |
| AEO / AI Bot Traffic | `docs/user-guide/aeo.md` |
| External API | `docs/user-guide/external-api.md` |
| Roles & Permissions | `docs/user-guide/roles-permissions.md` |
| Corporate Admin | `docs/user-guide/corporate-admin.md` |
| Monitor | `docs/features/monitor.md` |
| Browser Automation | `docs/user-guide/browser-automation.md` |
| MS Office | `docs/user-guide/ms-office.md` |
| Google Workspace | `docs/user-guide/google-workspace.md` |
| Space Library & RAG | `docs/user-guide/library.md` |
| Web Preview | `docs/user-guide/web-preview.md` |
| Build Settings | `docs/user-guide/build-settings.md` |
| Code Review | `docs/user-guide/code-review.md` |
| CI/CD | `docs/user-guide/ci-cd.md` |
| Agent Subagents | `docs/user-guide/subagents.md` |
| Admin AI | `docs/user-guide/admin-ai.md` |
| Cron Jobs | `docs/user-guide/cron-jobs.md` |
| Dashboards | `docs/user-guide/dashboards.md` |
| LINE Bot Integration | `docs/user-guide/line-bot.md` |

3. **Public User Guide** (for screenshots and workflows):
   `public/user-guide.html` — bilingual (EN/繁中) guide with 4 user-type sections

### Step 3 — Answer the User

- Answer in the **same language** as the user's question
- Be concise but thorough
- Reference specific settings paths (e.g., "Settings > Space > Heartbeat")
- If the user asks about differences between features, use comparison tables
