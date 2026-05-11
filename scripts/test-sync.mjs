import assert from 'node:assert/strict';

const {
  parseHtmlJson,
  injectHtmlJson,
  getInstalledVersion,
  findOrCreateUncategorized,
  createStubEntry,
  buildCommitMessage,
} = await import('./sync-stack.mjs');

const FIXTURE_JSON = {
  meta: { lastUpdated: '2026-01-01' },
  sections: [
    {
      id: 'cli-tools',
      title: 'CLI Tools',
      order: 1,
      entries: [
        { id: 'gh', name: 'gh', version: '2.89.0', links: [], notes: '' },
        { id: 'fzf', name: 'fzf', version: '0.70.0', links: [], notes: '' },
      ],
    },
  ],
};

function makeFixtureHtml(json) {
  return `<!DOCTYPE html><html><body>\n<script type="application/json">\n${JSON.stringify(json, null, 2)}\n<\/script>\n</body></html>`;
}

// parseHtmlJson
{
  const html = makeFixtureHtml(FIXTURE_JSON);
  const parsed = parseHtmlJson(html);
  assert.deepEqual(parsed.meta.lastUpdated, '2026-01-01');
  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].entries[0].id, 'gh');
  console.log('✓ parseHtmlJson: parses inline JSON block');
}
{
  assert.throws(() => parseHtmlJson('<html></html>'), /JSON block not found/);
  console.log('✓ parseHtmlJson: throws when block is absent');
}

// injectHtmlJson
{
  const html = makeFixtureHtml(FIXTURE_JSON);
  const updated = { ...FIXTURE_JSON, meta: { lastUpdated: '2026-05-11' } };
  const out = injectHtmlJson(html, updated);
  const reparsed = parseHtmlJson(out);
  assert.equal(reparsed.meta.lastUpdated, '2026-05-11');
  assert.equal(reparsed.sections[0].entries[0].id, 'gh');
  console.log('✓ injectHtmlJson: round-trips JSON back into HTML');
}

// getInstalledVersion
{
  const snapshot = {
    brew: { gh: '2.89.0', fzf: '0.70.0' },
    brewCasks: { ghostty: '1.3.1' },
    npm: { '@anthropic-ai/claude-code': '2.1.104' },
  };
  const sources = {
    gh: { type: 'brew', formula: 'gh' },
    ghostty: { type: 'brew-cask', cask: 'ghostty' },
    'claude-code': { type: 'npm', package: '@anthropic-ai/claude-code' },
    bmad: { type: 'manual' },
  };
  assert.equal(getInstalledVersion('gh', sources, snapshot), '2.89.0');
  assert.equal(getInstalledVersion('ghostty', sources, snapshot), '1.3.1');
  assert.equal(getInstalledVersion('claude-code', sources, snapshot), '2.1.104');
  assert.equal(getInstalledVersion('bmad', sources, snapshot), null);
  assert.equal(getInstalledVersion('unknown-id', sources, snapshot), null);
  console.log('✓ getInstalledVersion: resolves brew/cask/npm/manual/unknown');
}

// findOrCreateUncategorized
{
  const data = JSON.parse(JSON.stringify(FIXTURE_JSON));
  const section = findOrCreateUncategorized(data);
  assert.equal(section.id, 'uncategorized');
  assert.equal(section.title, 'Uncategorized');
  assert.equal(data.sections.length, 2);
  const again = findOrCreateUncategorized(data);
  assert.equal(data.sections.length, 2);
  assert.equal(section, again);
  console.log('✓ findOrCreateUncategorized: creates once, returns existing');
}

// createStubEntry
{
  const stub = createStubEntry('my-tool');
  assert.equal(stub.id, 'my-tool');
  assert.equal(stub.name, 'my-tool');
  assert.ok(stub.notes.includes('Auto-detected'));
  assert.equal(stub.version, undefined);
  console.log('✓ createStubEntry: creates minimal stub without version field');
}

// buildCommitMessage
{
  const msg = buildCommitMessage('2026-05-11',
    [{ id: 'gh', from: '2.89.0', to: '2.91.0' }],
    [{ id: 'ollama', installed: '0.19.0', latest: '0.21.0' }],
    ['bun'],
    3
  );
  assert.ok(msg.includes('chore: weekly stack sync 2026-05-11'));
  assert.ok(msg.includes('gh'));
  assert.ok(msg.includes('ollama'));
  assert.ok(msg.includes('bun'));
  assert.ok(msg.includes('3 entries skipped'));
  console.log('✓ buildCommitMessage: includes all sections');
}
{
  const msg = buildCommitMessage('2026-05-11', [], [], [], 0);
  assert.ok(msg.includes('No version changes'));
  console.log('✓ buildCommitMessage: handles empty run');
}

console.log('\nAll tests passed.');
