'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, MapPin, Euro, Car, Box, Warehouse, ArrowRight } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import SkeletonLoading from '@/components/ui/skeleton-loading';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import { placesAPI, PlaceDTO } from '@/services/api';
import { epureAddress, capitalizeFirstPerLine , getDefaultPlaceImage} from '@/lib/utils';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import Image from 'next/image';

function ReservationConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const placeId = searchParams.get('placeId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const city = searchParams.get('city');
  const basePrice = searchParams.get('basePrice');
  const totalPrice = searchParams.get('totalPrice'); // Total avec frais inclus

  useEffect(() => {
    const loadPlace = async () => {
      if (!placeId) {
        setIsLoading(false);
        return;
      }

      try {
        const placeData = await placesAPI.getById(parseInt(placeId, 10));
        setPlace(placeData);
      } catch (error) {
        console.error('Erreur lors du chargement du bien:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

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
      case 'PARKING':
        return Car;
      case 'STORAGE_SPACE':
      case 'BOX':
      case 'WAREHOUSE':
        return Box;
      case 'CAVE':
        return Warehouse;
      default:
        return Car;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PARKING':
        return 'Parking';
      case 'STORAGE_SPACE':
        return 'Stockage';
      case 'BOX':
        return 'Box';
      case 'WAREHOUSE':
        return 'Entrepôt';
      case 'CAVE':
        return 'Cave et Divers';
      default:
        return 'Bien';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 md:pt-24 pb-20 md:pb-16 flex-1 flex items-center justify-center mobile-page-main reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="text-center">
            <div className="md:hidden mb-4">
              <LoadingLogo size="md" />
            </div>
            <div className="hidden md:block mb-4">
              <LoadingLogo size="md" />
            </div>
            <AnimatedLoadingText className="mt-2" />
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  const TypeIcon = place ? getTypeIcon(place.type) : Car;
  const displayCity = city || place?.city || '';
  // Utiliser le totalPrice (avec frais inclus) pour l'affichage et le paiement
  const displayPrice = totalPrice ? parseFloat(totalPrice).toFixed(2) : (basePrice ? parseFloat(basePrice).toFixed(2) : place?.pricePerDay?.toFixed(2) || '0');
  const photos = place?.photos && Array.isArray(place.photos) && place.photos.length > 0 
    ? place.photos 
    : [];
  const defaultImage = getDefaultPlaceImage(place?.type);
  const placeImage = photos[0] || defaultImage;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <HeaderNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 md:pb-16 flex-1 mobile-page-main overflow-x-hidden reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <SkeletonLoading isLoading={isLoading}>
          {/* Confirmation Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-12 h-12 text-emerald-600" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Réservation effectuée !
            </h1>
            <p className="text-emerald-50 text-lg">
              Votre réservation a été confirmée avec succès
            </p>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Place Info */}
            {place && (
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="relative w-full sm:w-48 h-48 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={placeImage}
                      alt={capitalizeFirstPerLine(place.description) || 'Bien réservé'}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TypeIcon className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-600 uppercase">
                        {getTypeLabel(place.type)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">
                      {capitalizeFirstPerLine(place.description?.split('.')[0] || `Bien à ${displayCity}`)}
                    </h2>
                    <div className="flex items-center gap-2 text-slate-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{(() => { const e = epureAddress(place.address); return displayCity && !e.includes(displayCity) ? `${e}, ${displayCity}` : e; })()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Euro className="w-4 h-4" />
                      <span className="text-lg font-bold">{displayPrice}€</span>
                      <span className="text-sm text-slate-500">/jour</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dates Section */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Détails de la réservation
              </h3>
              <div className="space-y-4">
                {startDate && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Date de début</p>
                      <p className="text-base font-semibold text-slate-900">
                        {formatDate(startDate)}
                      </p>
                      {startDate.includes('T') && (
                        <p className="text-sm text-slate-600 mt-1">
                          à {formatTime(startDate)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {endDate && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Date de fin</p>
                      <p className="text-base font-semibold text-slate-900">
                        {formatDate(endDate)}
                      </p>
                      {endDate.includes('T') && (
                        <p className="text-sm text-slate-600 mt-1">
                          à {formatTime(endDate)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {(totalPrice || basePrice) && (
                  <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                    <Euro className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-500">Total à payer</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {displayPrice}€
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Frais inclus
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/reservations"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>Voir mes réservations</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/search-parkings"
                prefetch={false}
                onClick={(e) => handleCapacitorLinkClick(e, '/search-parkings', router)}
                className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Continuer la recherche
              </Link>
            </div>
          </div>
        </div>
        </SkeletonLoading>
      </main>

      <FooterNavigation />
    </div>
  );
}

export default function ReservationConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNavigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 md:pt-24 pb-20 md:pb-16 flex-1 flex items-center justify-center mobile-page-main reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="text-center">
            <div className="md:hidden mb-4">
              <LoadingLogo size="md" />
            </div>
            <div className="hidden md:block mb-4">
              <LoadingLogo size="md" />
            </div>
            <AnimatedLoadingText className="mt-2" />
          </div>
        </main>
        <FooterNavigation />
      </div>
    }>
      <ReservationConfirmationContent />
    </Suspense>
  );
}


