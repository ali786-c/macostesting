'use client';

import { useState } from 'react';
import { Star, X, Send, MessageSquare } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestation: {
    id: string;
    title: string;
    client: string;
    clientAvatar: string;
    date: string;
  };
  onRate: (rating: number, comment: string) => void;
}

export default function RatingModal({ isOpen, onClose, prestation, onRate }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onRate(rating, comment);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-stretch md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md h-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl md:mx-4 overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
        style={{
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
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
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Prestation Info */}
          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={prestation.clientAvatar}
              alt={prestation.client}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{prestation.title}</h4>
              <p className="text-sm text-gray-600">{prestation.client}</p>
              <p className="text-xs text-gray-500">{prestation.date}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notez cette location de parking
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600">
                {rating > 0 && (
                  <>
                    {rating === 1 && 'Très décevant'}
                    {rating === 2 && 'Décevant'}
                    {rating === 3 && 'Correct'}
                    {rating === 4 && 'Bien'}
                    {rating === 5 && 'Excellent'}
                  </>
                )}
              </span>
            </div>
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
              rows={4}
            />
          </div>

          {/* Importance Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <MessageSquare className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Votre avis compte !</h4>
                <p className="text-sm text-orange-700">
                  Les notes et commentaires aident la communauté à identifier les meilleures places de parking. 
                  Votre feedback est précieux pour tous.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 min-h-[44px] text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium touch-manipulation"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1 px-4 py-3 min-h-[44px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2 touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer la note</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
