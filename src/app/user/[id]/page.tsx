'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingLogo from '@/components/ui/loading-logo';
import { ArrowLeft, Star, Calendar, User as UserIcon } from 'lucide-react';
import { rentoallUsersAPI, UserDTO, reviewsAPI, ReviewDTO } from '@/services/api';
import { getDisplayFirstName } from '@/lib/utils';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id ? parseInt(params.id as string, 10) : null;
  
  const [user, setUser] = useState<UserDTO | null>(null);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId || isNaN(userId)) {
        setError('ID utilisateur invalide');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Charger les informations de l'utilisateur
        const userData = await rentoallUsersAPI.getProfile(userId);
        setUser(userData);

        // Charger les avis reçus par l'utilisateur
        try {
          const receivedReviews = await reviewsAPI.getReceivedReviews(userId.toString());
          setReviews(receivedReviews);
        } catch (reviewError) {
          console.warn('⚠️ [USER PROFILE] Impossible de charger les avis:', reviewError);
          setReviews([]);
        }
      } catch (err) {
        console.error('❌ [USER PROFILE] Erreur lors du chargement du profil:', err);
        const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
        setError(errorObj?.response?.data?.message || errorObj?.message || 'Erreur lors du chargement du profil');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <HeaderNavigation />
          <main className="flex-1 flex items-center justify-center pb-20 md:pb-0 mobile-page-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
            <LoadingLogo />
          </main>
          <FooterNavigation />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <HeaderNavigation />
          <main className="flex-1 flex items-center justify-center p-4 pb-20 md:pb-0 mobile-page-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h1>
              <p className="text-slate-600 mb-4">{error || 'Utilisateur non trouvé'}</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Retour
              </button>
            </div>
          </main>
          <FooterNavigation />
        </div>
      </ProtectedRoute>
    );
  }

  const userName = getDisplayFirstName(user, 'Utilisateur');
  const userAvatar = (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() !== '') 
    ? user.profilePicture 
    : '/logoR.png';
  
  // Calculer la date d'inscription
  const creationDate = user.creationDate || user.createdAt;
  const formattedCreationDate = creationDate 
    ? new Date(creationDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Date non disponible';

  // Calculer la moyenne des avis
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
    : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderNavigation />
        <main className="flex-1 pt-16 md:pt-24 pb-20 md:pb-0 mobile-page-main" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Bouton retour */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Retour</span>
            </button>

            {/* Carte principale du profil */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Photo de profil */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 ring-4 ring-slate-100">
                  <Image
                    src={userAvatar}
                    alt={userName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Informations principales */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{userName}</h1>
                  
                  {user.email && (
                    <p className="text-slate-600 mb-4">{user.email}</p>
                  )}

                  {/* Date d'inscription */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Membre depuis {formattedCreationDate}</span>
                  </div>

                  {/* Note moyenne si des avis existent */}
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.round(averageRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {averageRating.toFixed(1)} ({reviews.length} avis)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section Avis */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" />
                <span>Avis reçus</span>
                {reviews.length > 0 && (
                  <span className="text-base font-normal text-slate-500">({reviews.length})</span>
                )}
              </h2>

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucun avis pour le moment</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.round(review.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {review.rating?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                          
                          {review.comment && (
                            <p className="text-slate-700 mb-3">{review.comment}</p>
                          )}

                          {/* Détails multi-critères si disponibles */}
                          {(review.accessibilityRating || review.cleanlinessRating || review.communicationRating || review.valueForMoneyRating) && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 mb-3">
                              {review.accessibilityRating && (
                                <div>
                                  <span className="font-medium">Accessibilité:</span> {review.accessibilityRating}/10
                                </div>
                              )}
                              {review.cleanlinessRating && (
                                <div>
                                  <span className="font-medium">Propreté:</span> {review.cleanlinessRating}/10
                                </div>
                              )}
                              {review.communicationRating && (
                                <div>
                                  <span className="font-medium">Communication:</span> {review.communicationRating}/10
                                </div>
                              )}
                              {review.valueForMoneyRating && (
                                <div>
                                  <span className="font-medium">Rapport Q/P:</span> {review.valueForMoneyRating}/10
                                </div>
                              )}
                            </div>
                          )}

                          {review.createdAt && (
                            <p className="text-xs text-slate-500">
                              {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    </ProtectedRoute>
  );
}
