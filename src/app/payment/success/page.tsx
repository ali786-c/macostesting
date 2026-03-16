'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { CheckCircle, Loader2, XCircle, Calendar, MapPin, Car, Box, Warehouse, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import Image from 'next/image';
import { paymentsAPI, placesAPI, reservationsAPI, PlaceDTO } from '@/services/api';
import { epureAddress, capitalizeFirstPerLine, getValidPhoto } from '@/lib/utils';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'succeeded' | 'failed' | 'authorized'>('pending');

  // Si on est dans une iframe (paiement embedded mobile), rediriger le parent pour fermer le modal
  useEffect(() => {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      window.top!.location.href = window.location.href;
    }
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [reservationData, setReservationData] = useState<any>(null);
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('orderId');
  const mainPaddingStyle = {
    paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 6.5rem), 6.5rem)',
    paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 6.5rem), 6.5rem)',
  } as const;

  const pollCountRef = useRef(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID manquant');
      setStatus('failed');
      return;
    }

    // Réinitialiser le compteur
    pollCountRef.current = 0;
    
    // Nettoyer les timeouts précédents
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];

    // Délai initial de 1-2 secondes pour laisser le temps au Webhook Stripe de notifier le serveur
    const initialDelay = 1500; // 1.5 secondes
    const maxPolls = 20; // 20 tentatives maximum
    const pollInterval = 1000; // 1 seconde entre chaque tentative (comme recommandé par le backend)

    const checkPaymentStatus = async () => {
      try {
        pollCountRef.current++;
        
        const response = await paymentsAPI.getPaymentStatus(orderId!);
        
        // Gérer le cas où la réponse est directement une string ou un objet
        let paymentStatus: string;
        if (typeof response === 'string') {
          paymentStatus = response;
        } else if (response && typeof response === 'object' && 'status' in response) {
          paymentStatus = response.status;
        } else {
          console.error('[PAYMENT] Format de réponse inattendu:', response);
          paymentStatus = 'PENDING';
        }
        
        const statusUpper = (paymentStatus || '').toUpperCase();
        if (statusUpper === 'SUCCEEDED' || statusUpper === 'AUTHORIZED') {
          setStatus(statusUpper === 'AUTHORIZED' ? 'authorized' : 'succeeded');
          
          // Récupérer les informations de réservation : sessionStorage d'abord, sinon API
          const pendingReservationStr = sessionStorage.getItem('pendingReservation');
          if (pendingReservationStr) {
            try {
              const reservationDataParsed = JSON.parse(pendingReservationStr);
              
              // Normaliser les dates (support startDate/endDate ou startDateTime/endDateTime)
              const data = {
                ...reservationDataParsed,
                startDate: reservationDataParsed.startDate ?? reservationDataParsed.startDateTime,
                endDate: reservationDataParsed.endDate ?? reservationDataParsed.endDateTime,
                startDateTime: reservationDataParsed.startDateTime ?? reservationDataParsed.startDate,
                endDateTime: reservationDataParsed.endDateTime ?? reservationDataParsed.endDate,
              };
              setReservationData(data);
              
              // Charger les détails du bien
              if (data.placeId) {
                setIsLoadingPlace(true);
                try {
                  const placeData = await placesAPI.getById(parseInt(data.placeId, 10));
                  setPlace(placeData);
                } catch (placeError) {
                  console.error('[PAYMENT] Erreur chargement du bien:', placeError);
                } finally {
                  setIsLoadingPlace(false);
                }
              }
              
              // Nettoyer sessionStorage
              sessionStorage.removeItem('pendingReservation');
            } catch (error) {
              console.error('[PAYMENT] Erreur récupération données réservation:', error);
              setError('Erreur lors de la récupération des données de réservation');
              setStatus('failed');
            }
          } else {
            // Pas de sessionStorage : récupérer la réservation via l'API pour afficher les dates
            try {
              const reservationId = parseInt(orderId!, 10);
              if (Number.isNaN(reservationId)) {
                setError('Identifiant de commande invalide');
                setStatus('failed');
                return;
              }
              const reservation = await reservationsAPI.getById(reservationId);
              const res = reservation as { startDateTime?: string; endDateTime?: string; start_date_time?: string; end_date_time?: string };
              const startDt = res.startDateTime ?? (res as Record<string, unknown>).start_date_time;
              const endDt = res.endDateTime ?? (res as Record<string, unknown>).end_date_time;
              const data = {
                placeId: reservation.placeId?.toString(),
                startDate: startDt,
                endDate: endDt,
                startDateTime: startDt,
                endDateTime: endDt,
                totalPrice: reservation.totalPrice?.toString(),
                basePrice: reservation.totalPrice?.toString(),
              };
              setReservationData(data);
              if (reservation.placeId) {
                setIsLoadingPlace(true);
                try {
                  const placeData = await placesAPI.getById(reservation.placeId);
                  setPlace(placeData);
                } catch (placeError) {
                  console.error('[PAYMENT] Erreur chargement du bien:', placeError);
                } finally {
                  setIsLoadingPlace(false);
                }
              }
            } catch (apiError) {
              console.error('[PAYMENT] Erreur récupération réservation par API:', apiError);
              setError('Données de réservation non trouvées');
              setStatus('failed');
            }
          }
        } else if (statusUpper === 'FAILED' || statusUpper === 'CANCELED' || statusUpper === 'CANCELLED') {
          setError('Le paiement a échoué ou a été annulé.');
          setStatus('failed');
        } else {
          // PENDING ou statut inconnu : continuer le polling
          if (pollCountRef.current < maxPolls) {
            const retryTimeout = setTimeout(checkPaymentStatus, pollInterval);
            timeoutRefs.current.push(retryTimeout);
          } else {
            // Timeout après toutes les tentatives
            setError('Le paiement prend plus de temps que prévu. Veuillez vérifier votre réservation dans quelques instants.');
            setStatus('failed');
          }
        }
      } catch (err) {
        console.error('[PAYMENT] Erreur vérification statut paiement:', err);
        // En cas d'erreur réseau, réessayer si on n'a pas dépassé le max
        if (pollCountRef.current < maxPolls) {
          const retryTimeout = setTimeout(checkPaymentStatus, pollInterval);
          timeoutRefs.current.push(retryTimeout);
        } else {
          setError('Erreur lors de la vérification du statut du paiement. Veuillez vérifier votre réservation.');
          setStatus('failed');
        }
      }
    };

    // Démarrer le polling après le délai initial
    const initialTimeout = setTimeout(() => {
      checkPaymentStatus();
    }, initialDelay);
    timeoutRefs.current.push(initialTimeout);

    // Cleanup
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current = [];
    };
  }, [orderId, router]);

  // Si on a réussi (ou autorisé) mais les dates manquent (ex. sessionStorage vide après redirection Stripe), les récupérer via l'API
  useEffect(() => {
    if ((status !== 'succeeded' && status !== 'authorized') || !reservationData || !orderId) return;
    const hasDates = (reservationData.startDate || reservationData.startDateTime) && (reservationData.endDate || reservationData.endDateTime);
    if (hasDates) return;

    const reservationId = parseInt(orderId, 10);
    if (Number.isNaN(reservationId)) return;

    let cancelled = false;
    reservationsAPI.getById(reservationId).then((reservation) => {
      if (cancelled) return;
      const res = reservation as { startDateTime?: string; endDateTime?: string; [k: string]: unknown };
      const startDt = res.startDateTime ?? res.start_date_time as string | undefined;
      const endDt = res.endDateTime ?? res.end_date_time as string | undefined;
      if (startDt || endDt) {
        setReservationData((prev: Record<string, unknown> | null) =>
          prev
            ? {
                ...prev,
                startDate: startDt ?? prev.startDate,
                endDate: endDt ?? prev.endDate,
                startDateTime: startDt ?? prev.startDateTime,
                endDateTime: endDt ?? prev.endDateTime,
              }
            : prev
        );
      }
    }).catch((err) => {
      if (!cancelled) console.error('[PAYMENT] Fallback récupération dates:', err);
    });
    return () => { cancelled = true; };
  }, [status, orderId, reservationData?.placeId, reservationData?.startDate, reservationData?.endDate]);

  // Fonctions utilitaires pour l'affichage
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PARKING': return Car;
      case 'STORAGE_SPACE':
      case 'BOX':
      case 'WAREHOUSE': return Box;
      case 'CAVE': return Warehouse;
      default: return Car;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PARKING': return 'Parking';
      case 'STORAGE_SPACE':
      case 'BOX':
      case 'WAREHOUSE': return 'Box';
      case 'CAVE': return 'Cave et Divers';
      default: return 'Espace';
    }
  };

  // Si le paiement a réussi (ou autorisé en attente d'approbation) et qu'on a les données de réservation, afficher le récapitulatif
  if ((status === 'succeeded' || status === 'authorized') && reservationData) {
    const isAuthorized = status === 'authorized';
    const TypeIcon = place ? getTypeIcon(place.type) : Car;
    const placeImage = getValidPhoto(place?.photos, place?.type);
    const displayCity = reservationData.city || (place?.city) || 'Ville non spécifiée';
    const displayPrice = reservationData.totalPrice || reservationData.basePrice || '0';
    const displayPriceValue = Number(displayPrice);
    const displayPriceLabel = Number.isFinite(displayPriceValue) ? displayPriceValue.toFixed(2) : String(displayPrice);
    const startDateDisplay = reservationData.startDate || reservationData.startDateTime;
    const endDateDisplay = reservationData.endDate || reservationData.endDateTime;

    return (
      <div className="min-h-[100dvh] flex flex-col bg-slate-50">
        <HeaderNavigation />
        
        <main className="flex-1 w-full mobile-page-main" style={mainPaddingStyle}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className={`absolute inset-x-0 top-0 h-40 opacity-10 ${isAuthorized ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600' : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500'}`} />

              <div className="relative px-5 sm:px-8 py-6 sm:py-8">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isAuthorized ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <CheckCircle className={`w-7 h-7 ${isAuthorized ? 'text-amber-600' : 'text-emerald-600'}`} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {isAuthorized ? 'Réservation en attente d\'approbation' : 'Réservation confirmée'}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1">
                      {isAuthorized
                        ? 'Votre paiement a été enregistré. La réservation doit maintenant être approuvée par l\'hôte.'
                        : 'Votre paiement a bien été enregistré.'}
                    </p>
                    {orderId && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          Commande #{orderId}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total payé</div>
                    <div className={`text-lg sm:text-xl font-extrabold ${isAuthorized ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {displayPriceLabel} €
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-5 sm:gap-6">
                  {/* Bien */}
                  <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    {place ? (
                      <>
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                          <Image
                            src={placeImage}
                            alt={capitalizeFirstPerLine(place.description) || 'Bien réservé'}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                            unoptimized={placeImage?.startsWith('data:')}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <TypeIcon className={`w-4 h-4 ${isAuthorized ? 'text-amber-600' : 'text-emerald-600'}`} />
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isAuthorized ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {getTypeLabel(place.type)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">
                            {capitalizeFirstPerLine((place.title && place.title.trim()) || place.description?.split('.')[0] || `Bien à ${displayCity}`)}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                            <span className="break-words">{epureAddress(place.address)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" />
                        <span className="text-sm">Chargement du bien…</span>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Détails de la réservation
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      {startDateDisplay && (
                        <div className="flex items-start gap-2">
                          <span className="w-14 text-xs font-semibold text-slate-500 mt-0.5">Début</span>
                          <span className="text-slate-700">
                            {formatDate(startDateDisplay)}
                            {typeof startDateDisplay === 'string' && startDateDisplay.includes('T') && ` à ${formatTime(startDateDisplay)}`}
                          </span>
                        </div>
                      )}
                      {endDateDisplay && (
                        <div className="flex items-start gap-2">
                          <span className="w-14 text-xs font-semibold text-slate-500 mt-0.5">Fin</span>
                          <span className="text-slate-700">
                            {formatDate(endDateDisplay)}
                            {typeof endDateDisplay === 'string' && endDateDisplay.includes('T') && ` à ${formatTime(endDateDisplay)}`}
                          </span>
                        </div>
                      )}
                      {!(startDateDisplay || endDateDisplay) && (
                        <p className="text-slate-500 text-xs italic">Récupération des dates…</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/reservations"
                    prefetch={false}
                    onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)}
                    className={`flex-1 font-semibold py-3.5 px-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm ${isAuthorized ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  >
                    Voir mes réservations
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/search-parkings"
                    prefetch={false}
                    onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                    className="flex-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-4 rounded-2xl text-sm transition-colors text-center"
                  >
                    Continuer la recherche
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <FooterNavigation />
      </div>
    );
  }

  // Affichage par défaut (pending ou failed)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNavigation />
      
      <main className="flex-1 flex items-center justify-center px-4 py-8 mobile-page-main overflow-x-hidden" style={mainPaddingStyle}>
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          {status === 'pending' && (
            <>
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-bold text-slate-900 mb-2">Confirmation en cours</h1>
              <p className="text-sm text-slate-600">
                Vérification de votre paiement en cours…
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">Paiement non confirmé</h1>
              <p className="text-sm text-slate-600 mb-5">
                {error || 'Votre paiement n\'a pas pu être confirmé. Veuillez réessayer.'}
              </p>
              <Link
                href="/reservations"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)}
                className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Voir mes réservations
              </Link>
            </>
          )}
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
