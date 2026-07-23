# AI_Supastack Memory

Last reviewed: 2026-07-23

## Project state

- **Status:** Active
- **Goal:** Single-page reference for my AI software stack, auto-synced weekly
- **Audience:** Me + collaborators
- **Hosting:** GitHub Pages — `commanderwi11.github.io/AI_Supastack/`
- **Repo:** `CommanderWi11/AI_Supastack`

## Recent decisions

- Migrated into `01_Personal_HQ/Projects/ai-supastack/` on 2026-05-03 (was at root `ai-supastack/`). Reorganized into `01_Personal_HQ/Projects/Knowledge_HQ/AI_Supastack/` on 2026-05-19.
- Design spec relocated from `docs/superpowers/specs/2026-05-01-ai-stack-page-design.md` to `docs/ai-stack-page-design.md` here.
- Format: single HTML file, wiki-style (option C from original brainstorm)
- Auth: GitHub OAuth via Supabase
- Edits: in-page UI commits back to repo via GitHub API
- Scope: tools only, no project listings
- **Spec 1 (2026-05-10):** Full reorg + schema refactor — 16 sections, `subEntries` nesting for plugin skills, version field normalized (omit when unknown), skill ID convention (`plugin:skill` for bundled, bare for custom/harness). Specs + plan in `docs/superpowers/`.
- **Spec 2 (2026-05-11):** Auto-sync live. Two-layer automation: Mac launchd (Saturday 2am) + GHA cron (Sunday 8am UTC). All 22 mapped registry entries resolving.
- **Stack audit (2026-07-23):** Reviewed the full wiki against the live Mac snapshot for duplicates/drift/order. Actions taken:
  - Fixed a real ID collision — the `Paperclip` entry and one of its own `subEntries` both used id `paperclip`. Renamed the top-level entry to `paperclip-platform` (subEntry ids unchanged, since those mirror real skill names and `sync-stack.mjs` only keys off top-level entry ids for `manual`-type sources — confirmed safe). Updated `stack-sources.json`'s key to match.
  - Added `the-shopper` (custom-built buying-agent skill) to Custom Skills, packaged as `downloads/the-shopper.zip` (same `{slug}/_meta.json + SKILL.md` format as `whoop-interpretation-skill.zip`) so it's downloadable from the page.
  - Removed unused/redundant local installs: `iterm2` (redundant now that Ghostty is primary terminal) and `opensuperwhisper` (untracked, unversioned GUI dictation wrapper — kept `whisper-cpp`, the actively-synced core CLI used by the actual AI stack).
  - Cleared 11 stale `temp_git_*`/`temp_subdir_*` scratch dirs from `~/.claude/plugins/cache` (leftover from clone/worktree ops, none newer than several days old, not real plugins).
  - Kept `plugin-psychologist-analyst` — confirmed still wanted despite not appearing in the latest Mac snapshot (installed via Smithery, likely outside the path `capture-stack.sh` scans).
  - Still open from that audit: confirm whether `clawhub`/`openclaw` (npm globals) are still needed before documenting or removing them.

## Auto-sync components

| File | Purpose |
|---|---|
| `scripts/stack-sources.json` | Registry mappings (edit when adding entries to index.html) |
| `scripts/stack-snapshot.json` | Committed Mac snapshot (written by launchd) |
| `scripts/capture-stack.sh` | Mac capture script — runs via launchd |
| `scripts/sync-stack.mjs` | Node ESM sync script — run locally or via GHA |
| `scripts/test-sync.mjs` | Unit tests — `node scripts/test-sync.mjs` |
| `.github/workflows/sync-stack.yml` | GHA cron Sunday 8am UTC |
| `~/Library/LaunchAgents/com.commanderwi11.capture-stack.plist` | Installed launchd job |

## Known registry quirks

- **homebrew**: not a formula — uses `github` type with `repo: Homebrew/brew`
- **gcloud**: cask token is `gcloud-cli`, not `google-cloud-sdk`
- **homebrew, gcloud**: show as "API error" if you run sync without internet or before fixes above

## Common gotchas

- GitHub username is `CommanderWi11` — all repo URLs and Pages URLs use this
- Single HTML file — no build step; edits commit directly via GitHub API
- `index.html` JSON block is `<script type="application/json" id="stack-data">` — regex must use `[^>]*` to match the id attribute
- `capture-stack.sh` uses `|| true` on brew pipelines to prevent `pipefail` killing the script when `while read` hits EOF
- When adding a new tool to `index.html`, also add it to `stack-sources.json` (or it won't be version-synced)

## Current open loops

- `vercel` drift: installed 53.1.0, latest 56.3.2 — update when convenient
- `gcloud` drift: installed 563.0.0, latest 576.0.0 — update when convenient
- `tailscale` drift: installed 1.96.5, latest 1.98.9 — update when convenient
- 2026-07-23: Mac launchd push (`chore: update stack snapshot 2026-07-23`) collided with GHA weekly sync commits (diverged branches, no file overlap — launchd only touches `stack-snapshot.json`, GHA only touches `index.html`). Resolved via rebase + push. If this recurs often, consider having `capture-stack.sh` `git pull --rebase` before committing.

## Archive

- (none)
