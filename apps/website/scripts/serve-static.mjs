// Serves .output/public like Cloudflare Pages: clean URLs and a real 404 status with 404.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import sirv from 'sirv';

const root = new URL('../.output/public/', import.meta.url).pathname;
const files = sirv(root, { dev: true, extensions: ['html'] });
const port = Number(process.env.PORT ?? 4173);

createServer(async (req, res) => {
  files(req, res, async () => {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(await readFile(`${root}404.html`));
  });
}).listen(port);
