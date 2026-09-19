import fs from 'node:fs';
import path from 'node:path';

export function embedAssets(html, root) {
  html = html.replace(/<link rel="preload"[^>]*>\s*/g, '');
  for (const name of ['studio', 'victory']) {
    html = html.replace(`--${name}-art:url('assets/${name}.png');`, '');
    html = html.replaceAll(`var(--${name}-art)`, `url('assets/${name}.png')`);
    html = html.replaceAll(`assets/${name}.png`, 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', name + '.png')).toString('base64'));
  }
  for (const name of ['opening', 'cash', 'chase', 'final-team', 'final-chaser']) {
    const relative = `assets/music/${name}.m4a`;
    html = html.replaceAll(relative, 'data:audio/mp4;base64,' + fs.readFileSync(path.join(root, relative)).toString('base64'));
  }
  return html;
}
