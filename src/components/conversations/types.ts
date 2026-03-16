// Backend DTOs
export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  senderName?: string;
  content: string;
  createdAt: string; // ISO 8601 format
  clientMessageId?: string;
  status: 'SENDING' | 'SENT' | 'READ' | 'FAILED';
}

export interface ConversationDTO {
  id: string;
  subject?: string;
  participantIds: string[];
  messages?: MessageDTO[];
  createdAt: string; // ISO 8601 format
  senderId?: string;
  recipientId?: string;
  content?: string;
  timestamp?: string;
  documentIds?: string[];
  readByRecipient?: boolean;
  chatRoomId?: string;
  tokenRecipient?: string[];
  // Enriched display fields
  clientName?: string;
  clientPicture?: string;
  proName?: string;
  proPicture?: string;
  senderName?: string;
}

// Frontend display types
export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  isOnline: boolean;
  hasUnread: boolean;
  unreadCount?: number;
  // Backend data
  conversationId?: string;
  participantIds?: string[];
  otherUserId?: string;
}

export interface Message {
  id: string;
  text: string;
  time: string;
  isSent: boolean;
  sender?: {
    id: string;
    name: string;
    avatar: string;
  };
  type?: 'text' | 'quote';
  quote?: Quote;
  // Backend data
  conversationId?: string;
  senderId?: string;
  recipientId?: string;
  status?: 'SENDING' | 'SENT' | 'READ' | 'FAILED';
  createdAt?: string;
}

export interface Quote {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  influencerId: string;
  clientId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  title?: string;
  avatar: string;
  age?: number;
  city?: string;
  followers?: string;
  platforms?: Array<{ name: string; handle: string }>;
  targetAudience?: string;
  rating?: number;
  reviewCount?: number;
  isOnline: boolean;
  stats?: {
    followers?: string;
    engagement?: number;
  };
}

