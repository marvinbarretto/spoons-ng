/**
 * Safe way to simulate __dirname in ESM modules (.mjs or `type: module` projects)
 *
 * - __dirname doesn't exist in ES modules
 * - So we derive it using import.meta.url
 *
 * This helper returns a function you can call to resolve file paths
 * relative to the current module file.
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Returns a function that lets you resolve paths relative to the calling module.
 *
 * Example usage:
 *   const resolvePath = resolveRelativePath(import.meta.url);
 *   const envPath = resolvePath('.env');
 */
export function resolveRelativePath(metaUrl: string) {
  const moduleDir = dirname(fileURLToPath(metaUrl));
  return (...pathSegments: string[]) => join(moduleDir, ...pathSegments);
}
