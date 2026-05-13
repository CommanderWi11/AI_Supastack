# AI Stack Page — Design Spec

## Context

Luis needs a single-page reference for his entire AI software stack so that he (and collaborators) can rebuild the setup from scratch on a new machine. The page should be deployed on GitHub Pages, organized as a step-by-step installation guide, and support live editing (add/remove/edit entries) that commits changes back to the repo via GitHub OAuth through Supabase.

## Decisions

- **Format**: Single HTML file, structured list / wiki style (option C from brainstorm)
- **Audience**: Luis + collaborators
- **Detail level**: Links to official docs + personal notes/gotchas per tool
- **Hosting**: `CommanderWi11/ai-supastack` repo, deployed via GitHub Pages (`commanderwi11.github.io/ai-supastack/`)
- **Editability**: In-page UI (add/edit/remove) that commits back to repo via GitHub Contents API
- **Auth**: GitHub OAuth via Supabase (user already has Supabase experience)
- **Scope**: Tools only — no project listings

---

## Architecture

### Page Structure

Single `index.html` with all CSS/JS inline. No external dependencies except Supabase JS client (loaded from CDN).

```
index.html
├── <style> — all CSS inline
├── <header> — title, subtitle, login button
├── <nav> — sticky sidebar TOC (auto-generated from sections)
├── <main> — tool entries grouped by section
│   └── Each entry: name, version, links[], notes (collapsible)
├── <footer> — last updated date
└── <script> — all JS inline (Supabase auth + GitHub API + edit UI)
```

### Data Model

Tool entries are stored as a JSON array in a `<script type="application/json" id="stack-data">` block inside the HTML. The page renders from this data on load. Edits modify this JSON, then the entire HTML file is committed back to GitHub.

```json
{
  "sections": [
    {
      "id": "homebrew",
      "title": "Homebrew",
      "order": 1,
      "entries": [
        {
          "name": "Homebrew",
          "version": "latest",
          "links": [
            {"label": "Install", "url": "https://brew.sh"}
          ],
          "notes": "Run the one-liner from brew.sh. Installs Xcode CLI tools automatically.",
          "tags": ["package-manager"]
        }
      ]
    }
  ],
  "meta": {
    "lastUpdated": "2026-05-01",
    "owner": "Luis"
  }
}
```

### Sections (Installation Order)

| # | Section ID | Title | Example Entries |
|---|---|---|---|
| 1 | `homebrew` | Homebrew | Homebrew |
| 2 | `terminal` | Terminal | Ghostty, iTerm2 |
| 3 | `runtimes` | Dev Runtimes | Node.js, Python, Deno, uv |
| 4 | `cli-tools` | CLI Tools | gh, gcloud, fzf, ffmpeg, yt-dlp, SQLite |
| 5 | `core-ai` | Core AI Tools | Claude Code, Ollama, MLX, Whisper, GGML |
| 6 | `plugins` | Claude Code Plugins | superpowers, frontend-design, claude-mem |
| 7 | `mcp-servers` | MCP Servers | Notion, Guesty, Canva, Google Drive |
| 8 | `browser-auto` | Browser Automation | Playwriter, pw-demux hooks |
| 9 | `email` | Email | Himalaya |
| 10 | `remote-access` | Remote Access | Tailscale, NoMachine |

### Entry Format (per tool)

Each entry renders as a row with:
- **Name** (bold) + **version** (muted)
- **Links**: clickable pills/badges (docs, repo, install page)
- **Notes**: collapsible `<details>` with personal gotchas, config tips
- **Actions** (when authenticated): Edit, Delete buttons

### Visual Style

- Clean, minimal, document-style (wiki aesthetic)
- Sticky sidebar TOC on left, scrollable content on right
- Section headers with colored left border
- Rows alternate subtle background for scannability
- Responsive: sidebar collapses to top nav on mobile
- Color scheme: light with blue accents (GitHub-like palette)

---

## Auth & Editing Flow

### Supabase Setup

1. Create a new Supabase project for this page (or reuse existing — TBD with Luis)
2. Enable GitHub as an OAuth provider in Supabase dashboard
3. Configure a **custom GitHub OAuth App** (not Supabase's built-in) to request `public_repo` scope — Supabase's default GitHub provider only grants `user:email`. The custom app's client ID/secret go into Supabase's GitHub provider config.
4. Store the Supabase URL + anon key in the HTML (these are public by design)

### User Flow

1. **View mode** (default): page loads, renders all entries from embedded JSON. No auth needed.
2. **Edit mode**: user clicks "Login with GitHub" → Supabase OAuth redirect → returns with session
3. **Authenticated UI**: each entry shows Edit/Delete buttons. A floating "Add Entry" button appears.
4. **Add**: modal form with fields: section (dropdown), name, version, links (repeatable), notes
5. **Edit**: inline editing — click field to modify, save button commits
6. **Delete**: confirmation prompt, then remove from JSON
7. **Save**: on any change:
   - Update the JSON block in the HTML string
   - Update `meta.lastUpdated`
   - Commit via GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/index.html`)
   - Page reloads with fresh content from GitHub Pages (may take ~30s for rebuild)

### GitHub API Integration

```
PUT https://api.github.com/repos/CommanderWi11/ai-supastack/contents/index.html
Headers: Authorization: token {github_access_token}
Body: {
  message: "Update AI stack: {description of change}",
  content: base64(updated_html),
  sha: {current_file_sha}
}
```

The page fetches its own SHA on auth to enable updates.

---

## Pre-populated Data

All entries will be pre-populated from the discovered stack inventory:

**Homebrew**: Homebrew (brew.sh)
**Terminal**: Ghostty, iTerm2
**Dev Runtimes**: Node.js v25.9.0, Python 3.14, Deno 2.7.9, uv
**CLI Tools**: gh (GitHub CLI), gcloud, fzf, ffmpeg, yt-dlp, SQLite
**Core AI Tools**: Claude Code v2.1.104, Ollama v0.19.0 (qwen2.5:14b), MLX/MLX-C, Whisper (whisper-cpp), GGML
**Claude Code Plugins**: superpowers, frontend-design, claude-mem
**MCP Servers**: Notion MCP (@notionhq/notion-mcp-server), Guesty MCP (custom), Canva MCP, Google Drive MCP
**Browser Automation**: Playwriter CLI, pw-demux hooks
**Email**: Himalaya (2 GMX accounts)
**Remote Access**: Tailscale, NoMachine

Each entry will include links to official docs/repos and placeholder notes that Luis can fill in with personal gotchas.

---

## Verification Plan

1. **Local test**: open `index.html` in browser, verify all sections render, TOC links work, collapsible notes expand
2. **Auth test**: click Login with GitHub, verify Supabase OAuth flow completes and edit UI appears
3. **Edit test**: add a test entry, verify it commits to repo and appears after page reload
4. **Delete test**: remove the test entry, verify commit and removal
5. **Mobile test**: check responsive layout — sidebar collapses, entries remain readable
6. **Fresh clone test**: clone the repo on a different machine, open the page, verify view mode works without auth
