#!/usr/bin/env node
/**
 * Avant build Capacitor : renomme app/api pour éviter l'erreur d'export statique.
 * Les routes API Next.js ne sont pas disponibles en mode static export.
 */
import { renameSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const apiDir = join(root, 'src', 'app', 'api');
const apiBak = join(root, '.capacitor_bak_api');

if (existsSync(apiDir)) {
if (existsSync(apiBak)) {
  console.warn('[capacitor-prebuild] .capacitor_bak_api existe déjà, suppression…');
    const { rmSync } = await import('fs');
    rmSync(apiBak, { recursive: true });
  }
  renameSync(apiDir, apiBak);
  console.log('[capacitor-prebuild] src/app/api déplacé vers .capacitor_bak_api');
} else {
  console.log('[capacitor-prebuild] Pas de src/app/api, rien à faire');
}
