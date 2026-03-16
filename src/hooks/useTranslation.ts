'use client';

import { useState, useCallback } from 'react';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Hook pour gérer les traductions de texte
 * Utilise l'API Google Translate gratuite (via proxy CORS)
 */
export function useTranslation() {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  /**
   * Traduit un texte de la langue source vers la langue cible
   * @param text - Le texte à traduire
   * @param sourceLang - La langue source (ex: 'fr', 'en')
   * @param targetLang - La langue cible (ex: 'fr', 'en')
   * @returns La traduction
   */
  const translate = useCallback(async (
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> => {
    // Si les langues sont identiques, pas besoin de traduire
    if (sourceLang === targetLang) {
      return text;
    }

    // Créer une clé unique pour cette traduction
    const translationKey = `${text}_${sourceLang}_${targetLang}`;

    // Si la traduction existe déjà dans le cache, la retourner
    if (translations[translationKey]) {
      return translations[translationKey];
    }

    // Si une traduction est déjà en cours, attendre
    if (loading[translationKey]) {
      return text;
    }

    try {
      setLoading(prev => ({ ...prev, [translationKey]: true }));

      // Utiliser l'API Google Translate via plusieurs méthodes pour fiabilité
      // Méthode 1: API Google Translate (peut être bloquée par CORS)
      try {
        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const translatedText = data[0]?.map((item: Array<[string, number]>) => item[0]).join('') || text;

          // Mettre en cache la traduction
          setTranslations(prev => ({
            ...prev,
            [translationKey]: translatedText
          }));

          setLoading(prev => {
            const newLoading = { ...prev };
            delete newLoading[translationKey];
            return newLoading;
          });

          return translatedText;
        }
      } catch (fetchError) {
        // Si l'API Google Translate échoue, essayer une méthode alternative
        console.warn('Google Translate API failed, trying alternative method:', fetchError);
      }

      // Méthode alternative: Utiliser l'API MyMemory (gratuite, pas de CORS)
      try {
        const myMemoryResponse = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );

        if (myMemoryResponse.ok) {
          const myMemoryData = await myMemoryResponse.json();
          const translatedText = myMemoryData.responseData?.translatedText || text;

          // Mettre en cache la traduction
          setTranslations(prev => ({
            ...prev,
            [translationKey]: translatedText
          }));

          setLoading(prev => {
            const newLoading = { ...prev };
            delete newLoading[translationKey];
            return newLoading;
          });

          return translatedText;
        }
      } catch (myMemoryError) {
        console.warn('MyMemory API failed:', myMemoryError);
      }

      // Si toutes les méthodes échouent, retourner le texte original
      throw new Error('All translation methods failed');
    } catch (error) {
      console.error('Translation error:', error);
      
      setLoading(prev => {
        const newLoading = { ...prev };
        delete newLoading[translationKey];
        return newLoading;
      });

      // En cas d'erreur, retourner le texte original
      return text;
    }
  }, [translations, loading]);

  /**
   * Vérifie si une traduction est en cours pour un texte donné
   */
  const isTranslating = useCallback((text: string, sourceLang: string, targetLang: string): boolean => {
    const translationKey = `${text}_${sourceLang}_${targetLang}`;
    return loading[translationKey] === true;
  }, [loading]);

  return {
    translate,
    isTranslating,
    translations
  };
}
