# ai-supastack Reorg & Schema Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure 15 sections → 16, introduce `subEntries` for plugin-bundled skills, fix misclassifications (Cursor/Obsidian/BMAD), eliminate skill-section duplication, and normalize version/naming conventions.

**Architecture:** All changes are in a single file (`index.html`). The file contains an inline JSON data block (~lines 452–1192), CSS (<style> block, ~lines 1–443), and two JS renderer functions (`renderEntry` in the init IIFE, `_renderEntry` in `renderAll`). Renderer changes first (backwards-compatible), data migration second.

**Tech Stack:** Vanilla JS, inline JSON in `<script type="application/json">`, GitHub Pages deployment.

---

## File Map

| File | Responsibility | Changed? |
|---|---|---|
| `index.html` lines 262–443 | CSS — entry and section styles | ✅ add `.sub-entries` styles |
| `index.html` lines 1388–1436 | Init IIFE renderer (`renderEntry`, `renderSection`) | ✅ add `renderSubEntries`, call from `renderEntry` |
| `index.html` lines 1694–1754 | `renderAll` legacy renderer (`_renderEntry`, `_renderSection`) | ✅ add `_renderSubEntries`, call from `_renderEntry` |
| `index.html` lines 452–1192 | JSON data — all sections and entries | ✅ full restructure |

---

## Task 1: CSS + Renderer — add `subEntries` support

**Files:**
- Modify: `index.html` (CSS block, both renderer functions)

This task is backwards-compatible: no data has `subEntries` yet, so nothing changes visually. It primes the renderer for Tasks 2–6.

- [ ] **Step 1.1: Add `.sub-entries` CSS**

Find this block in `index.html` (around line 331):
```css
    .notes-cell { min-width: 200px; }
```

Add immediately after it:
```css
    .sub-entries {
      margin: 10px 0 0 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid var(--border-muted);
    }
    .sub-entry {
      padding: 6px 0 6px 12px;
      border-bottom: 1px solid var(--border-muted);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      gap: 8px;
      align-items: baseline;
    }
    .sub-entry:last-child { border-bottom: none; }
    .sub-entry-name {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
    }
    .sub-entry-notes { flex: 1; }
```

- [ ] **Step 1.2: Add `renderSubEntries` to the init IIFE**

Find in `index.html` (around line 1399):
```js
  function renderEntry(entry, sectionId) {
```

Insert immediately **before** that line:
```js
  function renderSubEntries(subEntries) {
    if (!subEntries || subEntries.length === 0) return '';
    const items = subEntries.map(s =>
      `<li class="sub-entry">
        <span class="sub-entry-name">${escHtml(s.id)}</span>
        <span class="sub-entry-notes">${s.notes ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(s.notes) : s.notes) : ''}</span>
      </li>`
    ).join('');
    return `<ul class="sub-entries">${items}</ul>`;
  }

```

- [ ] **Step 1.3: Call `renderSubEntries` inside `renderEntry`**

Find in `index.html`:
```js
      <td class="notes-cell">${renderNotes(entry.notes)}</td>
```

Replace with:
```js
      <td class="notes-cell">${renderNotes(entry.notes)}${renderSubEntries(entry.subEntries)}</td>
```

- [ ] **Step 1.4: Add `_renderSubEntries` to the `renderAll` function**

Find in `index.html` (around line 1716):
```js
  function _renderEntry(entry, sectionId) {
```

Insert immediately **before** that line:
```js
  function _renderSubEntries(subEntries) {
    if (!subEntries || subEntries.length === 0) return '';
    var items = subEntries.map(function(s) {
      return '<li class="sub-entry">' +
        '<span class="sub-entry-name">' + _escHtml(s.id) + '</span>' +
        '<span class="sub-entry-notes">' + (s.notes ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(s.notes) : s.notes) : '') + '</span>' +
        '</li>';
    }).join('');
    return '<ul class="sub-entries">' + items + '</ul>';
  }

```

- [ ] **Step 1.5: Call `_renderSubEntries` inside `_renderEntry`**

Find in `index.html`:
```js
      '<td class="notes-cell">' + _renderNotes(entry.notes) + '</td>' +
```

Replace with:
```js
      '<td class="notes-cell">' + _renderNotes(entry.notes) + _renderSubEntries(entry.subEntries) + '</td>' +
```

- [ ] **Step 1.6: Verify locally**

Open `index.html` in a browser (File → Open or `open index.html`).
Expected: page loads identically to before — no visual change, no console errors. The renderer now silently supports `subEntries` on any entry.

- [ ] **Step 1.7: Commit**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "feat: add subEntries renderer + CSS for plugin skill nesting"
```

---

## Task 2: Data — sections 1-7, add Local Apps and Methodologies

**Files:**
- Modify: `index.html` JSON data block

This task:
1. Removes `cursor` from the Terminal section.
2. Inserts a new **Local Apps** section (order 3) with Cursor + Obsidian.
3. Renumbers Dev Runtimes, CLI Tools to orders 4 and 5.
4. Removes BMAD from Core AI (order 6), normalizes Core AI's version fields.
5. Inserts a new **Methodologies & Frameworks** section (order 7) with BMAD.
6. Renumbers Claude Code Plugins to order 8.

All downstream sections (MCP Servers → AI-Powered Apps) need their `order` bumped by 2. The skills sections change further in Tasks 4–5.

- [ ] **Step 2.1: Replace Terminal section (remove Cursor)**

Find in `index.html`:
```json
    {
      "id": "terminal",
      "title": "Terminal",
      "order": 2,
      "entries": [
        {
          "id": "ghostty",
          "name": "Ghostty",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://ghostty.org" },
            { "label": "Docs", "url": "https://ghostty.org/docs" }
          ],
          "notes": "Fast, native terminal emulator. Primary terminal. Download from the site or: <code>brew install --cask ghostty</code>"
        },
        {
          "id": "cursor",
          "name": "Cursor",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://cursor.com" },
            { "label": "Docs", "url": "https://docs.cursor.com" }
          ],
          "notes": "AI-first code editor built on VS Code. Inline AI editing, codebase chat, and agentic coding. Install: <code>brew install --cask cursor</code>"
        }
      ]
    },
```

Replace with:
```json
    {
      "id": "terminal",
      "title": "Terminal",
      "order": 2,
      "entries": [
        {
          "id": "ghostty",
          "name": "Ghostty",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://ghostty.org" },
            { "label": "Docs", "url": "https://ghostty.org/docs" }
          ],
          "notes": "Fast, native terminal emulator. Primary terminal. Download from the site or: <code>brew install --cask ghostty</code>"
        }
      ]
    },
    {
      "id": "local-apps",
      "title": "Local Apps",
      "order": 3,
      "entries": [
        {
          "id": "cursor",
          "name": "Cursor",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://cursor.com" },
            { "label": "Docs", "url": "https://docs.cursor.com" }
          ],
          "notes": "AI-first code editor built on VS Code. Inline AI editing, codebase chat, and agentic coding. Install: <code>brew install --cask cursor</code>"
        },
        {
          "id": "obsidian",
          "name": "Obsidian",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://obsidian.md" },
            { "label": "Download", "url": "https://obsidian.md/download" }
          ],
          "notes": "Local-first markdown knowledge base — used as the persistent memory layer (AI Brain vault). All notes are plain <code>.md</code> files stored in iCloud. Install: <code>brew install --cask obsidian</code>"
        }
      ]
    },
```

- [ ] **Step 2.2: Bump Dev Runtimes and CLI Tools orders**

Find:
```json
      "id": "runtimes",
      "title": "Dev Runtimes",
      "order": 3,
```
Replace with:
```json
      "id": "runtimes",
      "title": "Dev Runtimes",
      "order": 4,
```

Find:
```json
      "id": "cli-tools",
      "title": "CLI Tools",
      "order": 4,
```
Replace with:
```json
      "id": "cli-tools",
      "title": "CLI Tools",
      "order": 5,
```

- [ ] **Step 2.3: Bump Core AI to order 6 and remove BMAD entry**

Find:
```json
      "id": "core-ai",
      "title": "Core AI Tools",
      "order": 5,
```
Replace with:
```json
      "id": "core-ai",
      "title": "Core AI Tools",
      "order": 6,
```

Then find and remove this entire entry from core-ai (the BMAD entry added in the previous commit):
```json
        ,
        {
          "id": "bmad-method",
          "name": "BMAD-METHOD",
          "version": "latest",
          "links": [
            { "label": "Repo", "url": "https://github.com/bmad-code-org/BMAD-METHOD" }
          ],
          "notes": "Breakthrough Method for Agile AI-Driven Development. Structured framework that uses 12+ specialized agent personas (analyst, architect, PM, dev, etc.) to guide the full dev lifecycle — from discovery through implementation. Solves the problem of shallow AI output by enforcing proven agile practices at each phase. Free and open-source."
        }
```

- [ ] **Step 2.4: Insert Methodologies & Frameworks section + bump Plugins to order 8**

Find:
```json
    {
      "id": "plugins",
      "title": "Claude Code Plugins",
      "order": 6,
```
Replace with:
```json
    {
      "id": "methodologies",
      "title": "Methodologies & Frameworks",
      "order": 7,
      "entries": [
        {
          "id": "bmad-method",
          "name": "BMAD-METHOD",
          "links": [
            { "label": "Repo", "url": "https://github.com/bmad-code-org/BMAD-METHOD" }
          ],
          "notes": "Breakthrough Method for Agile AI-Driven Development. Structured framework that uses 12+ specialized agent personas (analyst, architect, PM, dev, etc.) to guide the full dev lifecycle — from discovery through implementation. Solves the problem of shallow AI output by enforcing proven agile practices at each phase. Free and open-source."
        }
      ]
    },
    {
      "id": "plugins",
      "title": "Claude Code Plugins",
      "order": 8,
```

- [ ] **Step 2.5: Bump MCP Servers through AI-Powered Apps orders**

Apply these find-and-replace pairs one at a time:

```
"id": "mcp-servers",  "order": 7,   →  "order": 9,
"id": "browser-auto", "order": 8,   →  "order": 10,
"id": "email",        "order": 9,   →  "order": 11,
"id": "remote-access","order": 10,  →  "order": 12,
"id": "web-tools",    "order": 11,  →  "order": 13,
"id": "ai-apps",      "order": 12,  →  "order": 14,
```

For each, find the `"order": N,` line immediately following its `"id"` line and update the number.

- [ ] **Step 2.6: Remove Obsidian from Web Tools**

Find in the web-tools section:
```json
        {
          "id": "obsidian",
          "name": "Obsidian",
          "version": "latest",
          "links": [
            { "label": "Site", "url": "https://obsidian.md" },
            { "label": "Download", "url": "https://obsidian.md/download" }
          ],
          "notes": "Local-first markdown knowledge base — used as the persistent memory layer (AI Brain vault). All notes are plain <code>.md</code> files stored in iCloud. Install: <code>brew install --cask obsidian</code>"
        },
```
Delete this entry.

- [ ] **Step 2.7: Verify**

Open `index.html` in browser.
Expected:
- Sidebar TOC shows 16 sections (not 15 — Superpowers Skills still exists at this point; total is currently 17 including old skills sections — that's fine, tasks 3-5 will remove them).
- "Local Apps" section appears between Terminal and Dev Runtimes with Cursor + Obsidian.
- "Methodologies & Frameworks" appears after Core AI with BMAD-METHOD.
- BMAD does NOT appear in Core AI.
- Obsidian does NOT appear in Web Tools.
- No console errors.

- [ ] **Step 2.8: Commit**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "refactor: add Local Apps + Methodologies sections, fix Cursor/Obsidian/BMAD placement"
```

---

## Task 3: Data — Claude Code Plugins with nested `subEntries`

**Files:**
- Modify: `index.html` JSON data block (`plugins` section)

Replace the entire `plugins` section entries with versions that include `subEntries`. Also adds `claude-hud` as a new parent entry.

- [ ] **Step 3.1: Replace the entire `plugins` section entries**

Find the block starting with:
```json
      "entries": [
        {
          "id": "plugin-superpowers",
```
...and ending with:
```json
        }
      ]
    },
    {
      "id": "mcp-servers",
```

Replace the `entries` array contents (keep the outer section wrapper) with:
```json
      "entries": [
        {
          "id": "plugin-superpowers",
          "name": "superpowers",
          "links": [
            { "label": "Repo", "url": "https://github.com/anthropics/claude-code" }
          ],
          "notes": "Official Anthropic plugin — adds planning, brainstorm, debugging, and systematic workflow skills. Install: <code>@claude-plugins-official/superpowers</code>",
          "subEntries": [
            { "id": "superpowers:brainstorming", "notes": "Explores intent, design, and tradeoffs before any feature implementation. Invoke before building." },
            { "id": "superpowers:test-driven-development", "notes": "Enforces TDD discipline — writes tests before implementation code." },
            { "id": "superpowers:systematic-debugging", "notes": "Structured debugging protocol. Diagnoses root cause before proposing fixes." },
            { "id": "superpowers:writing-plans", "notes": "Converts a spec into a phased, reviewable implementation plan." },
            { "id": "superpowers:executing-plans", "notes": "Executes a written plan in a new session with review checkpoints." },
            { "id": "superpowers:verification-before-completion", "notes": "Requires running verification commands before claiming work is done." },
            { "id": "superpowers:finishing-a-development-branch", "notes": "Wraps up a feature branch — cleanup, tests, changelog, PR prep." },
            { "id": "superpowers:using-git-worktrees", "notes": "Isolates feature work in a git worktree so the main workspace stays clean." },
            { "id": "superpowers:requesting-code-review", "notes": "Prepares code for peer review — structures the PR, highlights decisions, identifies risk areas." },
            { "id": "superpowers:receiving-code-review", "notes": "Guides acting on review feedback systematically." },
            { "id": "superpowers:dispatching-parallel-agents", "notes": "Splits work across multiple subagents running in parallel." },
            { "id": "superpowers:subagent-driven-development", "notes": "Executes independent implementation tasks via parallel subagents." }
          ]
        },
        {
          "id": "plugin-frontend-design",
          "name": "frontend-design",
          "links": [
            { "label": "Plugin Store", "url": "https://github.com/anthropics/claude-code" }
          ],
          "notes": "Official Anthropic plugin — high-quality frontend design generation skill. Install: <code>@claude-plugins-official/frontend-design</code>",
          "subEntries": [
            { "id": "frontend-design:frontend-design", "notes": "Generates production-quality, distinctive frontend UI. Avoids generic AI aesthetics. Invoke when building web components, pages, or applications." }
          ]
        },
        {
          "id": "plugin-claude-mem",
          "name": "claude-mem",
          "links": [
            { "label": "Repo", "url": "https://github.com/thedotmack/claude-mem" }
          ],
          "notes": "Persistent cross-session memory for Claude Code. Enables knowledge graphs, corpus search, timeline, and smart exploration. Install: <code>@thedotmack/claude-mem</code>",
          "subEntries": [
            { "id": "claude-mem:mem-search", "notes": "Searches persistent cross-session memory database. Recall past decisions, solutions, or context." },
            { "id": "claude-mem:make-plan", "notes": "Creates a phased implementation plan stored in memory, visible across sessions." },
            { "id": "claude-mem:do", "notes": "Executes a plan stored in claude-mem via subagents." },
            { "id": "claude-mem:smart-explore", "notes": "Token-efficient codebase structure search. Maps a repo's shape without exhausting context." },
            { "id": "claude-mem:timeline-report", "notes": "Generates a full project development history report from claude-mem's observation log." }
          ]
        },
        {
          "id": "plugin-playwright-pro",
          "name": "Playwright Pro",
          "links": [
            { "label": "Plugin Hub", "url": "https://www.claudepluginhub.com/plugins/alirezarezvani-pw-engineering-team-playwright-pro" }
          ],
          "notes": "Automates the full Playwright E2E testing lifecycle: generates tests from user stories, URLs, or codebases; migrates Cypress/Selenium suites; diagnoses and fixes flaky failures; reviews for best practices and coverage; produces Markdown/HTML/Slack reports.",
          "subEntries": [
            { "id": "playwriter", "notes": "Controls your real Chrome browser via Playwright. Hook-driven: start with <code>acquirePage()</code>, use <code>state.page</code>. Handles JS-heavy SPAs, login walls, lazy-loaded UIs." }
          ]
        },
        {
          "id": "plugin-psychologist-analyst",
          "name": "psychologist-analyst",
          "links": [
            { "label": "Smithery", "url": "https://smithery.ai/skills/rysweet/psychologist-analyst" }
          ],
          "notes": "Claude Code skill by rysweet — analyzes writing, journaling, and conversations for emotional patterns, mental state indicators, and behavioural insights. Install via Smithery."
        },
        {
          "id": "plugin-claude-hud",
          "name": "claude-hud",
          "links": [
            { "label": "Plugin Hub", "url": "https://github.com/disler/claude-hud" }
          ],
          "notes": "Status-bar HUD for Claude Code — shows model, token usage, cost, and session info in real time. Install: <code>@claude-hud/claude-hud</code>",
          "subEntries": [
            { "id": "claude-hud:setup", "notes": "Configures claude-hud as a statusline in the Claude Code terminal." },
            { "id": "claude-hud:configure", "notes": "Adjusts claude-hud layout, display language, and presets." }
          ]
        }
      ]
```

- [ ] **Step 3.2: Verify**

Open `index.html` in browser and scroll to "Claude Code Plugins".
Expected:
- All 6 plugin entries visible (superpowers, frontend-design, claude-mem, Playwright Pro, psychologist-analyst, claude-hud).
- Each plugin with bundled skills shows a nested list below its notes.
- Nested skill items show `id` in monospace + short notes.
- No version shown on plugin entries (field omitted).
- No console errors.

- [ ] **Step 3.3: Commit**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "refactor: add subEntries to all Claude Code Plugins, add claude-hud parent"
```

---

## Task 4: Data — Browser Automation + Web Tools

**Files:**
- Modify: `index.html` JSON data block (`browser-auto` and `web-tools` sections)

Browser Automation loses `playwriter` (now nested in Playwright Pro plugin). Web Tools gains a Paperclip parent entry with 3 nested skills.

- [ ] **Step 4.1: Remove playwriter CLI from Browser Automation**

Find in the `browser-auto` section:
```json
        {
          "id": "playwriter",
          "name": "Playwriter CLI",
          "version": "latest",
          "links": [
            { "label": "Playwright Docs", "url": "https://playwright.dev/docs/intro" }
          ],
          "notes": "Controls your real Chrome browser via Playwright from Claude Code. Hook-driven: start a task with <code>acquirePage()</code>, then use <code>state.page</code>. Ask Luis for exact install command."
        },
```
Delete this entry (including the trailing comma).

- [ ] **Step 4.2: Add Paperclip to Web Tools**

Find at the end of the `web-tools` entries (after Resend):
```json
          "notes": "Email API built for developers. Used to send transactional and automated emails (e.g. WHOOP health reports). Install SDK: <code>npm install resend</code>. Set <code>RESEND_API_KEY</code> env var."
        }
      ]
    },
```

Replace with:
```json
          "notes": "Email API built for developers. Used to send transactional and automated emails (e.g. WHOOP health reports). Install SDK: <code>npm install resend</code>. Set <code>RESEND_API_KEY</code> env var."
        },
        {
          "id": "paperclip",
          "name": "Paperclip",
          "links": [
            { "label": "Docs", "url": "https://paperclip.sh" }
          ],
          "notes": "AI agent governance and coordination platform — manages tasks, agents, and workflows across sessions. Interacts via three bundled skills.",
          "subEntries": [
            { "id": "paperclip", "notes": "Interacts with the Paperclip API — checks assignments, updates task status, delegates work, posts comments." },
            { "id": "paperclip-create-agent", "notes": "Hires or configures new agents with governance-aware workflow — inspects adapters, drafts prompts, submits hire requests." },
            { "id": "paperclip-create-plugin", "notes": "Scaffolds new Paperclip plugins using the alpha SDK/runtime. Covers worker/UI surface, route conventions, and verification." }
          ]
        }
      ]
    },
```

- [ ] **Step 4.3: Verify**

Open `index.html` in browser.
Expected:
- Browser Automation section shows only `pw-demux` (playwriter entry gone).
- Web Tools section shows Supabase, Vercel, Resend, Paperclip.
- Paperclip shows 3 nested skill items.
- No console errors.

- [ ] **Step 4.4: Commit**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "refactor: remove playwriter from Browser Auto (now in plugin), add Paperclip to Web Tools"
```

---

## Task 5: Data — Replace skill sections

**Files:**
- Modify: `index.html` JSON data block (sections 13, 14, 15)

- Delete the "Superpowers Skills" section (all 12 entries now live in the plugins section).
- Rename "Installed Skills" → "Custom Skills", update order to 15, remove `playwriter` + 3 paperclip entries.
- Rename "Always-on Skills" → "Harness Skills", update order to 16, remove `frontend-design`, `claude-mem:*` (5), and `claude-hud:*` (2) entries.
- Remove `"version": "built-in"` and `"version": "live"` fields throughout (these entries no longer have a meaningful version).

- [ ] **Step 5.1: Delete the entire Superpowers Skills section**

Find and delete this entire block (from opening `{` to closing `},`):
```json
    {
      "id": "superpowers-skills",
      "title": "Superpowers Skills",
      "order": 13,
      "entries": [
        ...12 entries...
      ]
    },
```

The block starts at `"id": "superpowers-skills"` and ends after the closing `]` and `}` before the next `{`. Delete the entire object including the trailing comma.

- [ ] **Step 5.2: Replace Installed Skills with Custom Skills**

Find:
```json
    {
      "id": "installed-skills",
      "title": "Installed Skills",
      "order": 14,
```
Replace with:
```json
    {
      "id": "custom-skills",
      "title": "Custom Skills",
      "order": 15,
```

Then within the `custom-skills` entries, delete these 4 entries (playwriter + 3 paperclip):
- `"id": "skill-playwriter"` — full entry
- `"id": "skill-paperclip"` — full entry
- `"id": "skill-paperclip-create-agent"` — full entry
- `"id": "skill-paperclip-create-plugin"` — full entry

Remaining entries (keep all, just remove `"version": "latest"` from each):
`skill-vibesec`, `skill-varlock`, `skill-xlsx`, `skill-pdf`, `skill-internal-comms`, `skill-review-claudemd`, `skill-para-memory`.

For each remaining entry, find `"version": "latest",` within that entry and delete the line.

- [ ] **Step 5.3: Replace Always-on Skills with Harness Skills**

Find:
```json
    {
      "id": "always-on-skills",
      "title": "Always-on Skills",
      "order": 15,
```
Replace with:
```json
    {
      "id": "harness-skills",
      "title": "Harness Skills",
      "order": 16,
```

Then within the `harness-skills` entries, delete these 7 entries that are now nested in their plugins:
- `"id": "skill-frontend-design"` — full entry (now in frontend-design plugin)
- `"id": "skill-mem-search"` — full entry (now in claude-mem plugin)
- `"id": "skill-make-plan"` — full entry (now in claude-mem plugin)
- `"id": "skill-do"` — full entry (now in claude-mem plugin)
- `"id": "skill-smart-explore"` — full entry (now in claude-mem plugin)
- `"id": "skill-timeline-report"` — full entry (now in claude-mem plugin)
- `"id": "skill-hud-setup"` — full entry (now in claude-hud plugin)
- `"id": "skill-hud-configure"` — full entry (now in claude-hud plugin)

Remaining 10 entries (keep all):
`skill-claude-api`, `skill-update-config`, `skill-keybindings`, `skill-simplify`, `skill-fewer-prompts`, `skill-loop`, `skill-schedule`, `skill-init`, `skill-review`, `skill-security-review`.

For each remaining entry, find `"version": "built-in",` and delete the line.

- [ ] **Step 5.4: Remove `"version": "live"` from WHOOP entry**

Find in `ai-apps` section:
```json
          "version": "live",
```
Delete this line.

- [ ] **Step 5.5: Verify**

Open `index.html` in browser.
Expected:
- Sidebar TOC: 16 sections. No "Superpowers Skills" entry. Sections 15 and 16 read "Custom Skills" and "Harness Skills".
- Custom Skills: 7 entries (vibesec, varlock, xlsx, pdf, internal-comms, review-claudemd, para-memory-files). No playwriter, no paperclip entries.
- Harness Skills: 10 entries (claude-api, update-config, keybindings-help, simplify, fewer-permission-prompts, loop, schedule, init, review, security-review). No frontend-design or claude-mem skills.
- No version chips on skill entries or WHOOP.
- No console errors.

- [ ] **Step 5.6: Commit**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "refactor: replace skill sections with Custom Skills + Harness Skills, remove duplicates"
```

---

## Task 6: Final cleanup — version fields + meta

**Files:**
- Modify: `index.html` JSON data block

- [ ] **Step 6.1: Update `meta.lastUpdated`**

Find:
```json
  "meta": {
    "lastUpdated": "2026-05-09",
```
Replace with:
```json
  "meta": {
    "lastUpdated": "2026-05-10",
```

- [ ] **Step 6.2: Normalize `gh` CLI entry version**

The `gh` CLI is installed at `2.89.0` per `brew list --versions`. Update:

Find in cli-tools:
```json
          "id": "gh",
          "name": "gh (GitHub CLI)",
          "version": "latest",
```
Replace with:
```json
          "id": "gh",
          "name": "gh (GitHub CLI)",
          "version": "2.89.0",
```

- [ ] **Step 6.3: Normalize other known Homebrew versions**

Apply these targeted replacements (only entries where we have a confirmed version from `brew list --versions`):

```
ffmpeg  "version": "latest"  →  "version": "8.1"
fzf     "version": "latest"  →  "version": "0.70.0"
yt-dlp  "version": "latest"  →  "version": "2026.3.17"
ollama  "version": "v0.19.0"  (already correct — no change)
```

For each, find the entry by `"id"` and update only that entry's `version` field.

- [ ] **Step 6.4: Verify + final check**

Open `index.html` in browser one final time.
Expected:
- 16 sections in TOC.
- gh, ffmpeg, fzf, yt-dlp show updated version chips.
- No empty version chips anywhere (check with browser devtools: `document.querySelectorAll('.entry-version')` — none should be empty strings).
- No console errors.

Run in browser console to confirm no empty version divs:
```js
[...document.querySelectorAll('.entry-version')].filter(el => !el.textContent.trim())
```
Expected: `[]` (empty array).

- [ ] **Step 6.5: Commit + push**

```bash
cd "/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack"
git add index.html
git commit -m "chore: update meta date and normalize known Homebrew versions"
git push
```

GitHub Pages will update at `commanderwi11.github.io/ai-supastack/` within ~1 minute.

---

## Self-Review Checklist

- [x] **Spec coverage:** All items from `docs/superpowers/specs/2026-05-10-ai-supastack-reorg-design.md` have a task:
  - Local Apps section ✅ Task 2
  - Methodologies & Frameworks section ✅ Task 2
  - subEntries schema + renderer ✅ Task 1
  - Plugin subEntries + claude-hud parent ✅ Task 3
  - Browser Auto / Web Tools / Paperclip ✅ Task 4
  - Custom Skills + Harness Skills ✅ Task 5
  - version field normalization ✅ Task 6
- [x] **Placeholder scan:** No TBDs, TODOs, or vague steps. All JSON is complete.
- [x] **Type consistency:** `subEntries` array items consistently use `{ "id": "...", "notes": "..." }` shape throughout all tasks. Renderer `renderSubEntries` renders `s.id` and `s.notes` — matches the data shape.
- [x] **Section order math:** Added 2 new sections (Local Apps order 3, Methodologies order 7) → all downstream sections bump by 1 or 2 as appropriate. Final range is 1–16. ✅

---

## Execution Note

This plan makes no changes to the edit modal's save/load logic. The modal will not surface `subEntries` for editing (editing a plugin's sub-entries in the modal is out of scope per the design spec). Sub-entries are set directly in the JSON and persist across commits.

If needed in a future session, add a "sub-entries textarea" field to the modal — one `id | notes` line per sub-entry.
