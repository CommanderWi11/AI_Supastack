import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Pure functions (exported for tests)
// ---------------------------------------------------------------------------

export function parseHtmlJson(html) {
  const match = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('JSON block not found in HTML');
  return JSON.parse(match[1]);
}

export function injectHtmlJson(html, data) {
  return html.replace(
    /(<script type="application\/json">)([\s\S]*?)(<\/script>)/,
    (_, open, _content, close) => `${open}\n${JSON.stringify(data, null, 2)}\n${close}`
  );
}

export function getInstalledVersion(entryId, sources, snapshot) {
  const src = sources[entryId];
  if (!src || src.type === 'manual' || src.type === 'github') return null;
  if (src.type === 'brew') return snapshot.brew?.[src.formula] ?? null;
  if (src.type === 'brew-cask') return snapshot.brewCasks?.[src.cask] ?? null;
  if (src.type === 'npm') return snapshot.npm?.[src.package] ?? null;
  return null;
}

export function findOrCreateUncategorized(data) {
  let section = data.sections.find(s => s.id === 'uncategorized');
  if (!section) {
    const maxOrder = Math.max(0, ...data.sections.map(s => s.order ?? 0));
    section = { id: 'uncategorized', title: 'Uncategorized', order: maxOrder + 1, entries: [] };
    data.sections.push(section);
  }
  return section;
}

export function createStubEntry(name) {
  return {
    id: name.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
    name,
    notes: 'Auto-detected. Add to correct section.',
    links: [],
  };
}

export function buildCommitMessage(date, updated, behind, stubs, skipped) {
  const lines = [`chore: weekly stack sync ${date}`, ''];
  if (updated.length === 0 && behind.length === 0 && stubs.length === 0) {
    lines.push('ℹ️ No version changes detected');
  }
  if (updated.length) {
    lines.push(`🔄 Updated: ${updated.map(u => `${u.id} ${u.from}→${u.to}`).join(', ')}`);
  }
  if (behind.length) {
    lines.push(`⚠️ Behind: ${behind.map(b => `${b.id} (installed ${b.installed}, latest ${b.latest})`).join(', ')}`);
  }
  if (stubs.length) {
    lines.push(`➕ New stubs: ${stubs.join(', ')} (Uncategorized)`);
  }
  if (skipped > 0) {
    lines.push(`ℹ️ ${skipped} entries skipped (manual or registry error)`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Registry fetchers
// ---------------------------------------------------------------------------

async function fetchLatest(entryId, src) {
  try {
    if (src.type === 'brew') {
      const r = await fetch(`https://formulae.brew.sh/api/formula/${src.formula}.json`);
      if (!r.ok) return null;
      const j = await r.json();
      return j.versions?.stable ?? null;
    }
    if (src.type === 'brew-cask') {
      const r = await fetch(`https://formulae.brew.sh/api/cask/${src.cask}.json`);
      if (!r.ok) return null;
      const j = await r.json();
      return j.version ?? null;
    }
    if (src.type === 'npm') {
      const r = await fetch(`https://registry.npmjs.org/${src.package}`);
      if (!r.ok) return null;
      const j = await r.json();
      return j['dist-tags']?.latest ?? null;
    }
    if (src.type === 'github') {
      const headers = {};
      if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
      const r = await fetch(`https://api.github.com/repos/${src.repo}/releases/latest`, { headers });
      if (!r.ok) return null;
      const j = await r.json();
      return j.tag_name ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function main() {
  const htmlPath = path.join(ROOT, 'index.html');
  const sourcesPath = path.join(__dirname, 'stack-sources.json');
  const snapshotPath = path.join(__dirname, 'stack-snapshot.json');

  if (!existsSync(sourcesPath)) {
    console.error('stack-sources.json missing — configuration error');
    process.exit(1);
  }

  const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
  const html = readFileSync(htmlPath, 'utf8');

  let data;
  try {
    data = parseHtmlJson(html);
  } catch {
    console.error('Failed to parse inline JSON from index.html');
    process.exit(1);
  }

  let snapshot = null;
  if (existsSync(snapshotPath)) {
    snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  } else {
    console.log('stack-snapshot.json not found — running without installed-version data');
  }

  // Build flat entry map (id → entry)
  const entryMap = new Map();
  for (const section of data.sections) {
    for (const entry of section.entries ?? []) {
      entryMap.set(entry.id, entry);
    }
  }

  // Fetch latest versions and update entries
  const updated = [];
  const behind = [];
  let skipped = 0;

  for (const [entryId, src] of Object.entries(sources)) {
    if (src.type === 'manual') { skipped++; continue; }
    const latest = await fetchLatest(entryId, src);
    if (!latest) { console.warn(`⚠️ API error or no data: ${entryId}`); skipped++; continue; }

    const entry = entryMap.get(entryId);
    if (!entry) continue;

    const prev = entry.version;
    if (prev !== latest) {
      updated.push({ id: entryId, from: prev ?? '?', to: latest });
    }
    entry.version = latest;

    if (snapshot) {
      const installed = getInstalledVersion(entryId, sources, snapshot);
      if (installed && installed !== latest) {
        behind.push({ id: entryId, installed, latest });
      }
    }
  }

  // Detect tools in sources+snapshot that aren't on the page yet → stubs
  const stubs = [];
  if (snapshot) {
    const knownByLookupKey = new Map();
    for (const [id, src] of Object.entries(sources)) {
      if (src.formula) knownByLookupKey.set(src.formula, id);
      if (src.cask) knownByLookupKey.set(src.cask, id);
      if (src.package) knownByLookupKey.set(src.package, id);
    }

    const allInstalled = [
      ...Object.keys(snapshot.brew ?? {}),
      ...Object.keys(snapshot.brewCasks ?? {}),
      ...Object.keys(snapshot.npm ?? {}),
    ];

    for (const toolName of allInstalled) {
      const mappedId = knownByLookupKey.get(toolName);
      if (!mappedId) continue;
      if (entryMap.has(mappedId)) continue;
      const section = findOrCreateUncategorized(data);
      const stub = createStubEntry(toolName);
      section.entries.push(stub);
      stubs.push(toolName);
    }
  }

  // Update lastUpdated
  const today = new Date().toISOString().slice(0, 10);
  data.meta = { ...data.meta, lastUpdated: today };

  // Write patched index.html
  writeFileSync(htmlPath, injectHtmlJson(html, data), 'utf8');
  console.log('index.html updated');

  // Write commit message
  const msg = buildCommitMessage(today, updated, behind, stubs, skipped);
  writeFileSync('/tmp/sync-commit-msg.txt', msg, 'utf8');
  console.log('Commit message written to /tmp/sync-commit-msg.txt');
  console.log(msg);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
