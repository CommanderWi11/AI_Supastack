# AI_Supastack — Project Instructions

This project handles: **a single-page reference site for my entire AI software stack**, deployed via GitHub Pages, with live editing via GitHub OAuth + Supabase.

These instructions stack on top of `01_Personal_HQ/CLAUDE.md` and the root AI OS instructions.

## Stack

- **Single HTML file** (`index.html`) — wiki-style structured list
- **Hosting:** GitHub Pages at `commanderwi11.github.io/AI_Supastack/`
- **Repo:** `CommanderWi11/AI_Supastack`
- **Edits:** In-page UI commits back via GitHub Contents API
- **Auth:** GitHub OAuth via Supabase

## Files

- `index.html` — main page
- `whoop-guide.html` — companion guide (linked from main)
- `downloads/` — downloadable assets
- `docs/ai-stack-page-design.md` — design spec (moved here from `docs/superpowers/specs/` during migration)

## Rules

- **Tools only** — no project listings on the page
- Each tool entry: links to official docs + personal notes/gotchas
- Single HTML file — keep it self-contained, no build step

## Resources

- `Resources/` — project-specific reference docs (placeholder)
- `docs/ai-stack-page-design.md` — design decisions reference

## Memory

See `MEMORY.md`.
