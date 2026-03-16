#!/usr/bin/env node

/**
 * Script pour ajouter automatiquement des IDs de test aux éléments HTML/JSX
 * Usage: node scripts/add-test-ids.js [file-path]
 */

const fs = require('fs');
const path = require('path');

// Patterns pour identifier les éléments et générer des IDs
const patterns = {
  buttons: [
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Publier[\s\S]*?<\/button>/gi, id: 'btn-publish-listing' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Sauvegarder[\s\S]*?<\/button>/gi, id: 'btn-save-listing' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Suivant[\s\S]*?<\/button>/gi, id: 'btn-next-step' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Précédent[\s\S]*?<\/button>/gi, id: 'btn-prev-step' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Rechercher[\s\S]*?<\/button>/gi, id: 'btn-search-parkings' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Filtres[\s\S]*?<\/button>/gi, id: 'btn-filter-advanced' },
    { pattern: /<button[^>]*onClick[^>]*>[\s\S]*?Réinitialiser[\s\S]*?<\/button>/gi, id: 'btn-reset-filters' },
  ],
  inputs: [
    { pattern: /<input[^>]*type=["']text["'][^>]*placeholder=["'][^']*ville["'][^>]*>/gi, id: 'input-city-search' },
    { pattern: /<input[^>]*type=["']text["'][^>]*placeholder=["'][^']*rechercher["'][^>]*>/gi, id: 'input-search-query' },
    { pattern: /<input[^>]*type=["']email["'][^>]*>/gi, id: 'input-email-login' },
    { pattern: /<input[^>]*type=["']password["'][^>]*>/gi, id: 'input-password-login' },
  ],
};

function addIdToElement(content, pattern, id) {
  // Vérifier si l'ID existe déjà
  if (content.includes(`id="${id}"`) || content.includes(`id='${id}'`)) {
    return content;
  }
  
  // Ajouter l'ID à l'élément
  return content.replace(pattern, (match) => {
    // Vérifier si l'élément a déjà un id
    if (match.includes('id=')) {
      return match;
    }
    // Ajouter l'ID après le tag d'ouverture
    return match.replace(/<(\w+)([^>]*)>/, `<$1 id="${id}"$2>`);
  });
}

function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Traiter les boutons
  for (const { pattern, id } of patterns.buttons) {
    const newContent = addIdToElement(content, pattern, id);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`  Added ID: ${id}`);
    }
  }
  
  // Traiter les inputs
  for (const { pattern, id } of patterns.inputs) {
    const newContent = addIdToElement(content, pattern, id);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`  Added ID: ${id}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated ${filePath}`);
  } else {
    console.log(`  - No changes needed`);
  }
}

// Main
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node scripts/add-test-ids.js [file-path]');
  process.exit(1);
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

processFile(fullPath);
