/**
 * Détection simple de la langue d'un texte
 * Utilise des heuristiques basiques pour détecter le français et l'anglais
 */

export type DetectedLanguage = 'fr' | 'en' | 'unknown';

/**
 * Détecte la langue d'un texte
 * @param text - Le texte à analyser
 * @returns La langue détectée ('fr', 'en', ou 'unknown')
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) {
    return 'unknown';
  }

  const cleanedText = text.toLowerCase().trim();

  // Mots français communs
  const frenchWords = [
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'est', 'sont',
    'être', 'avoir', 'faire', 'aller', 'venir', 'voir', 'savoir', 'vouloir',
    'pouvoir', 'devoir', 'donner', 'prendre', 'parler', 'manger', 'boire',
    'bonjour', 'bonsoir', 'merci', 's\'il vous plaît', 'au revoir', 'oui', 'non',
    'avec', 'sans', 'pour', 'dans', 'sur', 'sous', 'entre', 'parmi'
  ];

  // Mots anglais communs
  const englishWords = [
    'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
    'should', 'may', 'might', 'must', 'go', 'come', 'see', 'know', 'want',
    'get', 'give', 'take', 'make', 'say', 'tell', 'think', 'find', 'use',
    'hello', 'hi', 'thank', 'please', 'goodbye', 'yes', 'no', 'with', 'without',
    'for', 'in', 'on', 'under', 'between', 'among'
  ];

  // Caractères spéciaux français
  const frenchChars = /[àâäéèêëïîôùûüÿç]/g;
  const hasFrenchChars = frenchChars.test(cleanedText);

  // Compter les occurrences de mots français et anglais
  let frenchCount = 0;
  let englishCount = 0;

  const words = cleanedText.split(/\s+/);

  words.forEach(word => {
    // Nettoyer le mot (enlever la ponctuation)
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '');
    
    if (frenchWords.includes(cleanWord)) {
      frenchCount++;
    }
    if (englishWords.includes(cleanWord)) {
      englishCount++;
    }
  });

  // Si le texte contient des caractères français typiques, c'est probablement du français
  if (hasFrenchChars) {
    return 'fr';
  }

  // Si on a beaucoup plus de mots français que anglais
  if (frenchCount > englishCount * 1.5 && frenchCount > 2) {
    return 'fr';
  }

  // Si on a beaucoup plus de mots anglais que français
  if (englishCount > frenchCount * 1.5 && englishCount > 2) {
    return 'en';
  }

  // Si on a des mots français mais pas beaucoup d'anglais
  if (frenchCount > 0 && englishCount === 0) {
    return 'fr';
  }

  // Si on a des mots anglais mais pas beaucoup de français
  if (englishCount > 0 && frenchCount === 0) {
    return 'en';
  }

  // Par défaut, si on ne peut pas déterminer, on retourne 'unknown'
  // Dans ce cas, on considérera que c'est dans la langue de l'utilisateur
  return 'unknown';
}

/**
 * Vérifie si un texte est dans une langue différente de celle de l'utilisateur
 * @param text - Le texte à vérifier
 * @param userLanguage - La langue de l'utilisateur ('fr' ou 'en')
 * @returns true si le texte est dans une langue différente
 */
export function isDifferentLanguage(text: string, userLanguage: 'fr' | 'en'): boolean {
  const detected = detectLanguage(text);
  
  // Si on ne peut pas détecter, on considère que c'est dans la langue de l'utilisateur
  if (detected === 'unknown') {
    return false;
  }

  return detected !== userLanguage;
}

