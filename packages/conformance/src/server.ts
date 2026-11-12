import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Fixture } from './types.js';

// Static, animation-free pages: both runners render exactly this markup, so a
// change in the output can only come from the adapter under test.
const page = (accent: string, extra = '') => `<!doctype html>
<html><head><style>
  body { margin: 0; font: 24px/1.4 Arial, sans-serif; background: #fafafa; color: #222; }
  main { padding: 32px; }
  .card { border: 4px solid ${accent}; border-radius: 12px; padding: 16px; width: 320px; background: ${accent}22; }
  .filler { height: 1200px; background: linear-gradient(#fafafa, #ddd); }
</style></head>
<body><main>
  <h1>Conformance</h1>
  <div class="card"><p>Hello.</p></div>
  ${extra}
</main></body></html>`;

const FIXTURES: Record<Fixture, string> = {
  blue: page('#3b82f6'),
  red: page('#ef4444'),
  tall: page('#3b82f6', '<div class="filler"></div>'),
};

export const startFixtureServer = async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get(
      'v',
    ) as Fixture | null;
    const html = FIXTURES[name ?? 'blue'];
    res.writeHead(html ? 200 : 404, { 'content-type': 'text/html' });
    res.end(html ?? 'unknown fixture');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
