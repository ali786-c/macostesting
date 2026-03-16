'use client';

import { useState, useEffect } from 'react';
import { Star, X, Send } from 'lucide-react';

interface RatingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prestation: {
    id: string;
    title: string;
    client: string;
    clientAvatar?: string;
    date: string;
  };
  onRate: (rating: number, comment: string) => void;
}

export default function RatingSidebar({ isOpen, onClose, prestation, onRate }: RatingSidebarProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialiser le formulaire quand le volet s'ouvre
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      await onRate(rating, comment);
      // Ne pas fermer automatiquement, laisser le parent gérer
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Noter la location</h3>
                <p className="text-sm text-gray-500">Partagez votre expérience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Prestation Info */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {prestation.clientAvatar ? (
                <img
                  src={prestation.clientAvatar}
                  alt={prestation.client}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                  {prestation.client.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{prestation.title}</h4>
                <p className="text-sm text-gray-600 truncate">{prestation.client}</p>
                <p className="text-xs text-gray-500">{prestation.date}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notez cette location de parking <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`Noter ${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="mt-3 text-sm font-medium text-gray-700">
                  {rating === 1 && '⭐ Très décevant'}
                  {rating === 2 && '⭐⭐ Décevant'}
                  {rating === 3 && '⭐⭐⭐ Correct'}
                  {rating === 4 && '⭐⭐⭐⭐ Bien'}
                  {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec cette location de parking..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={6}
              />
              <p className="mt-2 text-xs text-gray-500">
                {comment.length} caractère{comment.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

