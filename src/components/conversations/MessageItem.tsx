'use client';

import MessageWithTranslation from '../MessageWithTranslation';
import Card from '../Card';
import Button from '../Button';
import Badge from '../Badge';
import { FileText, Clock, Check, X as XIcon } from 'lucide-react';
import { Message, Quote } from './types';

export type { Message, Quote };

interface MessageItemProps {
  message: Message;
  otherUserAvatar: string;
  currentUserAvatar?: string;
  onQuoteResponse?: (quoteId: string, status: 'accepted' | 'rejected') => void;
  isMobile?: boolean;
}

export default function MessageItem({
  message,
  otherUserAvatar,
  currentUserAvatar,
  onQuoteResponse,
  isMobile = false,
}: MessageItemProps) {
  if (message.type === 'quote' && message.quote) {
    return (
      <div className={`w-full ${isMobile ? 'max-w-[85%]' : 'max-w-lg mx-auto'}`}>
        <Card variant="elevated" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-800">Devis proposé</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-orange-600">{message.quote.price.toLocaleString()}€</span>
              <div className={`text-orange-600 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>Prix total</div>
            </div>
          </div>
          
          <div className={`space-y-2 md:space-y-3 mb-3 md:mb-4`}>
            <div>
              <h4 className={`font-semibold text-gray-800 ${isMobile ? 'text-xs mb-1' : 'text-sm mb-1.5'}`}>
                {message.quote.title}
              </h4>
              {message.quote.description && (
                <p className={`text-gray-600 leading-relaxed ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  {message.quote.description}
                </p>
              )}
            </div>
            
            <div className={`flex items-center gap-2 md:gap-3 ${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
              <div className={`flex items-center gap-1 md:gap-1.5 bg-white/60 ${isMobile ? 'px-2 py-1' : 'px-2.5 py-1.5'} rounded-lg`}>
                <Clock className={`text-orange-500 ${isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                <span className="font-medium">Délai: {message.quote.duration}</span>
              </div>
            </div>
          </div>

          {message.quote.status === 'pending' && !message.isSent && onQuoteResponse && (
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
              <Button
                variant="primary"
                fullWidth
                icon={Check}
                onClick={() => onQuoteResponse(message.quote!.id, 'accepted')}
                className="bg-green-600 hover:bg-green-700 !text-xs !py-2"
              >
                {isMobile ? 'Accepter' : 'Accepter le devis'}
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={XIcon}
                onClick={() => onQuoteResponse(message.quote!.id, 'rejected')}
                className="!text-xs !py-2"
              >
                Refuser
              </Button>
            </div>
          )}

          {message.quote.status !== 'pending' && (
            <div className="text-center">
              <Badge 
                variant={message.quote.status === 'accepted' ? 'success' : 'error'}
                size="sm"
                className={isMobile ? 'text-[9px]' : 'text-xs'}
              >
                {message.quote.status === 'accepted' ? 'Devis accepté' : 'Devis refusé'}
              </Badge>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${message.isSent ? 'justify-end' : 'justify-start'}`}>
      {!message.isSent && (
        <img
          src={otherUserAvatar}
          alt={message.sender?.name || 'User'}
          className="w-7 h-7 rounded-full flex-shrink-0"
        />
      )}
      
      <div className={`flex flex-col ${message.isSent ? 'items-end' : 'items-start'} ${isMobile ? 'max-w-[75%]' : 'max-w-lg'}`}>
        <MessageWithTranslation
          text={message.text}
          isSent={message.isSent}
        />
        <span className={`text-gray-400 ${isMobile ? 'text-[9px] mt-0.5 px-1' : 'text-[10px] mt-1 px-1.5'}`}>
          {message.time}
        </span>
      </div>
      
      {message.isSent && currentUserAvatar && (
        <img
          src={currentUserAvatar}
          alt="Vous"
          className="w-7 h-7 rounded-full flex-shrink-0"
        />
      )}
    </div>
  );
}

