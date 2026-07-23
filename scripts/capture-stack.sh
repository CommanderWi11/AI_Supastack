#!/usr/bin/env bash
set -euo pipefail

# launchd runs with a bare PATH; git's credential helper shells out to `gh`
# (homebrew), so make sure it's reachable.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

REPO_DIR="/Users/openbob/Library/Mobile Documents/com~apple~CloudDocs/AI Coworking/01_Personal_HQ/Projects/Knowledge_HQ/AI_Supastack"
SNAPSHOT="$REPO_DIR/scripts/stack-snapshot.json"

log() { echo "[capture-stack] $*"; }

log "Starting capture at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# --- brew leaves (top-level only, no transitive deps) ---
brew_json=$(brew leaves --formula 2>/dev/null | while read -r formula; do
  ver=$(brew info --json=v2 "$formula" 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
f = d.get('formulae', [{}])[0]
installed = f.get('installed', [])
print(installed[0].get('version', '') if installed else '')
" 2>/dev/null || true)
  [ -n "$ver" ] && printf '"%s": "%s",' "$formula" "$ver"
done | sed 's/,$//' || true)
brew_obj="{$brew_json}"

# --- brew casks ---
cask_json=$(brew list --cask --versions 2>/dev/null | while read -r line; do
  cask=$(echo "$line" | awk '{print $1}')
  ver=$(echo "$line" | awk '{print $2}')
  printf '"%s": "%s",' "$cask" "$ver"
done | sed 's/,$//' || true)
cask_obj="{$cask_json}"

# --- npm globals (exclude symlinked local packages) ---
npm_obj=$(npm ls -g --depth=0 --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('dependencies', {})
out = {}
for pkg, info in deps.items():
    resolved = info.get('resolved', '')
    if not resolved.startswith('file:'):
        out[pkg] = info.get('version', '')
print(json.dumps(out))
" 2>/dev/null || echo '{}')

# --- claude plugins ---
plugins_dir="$HOME/.claude/plugins/cache"
plugins_arr="[]"
if [ -d "$plugins_dir" ]; then
  plugins_arr=$(find "$plugins_dir" -mindepth 2 -maxdepth 2 -type d 2>/dev/null \
    | sed "s|$plugins_dir/||" | sort \
    | python3 -c "import sys, json; lines=[l.strip() for l in sys.stdin if l.strip()]; print(json.dumps(lines))")
fi

# --- claude skills ---
skills_dir="$HOME/.claude/skills"
skills_arr="[]"
if [ -d "$skills_dir" ]; then
  skills_arr=$(ls -1 "$skills_dir" 2>/dev/null | sort \
    | python3 -c "import sys, json; lines=[l.strip() for l in sys.stdin if l.strip()]; print(json.dumps(lines))")
fi

# --- MCP servers: union of ~/.claude.json and ~/.claude/settings.json ---
mcp_servers=$(python3 - <<'PYEOF'
import json, os

def get_mcp_keys(path):
    try:
        with open(os.path.expanduser(path)) as f:
            data = json.load(f)
        return list(data.get('mcpServers', {}).keys())
    except Exception:
        return []

keys = sorted(set(get_mcp_keys('~/.claude.json')) | set(get_mcp_keys('~/.claude/settings.json')))
print(json.dumps(keys))
PYEOF
)

# --- assemble and write snapshot ---
captured_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

python3 - "$brew_obj" "$cask_obj" "$npm_obj" "$plugins_arr" "$skills_arr" "$mcp_servers" "$captured_at" > "$SNAPSHOT" <<'PYEOF'
import sys, json

brew_obj, cask_obj, npm_obj, plugins_arr, skills_arr, mcp_servers, captured_at = sys.argv[1:]

snapshot = {
    "capturedAt": captured_at,
    "brew": json.loads(brew_obj),
    "brewCasks": json.loads(cask_obj),
    "npm": json.loads(npm_obj),
    "claudePlugins": json.loads(plugins_arr),
    "claudeSkills": json.loads(skills_arr),
    "mcpServers": json.loads(mcp_servers),
}
print(json.dumps(snapshot, indent=2))
PYEOF

log "Snapshot written to $SNAPSHOT"

# --- commit and push ---
cd "$REPO_DIR"
git add scripts/stack-snapshot.json
if git diff --cached --quiet; then
  log "No changes to snapshot — skipping commit"
else
  git commit -m "chore: update stack snapshot $(date +%Y-%m-%d)"
  # GHA's weekly sync commits to index.html can land between launchd runs;
  # rebase first so a normal push doesn't get rejected as non-fast-forward.
  git pull --rebase origin main
  git push
  log "Pushed snapshot"
fi

log "Done"
