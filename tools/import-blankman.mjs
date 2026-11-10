// Rebuild the separate source repo first, then pass its checkout path here.
import { readFileSync, writeFileSync, cpSync } from 'node:fs';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Usage: node tools/import-blankman.mjs /path/to/blankman-the-game');
const target = new URL('../games/blankman/', import.meta.url);
cpSync(path.join(source, 'build/web'), target, { recursive: true });
const file = new URL('index.html', target);
let html = readFileSync(file, 'utf8').replaceAll('/equipment/', 'equipment/');
const body = html.lastIndexOf('</body>');
if (body < 0) throw new Error('Expected a complete standalone game');
html = html.slice(0, body) + '<script type="module" src="arcade-adapter.js"></script>' + html.slice(body);
writeFileSync(file, html);
cpSync(path.join(source, 'licenses/PHASER-LICENSE.md'), new URL('PHASER-LICENSE.md', target));
console.log('Imported Blankman with relative equipment paths and the arcade score adapter.');
