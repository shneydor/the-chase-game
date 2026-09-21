import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(path.join(out, 'assets/music'), {recursive: true});
const files = [
  'index.html',
  'assets/studio.png', 'assets/victory.png',
  ...['opening', 'cash', 'chase', 'final-team', 'final-chaser'].map(name => `assets/music/${name}.m4a`)
];
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
console.log(`Built ${files.length} website files in dist/`);
