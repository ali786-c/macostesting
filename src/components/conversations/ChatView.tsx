'use client';

import { X, User } from 'lucide-react';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import { Conversation, Message } from './types';

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onQuoteClick?: () => void;
  onQuoteResponse?: (quoteId: string, status: 'accepted' | 'rejected') => void;
  onViewProfile?: () => void;
  onBack?: () => void;
  currentUserAvatar?: string;
  isMobile?: boolean;
}

export default function ChatView({
  conversation,
  messages,
  newMessage,
  onMessageChange,
  onSendMessage,
  onQuoteClick,
  onQuoteResponse,
  onViewProfile,
  onBack,
  currentUserAvatar,
  isMobile = false,
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-full bg-white md:bg-gray-50">
      {/* Chat Header */}
      <div className={`border-b border-gray-200 bg-white px-3 md:px-5 flex items-center justify-between flex-shrink-0 ${isMobile ? 'h-14' : 'h-16'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isMobile && onBack && (
            <button
              onClick={onBack}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <img
              src={conversation.avatar}
              alt={conversation.name}
              className={`rounded-full ${isMobile ? 'w-10 h-10' : 'w-10 h-10'}`}
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                conversation.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold text-gray-900 truncate ${isMobile ? 'text-sm' : 'text-sm'}`}>
              {conversation.name}
            </h2>
            <p className={`${isMobile ? 'text-[10px]' : 'text-[10px]'} ${conversation.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
              {conversation.isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>
        {onViewProfile && (
          <button
            onClick={onViewProfile}
            className={`hover:bg-gray-100 md:hover:bg-orange-50 rounded-lg transition-colors flex-shrink-0 ${isMobile ? 'p-2' : 'p-1.5'}`}
            title="Voir le profil"
          >
            <User className={`text-orange-600 ${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
          </button>
        )}
      </div>

      {/* Messages - padding bas sur mobile pour la barre d'envoi fixe */}
      <div className={`flex-1 overflow-y-auto space-y-3 md:space-y-4 ${isMobile ? 'p-3 pb-28' : 'p-4'}`}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Aucun message pour le moment
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              otherUserAvatar={conversation.avatar}
              currentUserAvatar={currentUserAvatar}
              onQuoteResponse={onQuoteResponse}
              isMobile={isMobile}
            />
          ))
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        value={newMessage}
        onChange={onMessageChange}
        onSend={onSendMessage}
        onQuoteClick={onQuoteClick}
        isMobile={isMobile}
      />
    </div>
  );
}

