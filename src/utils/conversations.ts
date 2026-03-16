import { chatAPI, MessageDTO } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

/**
 * Crée une conversation en envoyant un message initial
 * @param senderId - ID de l'utilisateur qui envoie le message
 * @param recipientId - ID de l'utilisateur qui reçoit le message
 * @param initialMessage - Message initial (optionnel, par défaut "Bonjour")
 * @returns Promise<MessageDTO> - Le message créé avec les informations de conversation
 */
export async function createConversation(
  senderId: string,
  recipientId: string,
  initialMessage: string = 'Bonjour'
): Promise<MessageDTO> {
  try {
    const messageDTO = await chatAPI.sendMessage({
      senderId,
      recipientId,
      content: initialMessage,
      clientMessageId: uuidv4(),
    });

    return messageDTO;
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    throw error;
  }
}

/**
 * Redirige vers la page des conversations avec la conversation sélectionnée
 * @param router - Next.js router
 * @param conversationId - ID de la conversation
 */
export function navigateToConversation(router: { push: (path: string) => void }, conversationId: string) {
  router.push(`/messages?conversationId=${conversationId}`);
}

/**
 * Crée une conversation et redirige vers la page des conversations
 * @param router - Next.js router
 * @param senderId - ID de l'utilisateur qui envoie le message
 * @param recipientId - ID de l'utilisateur qui reçoit le message
 * @param initialMessage - Message initial (optionnel)
 */
export async function createConversationAndNavigate(
  router: { push: (path: string) => void },
  senderId: string,
  recipientId: string,
  initialMessage?: string
) {
  try {
    const messageDTO = await createConversation(senderId, recipientId, initialMessage);
    
    // Naviguer vers la conversation
    if (messageDTO.conversationId) {
      navigateToConversation(router, messageDTO.conversationId);
    } else {
      // Si pas de conversationId, utiliser le chatRoomId dérivé
      const [userA, userB] = [senderId, recipientId].sort();
      const chatRoomId = `${userA}_${userB}`;
      navigateToConversation(router, chatRoomId);
    }
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    // En cas d'erreur, rediriger quand même vers les conversations
    router.push('/messages');
  }
}

