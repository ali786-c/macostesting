'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Smile, Paperclip, FileText } from 'lucide-react';
import Button from '../Button';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuoteClick?: () => void;
  placeholder?: string;
  isMobile?: boolean;
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onQuoteClick,
  placeholder = 'Tapez votre message...',
  isMobile = false,
}: MessageInputProps) {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (isMobile) {
    return (
      <div 
        className="fixed left-0 right-0 bottom-0 p-3 border-t border-gray-200 bg-white flex-shrink-0 z-[10000] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" 
        style={{ 
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="flex items-end gap-2">
          {onQuoteClick && (
            <button
              onClick={onQuoteClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Envoyer un devis"
            >
              <FileText className="w-4 h-4 text-orange-600" />
            </button>
          )}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Message..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full h-10 px-4 pr-12 rounded-full border border-gray-300 bg-gray-50 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                <Smile className="w-4 h-4 text-gray-400" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                <Paperclip className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
          <button
            onClick={onSend}
            className="p-2.5 bg-orange-500 hover:bg-orange-600 rounded-full transition-colors flex-shrink-0"
            disabled={!value.trim()}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full h-10 px-4 pr-12 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <Smile className="w-4 h-4 text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <Paperclip className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
        {onQuoteClick && (
          <Button
            onClick={onQuoteClick}
            variant="primary"
            size="sm"
            icon={FileText}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 !text-xs !px-3 !py-2"
            title="Envoyer un devis"
          >
            Devis
          </Button>
        )}
        <Button
          onClick={onSend}
          variant="primary"
          size="sm"
          icon={Send}
          className="bg-gradient-to-r from-[#FACC15] to-[#EAB308] hover:from-[#E6B800] hover:to-[#D4A500] !text-xs !px-3 !py-2"
        >
          Envoyer
        </Button>
      </div>
    </div>
  );
}

