import { mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, 'dist');
if (path.relative(root, output) !== 'dist') throw new Error('Unexpected build output path');
await rm(output, { recursive: true, force: true });
const files = ['index.html', 'src/index.css', 'src/main.js', 'src/platform.js', 'src/data/prompts.js'];
for (const file of files) {
  const target = path.join(root, 'dist', file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
console.log(`Built ${files.length} frontend files in dist/. Deploy with the Node server for platform identity.`);
