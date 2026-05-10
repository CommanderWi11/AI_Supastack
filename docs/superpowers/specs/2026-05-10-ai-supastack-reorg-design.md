# ai-supastack — Reorg & Schema Refactor

**Date:** 2026-05-10
**Project:** `01_Personal_HQ/Projects/ai-supastack/`
**File touched:** `index.html` (single-file site)
**Status:** Design approved by user, ready for implementation plan
**Follow-up spec (deferred):** Auto-sync from machine state — see "Out of Scope" below.

---

## Context

The page in `index.html` has accumulated 15 sections and ~80 entries. An audit surfaced four classes of problem:

1. **Misclassifications** — BMAD-METHOD sits with runtimes; Cursor sits in Terminal; Obsidian sits in Web Tools.
2. **Cross-section duplication** — `superpowers`, `claude-mem`, `frontend-design`, and `playwriter` each appear in 2–3 sections, treating "tool" and "skill" as separate things when bundled skills are really children of their parent plugin.
3. **Section overlap** — "Installed Skills" vs. "Always-on Skills" represent a real distinction (manual-trigger vs. auto-load) that's invisible in the data shape.
4. **Convention drift** — `version` field mixes `"latest"`, `"built-in"`, `"live"`, and semver arbitrarily; skill IDs mix namespaced (`claude-mem:mem-search`) and bare (`vibesec`).

This refactor fixes all four in one pass and lays the groundwork for spec 2 (auto-sync), which needs a stable schema before it can populate anything.

---

## Decisions (locked)

| Decision | Choice |
|---|---|
| Duplication model | **Option B** — plugins are parents; bundled skills nest underneath as `subEntries` |
| New sections | Editors & IDEs merged into **Local Apps**; **Methodologies & Frameworks** added; **Custom Skills** + **Harness Skills** replace the old skill sections |
| Paperclip | Parent entry inside **Web Tools** with 3 paperclip skills nested underneath |
| `version` field | Real semver when known; **omit** the field for entries without versions; renderer hides when absent |
| Skill ID naming | Plugin-bundled skills use `pluginname:skillname`; custom and harness skills stay bare |

---

## Target Section Structure

| # | Section | Entries (parents only; nested skills shown indented) |
|---|---|---|
| 1 | Homebrew | Homebrew |
| 2 | Terminal | Ghostty |
| 3 | Local Apps | Cursor, Obsidian |
| 4 | Dev Runtimes | Node.js, Python, Deno, uv |
| 5 | CLI Tools | gh, gcloud, fzf, ffmpeg, yt-dlp, SQLite |
| 6 | Core AI Tools | Claude Code, Ollama, MLX/MLX-C, whisper-cpp, GGML |
| 7 | Methodologies & Frameworks | BMAD-METHOD |
| 8 | Claude Code Plugins | superpowers (12 nested skills), frontend-design (1), claude-mem (5), playwright-pro (1), psychologist-analyst, claude-hud (2) |
| 9 | MCP Servers | Notion, Canva, Google Drive |
| 10 | Browser Automation | pw-demux |
| 11 | Email | Himalaya |
| 12 | Remote Access | Tailscale |
| 13 | Web Tools | Supabase, Vercel, Resend, Paperclip (3 nested skills) |
| 14 | AI-Powered Apps | WHOOP Daily Briefing |
| 15 | Custom Skills | vibesec, varlock, xlsx, pdf, internal-comms, review-claudemd, para-memory-files |
| 16 | Harness Skills | update-config, keybindings-help, simplify, fewer-permission-prompts, loop, schedule, claude-api, init, review, security-review |

**Net change:** 15 → 16 sections.

---

## Schema Changes

### Entry shape — add optional `subEntries`

Current entry:
```json
{ "id": "...", "name": "...", "version": "...", "links": [...], "notes": "..." }
```

New entry (changes in **bold**):
```json
{
  "id": "...",
  "name": "...",
  "version": "...",          // OPTIONAL — omit when no meaningful version
  "links": [...],
  "notes": "...",
  "subEntries": [             // OPTIONAL — for plugins with bundled skills
    { "id": "superpowers:brainstorming", "name": "brainstorming", "notes": "..." }
  ]
}
```

Rules:
- `subEntries` items use the same fields as a top-level entry but `links` and `version` are typically omitted.
- Sub-entry `id` for plugin skills MUST be namespaced (`pluginname:skillname`).
- Renderer treats sub-entries as a nested list under the parent's notes block.

### Renderer changes (in `index.html` `<script>`)

1. `renderEntry(entry, sectionId)` and `_renderEntry(entry, sectionId)` — when `entry.subEntries?.length`, render an indented `<ul class="sub-entries">` after the notes.
2. Both renderers — when `entry.version` is absent/empty, omit the version DOM node (don't render an empty span).
3. Add CSS for `.sub-entries` (smaller text, indented, no link badges by default).
4. Edit modal: add a sub-entries editor (textarea with one `name | notes` per line is fine for v1 — full sub-entry editing UI is out of scope).

---

## Migration Map (concrete moves)

| Current location | Entry | New location |
|---|---|---|
| Terminal | Cursor | Local Apps |
| Core AI Tools | BMAD-METHOD | Methodologies & Frameworks |
| Web Tools | Obsidian | Local Apps |
| Browser Automation | playwriter (CLI) | nested under `playwright-pro` plugin |
| Superpowers Skills (entire section) | all 12 entries | nested under `superpowers` plugin |
| Always-on Skills | claude-mem:* (5) | nested under `claude-mem` plugin |
| Always-on Skills | frontend-design | nested under `frontend-design` plugin |
| Always-on Skills | claude-hud:* (2) | nested under new `claude-hud` plugin parent |
| Installed Skills | playwriter skill | nested under `playwright-pro` plugin |
| Installed Skills | paperclip, paperclip-create-agent, paperclip-create-plugin | nested under new `paperclip` entry in Web Tools |
| Installed Skills (remaining) | vibesec, varlock, xlsx, pdf, internal-comms, review-claudemd, para-memory-files | Custom Skills (renamed) |
| Always-on Skills (remaining harness skills) | update-config, keybindings-help, simplify, fewer-permission-prompts, loop, schedule, claude-api, init, review, security-review | Harness Skills (renamed) |

### New parent entries to create

- **Methodologies & Frameworks** section, single entry: BMAD-METHOD (already written, just relocate).
- **Local Apps** section, two entries: Cursor (relocated), Obsidian (relocated).
- **claude-hud** plugin parent (Claude Code Plugins). Notes: status-bar HUD plugin, ships `setup` + `configure` skills.
- **Paperclip** parent (Web Tools). Notes: governance/coordination platform; ships 3 skills (paperclip, paperclip-create-agent, paperclip-create-plugin).

---

## Verification

1. **Load locally** — open `index.html` directly in a browser (no server needed; it's a single file).
2. **Visual check** — every section in the table above renders; entry counts match; nested skills appear indented under their plugin parents; entries without `version` don't show an empty version slot.
3. **TOC** — left sidebar lists all 16 sections in the right order; jump-to-section works.
4. **Edit flow smoke test** — open the edit modal on (a) a top-level entry with sub-entries, (b) a top-level entry without, (c) a sub-entry. Confirm save round-trips correctly.
5. **Commit + push** — push to `main`, verify GitHub Pages picks it up at `commanderwi11.github.io/ai-supastack/`.
6. **No console errors** in the browser devtools after load.

---

## Out of Scope (deferred to spec 2: auto-sync)

The follow-up spec will design a script that reads ground truth from the local machine (Homebrew, npm, plugins, MCP configs, skills) and auto-updates the JSON in `index.html`. Notes captured during this brainstorm for that spec:

- **MCP config disagreement**: `~/.claude.json` has `notion, guesty, gmail`; `~/.claude/settings.json` has `firecrawl, gmail, notion`. Pick one as canonical before automating.
- **Plugin skill enumeration**: don't rely on a fixed glob depth; read `~/.claude/plugins/installed_plugins.json` and walk each plugin's manifest, OR use `find ~/.claude/plugins/cache -name SKILL.md`.
- **Linked npm packages**: the auto-sync script should flag npm `->` symlinks (e.g. `byd-control` is a local linked dev package, not a published install).
- **Schema readiness**: the `subEntries` field added in this spec is what the auto-sync needs to populate plugin → bundled-skills relationships from manifests.

---

## Notes on Process

- Brainstorming completed in Plan Mode. Per Plan Mode constraints, this design lives in `~/.claude/plans/drifting-mapping-cat.md` rather than the conventional `docs/superpowers/specs/2026-05-10-ai-supastack-reorg-design.md`. After exiting plan mode and approving, the design should be copied to that canonical path and committed before implementation begins.
- Implementation is a single-file edit to `index.html` plus a render-script tweak. Should fit in one focused session.
