'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import Image from 'next/image';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { CheckCircle, Calendar, MapPin, Car, Box, Warehouse, ArrowRight, Clock } from 'lucide-react';
import { placesAPI, PlaceDTO } from '@/services/api';
import { epureAddress, capitalizeFirstPerLine , getDefaultPlaceImage} from '@/lib/utils';
import { fromApiDateTime } from '@/lib/datetime';

function ReservationConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [place, setPlace] = useState<PlaceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer les paramètres de l'URL
  const placeId = searchParams.get('placeId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const reservationType = searchParams.get('reservationType');
  const totalPrice = searchParams.get('totalPrice');

  // Charger les détails du bien
  useEffect(() => {
    const loadPlace = async () => {
      if (!placeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const placeData = await placesAPI.getById(parseInt(placeId, 10));
        setPlace(placeData);
      } catch (error) {
        console.error('[RESERVATION] Erreur chargement du bien:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

  // Formater les dates (back envoie UTC → on parse avec fromApiDateTime pour afficher en local)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = fromApiDateTime(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Formater l'heure : si ISO (UTC du back), convertir en local ; si HH:mm, afficher tel quel
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    if (timeString.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(timeString)) {
      const date = fromApiDateTime(timeString);
      return Number.isNaN(date.getTime()) ? timeString : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return timeString;
  };

  // Obtenir l'icône du type
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

  // Obtenir le label du type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PARKING':
        return 'Parking';
      case 'STORAGE_SPACE':
        return 'Stockage';
      case 'CAVE':
        return 'Cave et Divers';
      case 'BOX':
        return 'Box';
      case 'WAREHOUSE':
        return 'Entrepôt';
      default:
        return 'Espace';
    }
  };

  // Obtenir le label du type de réservation
  const getReservationTypeLabel = (type: string | null) => {
    switch (type) {
      case 'HOURLY':
        return 'À l\'heure';
      case 'DAILY':
        return 'À la journée';
      case 'WEEKLY':
        return 'À la semaine';
      case 'MONTHLY':
        return 'Au mois';
      default:
        return 'Réservation';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  if (!placeId || !startDate) {
    return (
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Réservation introuvable</h1>
            <p className="text-slate-600 mb-6">Les informations de réservation sont manquantes.</p>
            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              Voir mes réservations
            </Link>
          </div>
        </main>
        <FooterNavigation />
      </div>
    );
  }

  const TypeIcon = place ? getTypeIcon(place.type) : Car;

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Message de confirmation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Réservation effectuée !
          </h1>
          <p className="text-lg text-slate-600">
            Votre réservation a été confirmée avec succès
          </p>
        </div>

        {/* Détails de la réservation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Détails de votre réservation</h2>
          
          <div className="space-y-6">
            {/* Bien réservé */}
            {place && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                  {Array.isArray(place.photos) && place.photos.length > 0 ? (
                    <Image
                      src={place.photos[0]}
                      alt={capitalizeFirstPerLine(place.description) || 'Bien'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <TypeIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TypeIcon className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-600">
                      {getTypeLabel(place.type)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {capitalizeFirstPerLine((place.title && place.title.trim()) || place.description?.split('.')[0] || `${getTypeLabel(place.type)} - ${place.city}`)}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{(() => { const e = epureAddress(place.address); return place.city && !e.includes(place.city) ? `${e}, ${place.city}` : e; })()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700">Date de début</span>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {formatDate(startDate)}
                </p>
                {startTime && (
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(startTime)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700">Date de fin</span>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {endDate ? formatDate(endDate) : formatDate(startDate)}
                </p>
                {endTime && (
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(endTime)}
                  </p>
                )}
              </div>
            </div>

            {/* Type de réservation et prix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-semibold text-slate-700">Type de réservation</span>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {getReservationTypeLabel(reservationType)}
                </p>
              </div>

              {totalPrice && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-sm font-semibold text-emerald-700">Montant total</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {parseFloat(totalPrice).toFixed(2)}€
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bouton d'action */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/reservations"
            prefetch={false}
            onClick={(e) => handleCapacitorLinkClick(e, '/reservations', router)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <span>Voir mes réservations</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          {place && (
            <CapacitorDynamicLink
              href={`/parking/${place.id}/`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Retour au bien
            </CapacitorDynamicLink>
          )}
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}

export default function ReservationConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <HeaderNavigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 md:pb-16 mobile-page-main overflow-x-hidden reservation-confirmation-main" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-slate-700">Chargement...</p>
          </div>
        </main>
        <FooterNavigation />
      </div>
    }>
      <ReservationConfirmationContent />
    </Suspense>
  );
}