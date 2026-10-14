// Content hash of the files a proof report covers. A report is stale when this hash changes.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listFiles } from './files.js';

/** Contract and manifest files that also invalidate a report. */
export const CONTRACT_FILES = ['.craft/DESIGN.md', '.craft/tokens.json', '.craft/craft.config.json', '.craft/decisions.md', 'package.json'];

/**
 * @param {string} root
 * @param {{ ignore?: string[] }} [opts]
 * @returns {{ algorithm: 'sha256', value: string, fileCount: number, files: string[] }}
 */
export function contentHash(root, opts = {}) {
  const files = [
    ...listFiles(root, { ignore: opts.ignore ?? [] }),
    ...CONTRACT_FILES.filter((f) => existsSync(join(root, f)))
  ].sort();
  const h = createHash('sha256');
  for (const f of files) {
    const fileHash = createHash('sha256').update(readFileSync(join(root, f))).digest('hex');
    h.update(`${f}\0${fileHash}\n`);
  }
  return { algorithm: 'sha256', value: h.digest('hex'), fileCount: files.length, files };
}
