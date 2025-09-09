import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path'; import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_FILE || (__dirname + '/mixtli-db.json');

export async function load() {
  try {
    const raw = await readFile(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    const fresh = { users: [], uploads: [] };
    await save(fresh);
    return fresh;
  }
}
export async function save(data) {
  await mkdir(__dirname, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}
