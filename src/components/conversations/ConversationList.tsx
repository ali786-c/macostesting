'use client';

import { Search, Trash2 } from 'lucide-react';
import { Conversation } from './types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation?: (conversationId: string) => void;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-72 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 md:p-4 border-b border-gray-100 md:border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-200 md:border-gray-200 bg-gray-50 md:bg-gray-50 text-sm text-gray-900 placeholder-gray-400 md:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Aucune conversation trouvée
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-3 border-b border-gray-100 md:border-gray-100 hover:bg-orange-50/50 transition-colors ${
                selectedConversationId === conv.id
                  ? 'bg-orange-50 border-l-2 border-l-orange-500'
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-10 h-10 md:w-10 md:h-10 rounded-full"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      conv.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-gray-900 font-medium text-sm truncate">{conv.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-[10px] flex-shrink-0">{conv.time}</span>
                      {onDeleteConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Supprimer la conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs truncate">{conv.lastMessage}</p>
                </div>
                {conv.hasUnread && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

