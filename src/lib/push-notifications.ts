/**
 * Logique des notifications push pour iOS et Android (Capacitor).
 * - Demande des permissions, enregistrement FCM/APNs, envoi du token au backend.
 * - Écoute des événements (reçu, clic) et navigation selon le type (réservation, message, etc.).
 */
import { getPlatform } from './capacitor';
import * as storage from './storage';
import { rentoallUsersAPI } from '@/services/api';

const ANDROID_CHANNEL_ID = 'rentoall_default';

export type PushNotificationData = {
  type?: string;
  reservationId?: string;
  placeId?: string;
  conversationId?: string;
  message?: string;
  [key: string]: unknown;
};

export type PushNotificationNavigate = (path: string) => void;

/**
 * Crée le canal de notification par défaut sur Android (requis pour Android 8+).
 */
export async function createDefaultChannel(): Promise<void> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Rentoall',
      description: 'Réservations et messages',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    console.log('[Push] Canal Android créé:', ANDROID_CHANNEL_ID);
  } catch (e) {
    console.warn('[Push] createChannel (Android) non disponible ou erreur:', e);
  }
}

/**
 * Construit le chemin de navigation à partir des data de la notification.
 */
export function getPathFromNotificationData(data: PushNotificationData): string | null {
  if (!data || typeof data !== 'object') return null;
  const type = (data.type as string) || '';
  const conversationId = data.conversationId as string | undefined;
  const reservationId = data.reservationId as string | undefined;
  const placeId = data.placeId as string | undefined;

  switch (type) {
    case 'message':
    case 'new_message':
      if (conversationId) return `/messages?conversationId=${conversationId}`;
      return '/messages';
    case 'reservation':
    case 'new_reservation':
    case 'booking':
    case 'reservation_status':
    case 'reservation_update':
    case 'reservation_modified':
      if (reservationId) return `/reservations/${reservationId}`;
      return '/reservations';
    case 'place':
      if (placeId) return `/parking/${placeId}`;
      return '/host/my-places';
    default:
      if (conversationId) return `/messages?conversationId=${conversationId}`;
      if (reservationId) return `/reservations/${reservationId}`;
      if (placeId) return `/parking/${placeId}`;
      return '/reservations';
  }
}

/**
 * Enregistre les listeners push (token, erreur, reçu, clic) et appelle onNavigate quand l'utilisateur tape sur une notification.
 */
export async function addPushListeners(onNavigate: PushNotificationNavigate): Promise<void> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const platform = getPlatform();
  const userIdRaw = storage.getItem('userId');
  const userId = userIdRaw ? parseInt(userIdRaw, 10) : null;

  await PushNotifications.addListener('registration', async (token) => {
    console.log('[Push] Token reçu:', token.value?.substring(0, 20) + '...');
    if (userId && token.value && (platform === 'ios' || platform === 'android')) {
      try {
        await rentoallUsersAPI.registerDeviceToken(userId, token.value, platform);
      } catch (e) {
        console.error('[Push] Erreur enregistrement token backend:', e);
      }
    }
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Erreur enregistrement:', err.error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Reçu (foreground):', notification.title, notification.data);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (event: { notification?: { data?: PushNotificationData } }) => {
    const data = (event.notification?.data || event.notification) as PushNotificationData;
    const path = getPathFromNotificationData(data);
    if (path) {
      onNavigate(path);
    } else {
      onNavigate('/reservations');
    }
  });
}

/**
 * Demande les permissions et enregistre l'app pour les push (FCM/APNs).
 * À appeler une fois l'utilisateur connecté, uniquement en Capacitor.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permissions refusées:', permStatus.receive);
      return false;
    }
    await createDefaultChannel();
    await PushNotifications.register();
    return true;
  } catch (e) {
    console.error('[Push] register error:', e);
    return false;
  }
}
