'use client';

import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { detectLanguage, isDifferentLanguage } from '../lib/languageDetector';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

interface MessageWithTranslationProps {
  text: string;
  isSent: boolean;
  className?: string;
}

export default function MessageWithTranslation({
  text,
  isSent,
  className = ''
}: MessageWithTranslationProps) {
  const { language: userLanguage } = useLanguage();
  const { translate, isTranslating } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTranslatingState, setIsTranslatingState] = useState(false);

  // Détecter la langue du message
  const detectedLanguage = detectLanguage(text);
  const needsTranslation = isDifferentLanguage(text, userLanguage);

  const handleTranslate = async () => {
    if (translatedText) {
      // Si la traduction existe déjà, basculer entre original et traduit
      setShowOriginal(!showOriginal);
      return;
    }

    // Si la langue détectée est inconnue, on considère que c'est dans la langue de l'utilisateur
    if (detectedLanguage === 'unknown') {
      return;
    }

    setIsTranslatingState(true);

    try {
      const translation = await translate(text, detectedLanguage, userLanguage);
      setTranslatedText(translation);
      setShowOriginal(false);
    } catch (error) {
      console.error('Error translating message:', error);
    } finally {
      setIsTranslatingState(false);
    }
  };

  const displayText = translatedText && !showOriginal ? translatedText : text;
  const isCurrentlyTranslating = isTranslatingState || isTranslating(text, detectedLanguage, userLanguage);

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`px-3 py-2 rounded-2xl ${
        isSent
          ? 'bg-orange-500 text-white rounded-tr-sm'
          : 'bg-gray-100 text-gray-900 rounded-tl-sm md:bg-white md:border md:border-gray-200'
      }`}>
        <p className="text-sm leading-5 whitespace-pre-wrap break-words">{displayText}</p>
      </div>
      
      {/* Bouton de traduction - seulement pour les messages reçus dans une langue différente */}
      {!isSent && needsTranslation && (
        <button
          onClick={handleTranslate}
          disabled={isCurrentlyTranslating}
          className={`mt-1.5 md:mt-1 flex items-center gap-1.5 text-[10px] md:text-[10px] font-medium transition-colors self-start px-1 ${
            isCurrentlyTranslating
              ? 'text-gray-400 cursor-not-allowed'
              : translatedText
                ? 'text-orange-600 hover:text-orange-700'
                : 'text-gray-600 hover:text-orange-600'
          }`}
          title={translatedText ? (showOriginal ? 'Afficher la traduction' : 'Afficher l\'original') : 'Traduire le message'}
        >
          {isCurrentlyTranslating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Traduction en cours...</span>
            </>
          ) : translatedText ? (
            <>
              <Languages className="w-3 h-3" />
              <span>{showOriginal ? 'Afficher la traduction' : 'Afficher l\'original'}</span>
            </>
          ) : (
            <>
              <Languages className="w-3 h-3" />
              <span>Traduire le message</span>
            </>
          )}
        </button>
      )}
      
      {/* Indicateur de langue originale si traduit */}
      {translatedText && !showOriginal && (
        <span className="mt-0.5 text-[9px] text-gray-400 italic self-start px-1">
          Traduit de {detectedLanguage === 'fr' ? 'français' : detectedLanguage === 'en' ? 'anglais' : 'langue inconnue'}
        </span>
      )}
    </div>
  );
}
