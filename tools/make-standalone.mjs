import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {embedAssets} from './embed-assets.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, '.artifact/chase-game.html');
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, embedAssets(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), root));
console.log(`Created ${out}`);
