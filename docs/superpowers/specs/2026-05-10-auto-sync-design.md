# ai-supastack Auto-Sync Design

**Date:** 2026-05-10
**Project:** `01_Personal_HQ/Projects/ai-supastack/`
**Depends on:** Spec 1 (reorg & schema refactor) — requires the `subEntries` schema and clean section structure to be in place first.

---

## Context

The `index.html` stack reference is maintained manually. Versions drift silently (e.g. the node entry says v25.9.0 six months after v27 shipped). New tools get installed and forgotten. This spec designs a two-layer automation that keeps the doc current without manual effort:

1. **Local layer:** a Mac launchd job captures installed-tool state weekly and pushes a snapshot JSON to the repo.
2. **Cloud layer:** a GitHub Actions workflow runs weekly, reads the snapshot, queries public registries for latest versions, patches `index.html`, and commits directly to `main`.

The result: version fields stay accurate, new tools appear as stubs automatically, and a drift report in every commit message shows what's installed vs. what's available.

---

## Decisions (locked)

| Decision | Choice |
|---|---|
| Execution | GitHub Actions cron (weekly) + macOS launchd cron (weekly) |
| Sync target | Latest available from public registries + drift warning vs. installed |
| Scope | Version fields + new stub entries for unknown tools |
| Change delivery | Direct commit to `main` |
| Source mapping | Separate `scripts/stack-sources.json` file |
| Local capture automation | launchd plist installed to `~/Library/LaunchAgents/` |

---

## Files

| File | Purpose |
|---|---|
| `scripts/capture-stack.sh` | Runs on Mac weekly via launchd. Snapshots installed tools → `scripts/stack-snapshot.json`. Commits + pushes. |
| `scripts/stack-snapshot.json` | Committed JSON — ground truth for what's installed on the Mac. |
| `scripts/stack-sources.json` | Maps each entry `id` in index.html to its registry lookup. Maintained manually when adding new entries. |
| `scripts/sync-stack.mjs` | Node script — reads snapshot + sources + index.html, queries registries, patches index.html, writes drift report. Can be run locally too. |
| `scripts/com.commanderwi11.capture-stack.plist` | launchd plist. Install once to `~/Library/LaunchAgents/` to automate weekly capture. |
| `.github/workflows/sync-stack.yml` | GHA workflow — runs sync-stack.mjs weekly on Sundays, commits to main. |

---

## Data Shapes

### `stack-snapshot.json`

```json
{
  "capturedAt": "2026-05-10T02:00:00Z",
  "brew": {
    "gh": "2.89.0",
    "ffmpeg": "8.1",
    "fzf": "0.70.0",
    "yt-dlp": "2026.3.17",
    "ollama": "0.19.0",
    "node": "25.9.0",
    "python@3.14": "3.14.3",
    "deno": "2.7.9",
    "sqlite": "3.53.0",
    "whisper-cpp": "1.8.4",
    "ggml": "0.9.11",
    "mlx": "0.31.1",
    "mlx-c": "0.6.0",
    "himalaya": "1.2.0",
    "tmux": "3.6a"
  },
  "brewCasks": {
    "ghostty": "1.3.1",
    "cursor": "...",
    "tailscale": "1.96.5",
    "gcloud-cli": "563.0.0",
    "iterm2": "3.6.9"
  },
  "npm": {
    "@anthropic-ai/claude-code": "2.1.104",
    "playwriter": "0.1.0",
    "vercel": "53.1.0",
    "playwright": "1.59.1",
    "pnpm": "10.33.0"
  },
  "claudePlugins": [
    "claude-plugins-official/superpowers",
    "claude-plugins-official/frontend-design",
    "thedotmack/claude-mem",
    "alirezarezvani/playwright-pro",
    "claude-hud/claude-hud"
  ],
  "claudeSkills": [
    "vibesec", "varlock", "xlsx", "pdf",
    "internal-comms", "review-claudemd",
    "playwriter", "para-memory-files",
    "paperclip", "paperclip-create-agent", "paperclip-create-plugin"
  ],
  "mcpServers": ["notion", "guesty", "gmail", "firecrawl"]
}
```

Notes:
- Linked npm packages (path contains `→`) are excluded.
- `mcpServers` is the **union** of `~/.claude.json` and `~/.claude/settings.json`, deduplicated.
- Plugin format is `"org/name"` from the installed_plugins registry.

### `stack-sources.json`

Maps entry `id` values from `index.html` to their registry lookup. Entries without a mapping are never auto-updated.

```json
{
  "homebrew":       { "type": "brew",      "formula": "brew" },
  "ghostty":        { "type": "brew-cask", "cask": "ghostty" },
  "cursor":         { "type": "brew-cask", "cask": "cursor" },
  "claude-code":    { "type": "npm",       "package": "@anthropic-ai/claude-code" },
  "ollama":         { "type": "github",    "repo": "ollama/ollama" },
  "nodejs":         { "type": "brew",      "formula": "node" },
  "python":         { "type": "brew",      "formula": "python@3.14" },
  "deno":           { "type": "brew",      "formula": "deno" },
  "uv":             { "type": "brew",      "formula": "uv" },
  "gh":             { "type": "brew",      "formula": "gh" },
  "gcloud":         { "type": "brew-cask", "cask": "google-cloud-sdk" },
  "fzf":            { "type": "brew",      "formula": "fzf" },
  "ffmpeg":         { "type": "brew",      "formula": "ffmpeg" },
  "yt-dlp":         { "type": "brew",      "formula": "yt-dlp" },
  "sqlite":         { "type": "brew",      "formula": "sqlite" },
  "mlx":            { "type": "brew",      "formula": "mlx" },
  "whisper":        { "type": "brew",      "formula": "whisper-cpp" },
  "ggml":           { "type": "brew",      "formula": "ggml" },
  "tailscale":      { "type": "brew-cask", "cask": "tailscale-app" },
  "himalaya":       { "type": "brew",      "formula": "himalaya" },
  "obsidian":       { "type": "brew-cask", "cask": "obsidian" },
  "vercel":         { "type": "npm",       "package": "vercel" },
  "bmad-method":    { "type": "manual" },
  "supabase":       { "type": "manual" },
  "resend":         { "type": "manual" },
  "paperclip":      { "type": "manual" }
}
```

Entries not in this file are skipped during registry queries.

**Registry API endpoints:**

| type | API | Version field |
|---|---|---|
| `brew` | `https://formulae.brew.sh/api/formula/{formula}.json` | `.versions.stable` |
| `brew-cask` | `https://formulae.brew.sh/api/cask/{cask}.json` | `.version` |
| `npm` | `https://registry.npmjs.org/{package}` | `.dist-tags.latest` |
| `github` | `https://api.github.com/repos/{repo}/releases/latest` | `.tag_name` |
| `manual` | — (never queried) | — |

---

## Sync Algorithm (`sync-stack.mjs`)

```
1. Parse inline JSON from index.html (regex: <script type="application/json">...)
2. Load stack-snapshot.json and stack-sources.json
3. Build a map of entryId → { latest, installed } for all mapped entries:
   - "latest": fetch from registry API using stack-sources.json
   - "installed": look up entryId in snapshot (match by source formula/package name)
4. For each entry in index.html:
   - If entryId is in sources map and latest was fetched:
     → Update entry.version to latest
   - If latest !== installed (and both are known):
     → Append to drift list: { id, installed, latest }
5. Detect unknown tools:
   - For each key in snapshot.brew, snapshot.npm, etc.:
     → If no entry in index.html has a matching source, it's unknown
   - For unknown tools: create stub entry:
     { id: sanitized-name, name: tool-name, notes: "Auto-detected. Add to correct section." }
   - Find or create section id "uncategorized", title "Uncategorized", order: max(existing orders) + 1
   - Append stubs
6. Update meta.lastUpdated to today's date
7. Serialize updated JSON back into index.html (replace the script block content)
8. Write commit message (with drift report) to `/tmp/sync-commit-msg.txt`
```

**Commit message format:**
```
chore: weekly stack sync 2026-05-17

🔄 Updated: gh 2.89.0→2.91.0, claude-code v2.1.104→v2.2.0
⚠️ Behind: ollama (installed 0.19.0, latest 0.21.0)
➕ New stubs: bun (Uncategorized)
ℹ️ 3 entries skipped (manual or registry error)
```

If nothing changed, the script exits 0 without committing.

---

## `capture-stack.sh`

Shell script (bash). Runs on Mac via launchd (Saturdays 2am). Steps:

1. `brew list --versions --formula` → parse into `brew` object
2. `brew list --versions --cask` → parse into `brewCasks` object
3. `npm ls -g --depth=0 --json` → parse into `npm` object, filter out entries where `resolved` contains `file:` (linked local packages)
4. `ls ~/.claude/plugins/cache/` → list `org/name` directories → `claudePlugins`
5. `ls ~/.claude/skills/` → list skill dir names → `claudeSkills`
6. Read `~/.claude.json` mcpServers + `~/.claude/settings.json` mcpServers → union, deduplicate → `mcpServers`
7. Set `capturedAt` to ISO timestamp
8. Write to `scripts/stack-snapshot.json`
9. `cd` to project dir, `git add scripts/stack-snapshot.json && git commit -m "chore: update stack snapshot $(date +%Y-%m-%d)" && git push`

Log all output to `~/Library/Logs/capture-stack.log`.

---

## `com.commanderwi11.capture-stack.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.commanderwi11.capture-stack</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/ai-supastack/scripts/capture-stack.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>6</integer>
    <key>Hour</key>
    <integer>2</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/openbob/Library/Logs/capture-stack.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/openbob/Library/Logs/capture-stack.log</string>
</dict>
</plist>
```

Install with: `launchctl load ~/Library/LaunchAgents/com.commanderwi11.capture-stack.plist`

---

## `.github/workflows/sync-stack.yml`

```yaml
name: Sync Stack

on:
  schedule:
    - cron: '0 8 * * 0'   # Sundays 8am UTC (30+ hours after launchd Saturday 2am)
  workflow_dispatch:        # Manual trigger via GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Run sync
        run: node scripts/sync-stack.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git diff --quiet index.html || \
            git add index.html && \
            git commit -F /tmp/sync-commit-msg.txt && \
            git push
```

The `GITHUB_TOKEN` is needed to push. The `sync-stack.mjs` script writes the commit message to `/tmp/sync-commit-msg.txt`.

---

## Error Handling

| Situation | Behavior |
|---|---|
| Registry API returns non-200 | Skip that entry, log `⚠️ API error: {id}`, leave version unchanged |
| Registry returns unexpected JSON shape | Skip entry, log warning |
| `stack-snapshot.json` missing | GHA exits 0 (no-op) with a logged notice — first run bootstraps the snapshot |
| `stack-sources.json` missing | GHA exits 1 (configuration error) |
| `index.html` JSON parse fails | GHA exits 1 (data integrity error) |
| launchd fails on Mac | Logged to `~/Library/Logs/capture-stack.log`; GHA runs on last pushed snapshot |
| Git push fails (launchd) | Logged; next launchd run will retry |
| Nothing changed | Script exits 0, GHA commit step skips (no empty commits) |

---

## Timing & Coordination

- **launchd fires:** Saturday 2:00am local Mac time
- **GHA fires:** Sunday 8:00am UTC

This gives a ~30-hour window for the Saturday Mac capture to push before the Sunday GHA sync reads it. The snapshot is always at most 7 days stale from GHA's perspective.

---

## Bootstrap Sequence (first-time setup)

1. Create `scripts/stack-sources.json` with the initial mappings (shown above)
2. Run `scripts/capture-stack.sh` manually once to generate `scripts/stack-snapshot.json`
3. Commit both files
4. Copy `scripts/com.commanderwi11.capture-stack.plist` to `~/Library/LaunchAgents/` and load it
5. Run `node scripts/sync-stack.mjs` locally to verify end-to-end
6. Push. GHA will take over from Sunday onward.

---

## Out of Scope

- Auto-updating `subEntries` on plugin entries (plugin manifest changes are infrequent; add manually via the in-page editor)
- Removing entries from index.html when a tool is uninstalled (deletions are manual — too risky to automate)
- macOS Notification Center alerts on drift (can be added later as a `terminal-notifier` call in capture-stack.sh)
