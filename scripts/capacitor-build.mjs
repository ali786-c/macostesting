#!/usr/bin/env node
/**
 * Build Next.js pour Capacitor (export statique) + nettoyage du bundle.
 *
 * Étapes :
 *  1. Masque src/app/api (incompatible avec static export)
 *  2. Lance next build avec CAPACITOR_BUILD=1
 *  3. Restaure src/app/api
 *  4. Nettoie le dossier out/ pour l'app native :
 *     - Conserve les fichiers .txt RSC (nécessaires pour le SPA fallback Capacitor iOS)
 *     - Supprime les vidéos de la homepage (inutiles dans l'app native)
 *     - Supprime les assets uniquement web (fond.jpg, etc.)
 */
import { renameSync, existsSync, rmSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'out');
const apiDir = join(root, 'src', 'app', 'api');
const apiBak = join(root, '.capacitor_bak_api');

function prebuild() {
  if (existsSync(apiDir)) {
    if (existsSync(apiBak)) rmSync(apiBak, { recursive: true });
    renameSync(apiDir, apiBak);
    console.log('[capacitor-build] src/app/api masqué pour l\u2019export statique');
  }
}

function postbuild() {
  if (existsSync(apiBak)) {
    if (existsSync(apiDir)) rmSync(apiDir, { recursive: true });
    renameSync(apiBak, apiDir);
    console.log('[capacitor-build] src/app/api restauré');
  }
}

/**
 * Supprime récursivement tous les fichiers .txt dans un répertoire.
 * Ces fichiers sont des métadonnées RSC de Next.js (prefetch SPA) inutiles
 * dans Capacitor où toute navigation dynamique est une full-page load.
 */
function deleteTxtFiles(dir, stats = { files: 0, bytes: 0 }) {
  if (!existsSync(dir)) return stats;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      deleteTxtFiles(full, stats);
    } else if (extname(entry) === '.txt') {
      stats.bytes += s.size;
      stats.files++;
      unlinkSync(full);
    }
  }
  return stats;
}

/**
 * Supprime les .txt UNIQUEMENT dans les sous-dossiers à ID numérique (pages dynamiques [id]).
 * Conserve les .txt des pages statiques (ex: /host/my-places, /host/create, /reservations).
 * Les pages statiques ont besoin de leurs .txt RSC pour que router.push SPA fonctionne.
 * Les pages dynamiques [id] utilisent capacitorNavigate (full page load) → pas besoin de .txt.
 */
function deleteTxtFilesInNumericSubdirs(parentDir, stats = { files: 0, bytes: 0 }) {
  if (!existsSync(parentDir)) return stats;
  for (const entry of readdirSync(parentDir)) {
    // Seulement les sous-dossiers dont le nom est un entier (ex: "0", "123", "299")
    if (!/^\d+$/.test(entry)) continue;
    const subDir = join(parentDir, entry);
    const s = statSync(subDir);
    if (s.isDirectory()) {
      deleteTxtFiles(subDir, stats);
    }
  }
  return stats;
}

/**
 * Supprime un fichier s'il existe.
 */
function deleteIfExists(filePath) {
  if (existsSync(filePath)) {
    const size = statSync(filePath).size;
    unlinkSync(filePath);
    console.log(`[capacitor-build] Supprimé : ${filePath.replace(root, '')} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

/**
 * Post-build : nettoie le bundle out/ pour l'app native.
 */
function cleanBundle() {
  if (!existsSync(outDir)) return;

  console.log('[capacitor-build] Nettoyage du bundle...');

  // IMPORTANT : On NE supprime PAS les fichiers .txt RSC des routes dynamiques.
  //
  // Pourquoi : Capacitor iOS sert toujours index.html (racine) comme SPA fallback pour
  // toutes les routes (y compris /parking/6/, /host/my-places/225/, etc.).
  // La page racine (page.tsx) détecte ce fallback et appelle router.replace(pathname)
  // pour naviguer vers la vraie page via SPA. Cette navigation SPA requiert les fichiers
  // .txt RSC. Sans eux → "Failed to fetch RSC payload" → "Falling back to browser navigation"
  // → window.location.href = même URL → root index.html rechargé → boucle infinie.
  //
  // Les fichiers .txt sont donc indispensables pour toute navigation via le SPA fallback.

  // 1. Supprimer les vidéos de la homepage (web uniquement, inutiles dans l'app native)
  deleteIfExists(join(outDir, 'Homepage.mp4'));
  deleteIfExists(join(outDir, 'Homepage2.mp4'));

  // 2. Supprimer les images de la landing page web
  deleteIfExists(join(outDir, 'fond.jpg'));

  console.log('[capacitor-build] Bundle nettoyé.');
}

// ── Main ────────────────────────────────────────────────────────────────────

prebuild();

const result = spawnSync('npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    CAPACITOR_BUILD: '1',
    // iOS/Android : toujours utiliser l'API Render en prod, jamais localhost
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://rentoall.onrender.com/api',
  },
});

postbuild();

if (result.status === 0) {
  cleanBundle();
}

process.exit(result.status ?? 1);
