/**
 * Bot FAQ : matching sur questions préenregistrées
 * Optimisé pour couvrir tout le site Rentoall
 */

import { FAQ_DATA, SUGGESTED_QUESTIONS, type FAQItem } from './faq-data';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlever les accents
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter((w) => w.length >= 2));
}

// Synonymes : si un mot FAQ est dans un groupe, on ajoute tout le groupe pour le matching
const SYNONYM_GROUPS: string[][] = [
  ['reserver', 'reservation', 'book', 'booking', 'louer', 'reserv'],
  ['annuler', 'annulation', 'cancel', 'annule'],
  ['payer', 'paiement', 'payement', 'payment', 'carte', 'cb', 'banque'],
  ['compte', 'account', 'inscription', 'inscrire', 'profil'],
  ['proprietaire', 'owner', 'loueur', 'host', 'hote'],
  ['message', 'messagerie', 'contact', 'ecrire', 'conversation'],
  ['favori', 'favoris', 'coeur', 'sauvegarder', 'wishlist'],
  ['calendrier', 'agenda', 'disponibilite', 'disponibilites'],
  ['parking', 'cave', 'box', 'bien', 'annonce', 'place', 'espace'],
  ['rechercher', 'recherche', 'trouver', 'search', 'destination'],
  ['tarif', 'prix', 'cout', 'frais', 'commission', 'price'],
  ['support', 'aide', 'help', 'contacter', 'assistance'],
  ['cgu', 'cgv', 'conditions', 'general', 'vente', 'utilisation', 'legal'],
  ['confidentialite', 'privacy', 'donnees', 'vie', 'privee'],
  ['parrain', 'parrainage', 'filleul', 'referral', 'inviter'],
  ['instantanee', 'instant', 'immediat', 'direct'],
  ['versement', 'paiement', 'transfert', 'virement', 'recevoir'],
  ['debite', 'debit', 'prelevement', 'charge', 'preleve'],
  ['stripe', 'paiement', 'carte', 'cb'],
];

function expandWithSynonyms(words: Set<string>): Set<string> {
  const expanded = new Set(words);
  for (const group of SYNONYM_GROUPS) {
    const hasMatch = group.some((w) => words.has(w));
    if (hasMatch) {
      group.forEach((w) => expanded.add(w));
    }
  }
  return expanded;
}

/**
 * Calcule un score de pertinence entre la question utilisateur et une entrée FAQ
 */
function computeScore(userInput: string, faq: FAQItem): number {
  const userWords = getWords(userInput);
  const questionWords = getWords(faq.question);
  const keywordWords = new Set(
    (faq.keywords || []).flatMap((k) => normalize(k).split(' ')).filter((w) => w.length >= 2)
  );

  const faqWords = new Set([...questionWords, ...keywordWords]);
  const allFaqWords = expandWithSynonyms(faqWords);

  let score = 0;

  for (const word of userWords) {
    if (allFaqWords.has(word)) {
      score += 1.5;
    }
    if (questionWords.has(word)) {
      score += 0.5;
    }
    if (keywordWords.has(word)) {
      score += 0.5;
    }
  }

  // Bonus si correspondance partielle forte
  const normUser = normalize(userInput);
  const normQuestion = normalize(faq.question);
  if (normUser.includes(normQuestion) || normQuestion.includes(normUser)) {
    score += 4;
  }

  // Bonus si 2+ mots correspondent
  const matchCount = [...userWords].filter((w) => allFaqWords.has(w)).length;
  if (matchCount >= 2) {
    score += matchCount * 0.2;
  }

  return score;
}

export interface FAQBotResponse {
  answer: string;
  matchedQuestion?: string;
  suggestedQuestions?: string[];
}

const FALLBACK_ANSWER = `Je n'ai pas trouvé de réponse précise. Posez votre question autrement ou essayez :

• Comment réserver ? • Où sont mes réservations ?
• Comment mettre mon espace en location ? • Comment contacter le support ?
• Quels moyens de paiement ? • Où sont les CGU et CGV ?
• Comment annuler une réservation ? • Où sont mes favoris ?

Consultez la page FAQ (/faq) ou le centre d'aide (/help) pour plus de réponses.`;

const SUGGESTED_FALLBACK = SUGGESTED_QUESTIONS;

/**
 * Répond à une question utilisateur en cherchant la FAQ la plus pertinente
 */
export function answerQuestion(userMessage: string): FAQBotResponse {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      answer: 'Bonjour ! Posez-moi une question sur Rentoall (réservation, annulation, paiement, etc.).',
      suggestedQuestions: SUGGESTED_FALLBACK,
    };
  }

  // Réponses courtes pour salutations
  const greetings = ['bonjour', 'salut', 'hello', 'coucou', 'bonsoir', 'hey'];
  if (greetings.includes(normalize(trimmed))) {
    return {
      answer: "Bonjour ! Je suis l'assistant Rentoall. Posez-moi une question sur la réservation, l'annulation, les paiements ou la mise en location.",
      suggestedQuestions: SUGGESTED_FALLBACK,
    };
  }

  let bestMatch: FAQItem | null = null;
  let bestScore = 0;

  for (const faq of FAQ_DATA) {
    const score = computeScore(trimmed, faq);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  const MIN_SCORE = 0.8;
  if (bestMatch && bestScore >= MIN_SCORE) {
    const categoryPrefix = bestMatch.id.split('-')[0];
    const related = FAQ_DATA.filter(
      (f) => f.id !== bestMatch!.id && f.id.startsWith(categoryPrefix)
    ).slice(0, 3);
    const suggestions =
      related.length >= 2
        ? [...related.map((f) => f.question), ...SUGGESTED_FALLBACK].slice(0, 6)
        : SUGGESTED_FALLBACK;

    return {
      answer: bestMatch.answer,
      matchedQuestion: bestMatch.question,
      suggestedQuestions: [...new Set(suggestions)].slice(0, 6),
    };
  }

  return {
    answer: FALLBACK_ANSWER,
    suggestedQuestions: SUGGESTED_FALLBACK,
  };
}
