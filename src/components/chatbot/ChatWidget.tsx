'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { SUGGESTED_QUESTIONS } from '@/lib/chatbot/faq-data';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedQuestions?: string[];
  timestamp: Date;
}

interface ChatWidgetProps {
  apiEndpoint?: string;
}

export default function ChatWidget({ apiEndpoint = '/api/chat-faq' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis l\'assistant Rentoall. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la requête');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'Désolé, je n\'ai pas pu générer de réponse.',
        suggestedQuestions: data.suggestedQuestions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[CHATBOT] Erreur envoi message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 cursor-pointer touch-manipulation"
          aria-label="Ouvrir le chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-96 h-[600px] sm:h-[700px] bg-white shadow-2xl rounded-t-xl sm:rounded-l-xl sm:rounded-t-none border-t border-l border-slate-200 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Assistant Rentoall</h3>
              <p className="text-xs text-emerald-100">Comment puis-je vous aider ?</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-emerald-100 transition-colors cursor-pointer touch-manipulation"
              aria-label="Fermer le chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Questions suggérées :</p>
                      {message.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(q)}
                          disabled={isLoading}
                          className="block w-full text-left text-xs text-emerald-600 hover:text-emerald-700 hover:underline py-0.5 disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions - visible au démarrage */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 border-t border-slate-100 pt-2">
              <p className="text-xs text-slate-500 mb-2">Questions fréquentes :</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
