#!/usr/bin/env node
/**
 * Après build Capacitor : restaure app/api.
 */
import { renameSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const apiDir = join(root, 'src', 'app', 'api');
const apiBak = join(root, '.capacitor_bak_api');

if (existsSync(apiBak)) {
  if (existsSync(apiDir)) {
    const { rmSync } = await import('fs');
    rmSync(apiDir, { recursive: true });
  }
  renameSync(apiBak, apiDir);
  console.log('[capacitor-postbuild] .capacitor_bak_api restauré en src/app/api');
} else {
  console.log('[capacitor-postbuild] Pas de .capacitor_bak_api, rien à faire');
}
