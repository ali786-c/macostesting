import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { registerModalClose, unregisterModalClose } from '@/lib/capacitor-modal-back';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = ''
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const registeredHandlerRef = useRef<(() => void) | null>(null);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Capacitor Android : fermer la modale au bouton retour
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handler = () => onClose();
    registeredHandlerRef.current = handler;
    registerModalClose(handler);
    return () => {
      if (registeredHandlerRef.current) {
        unregisterModalClose(registeredHandlerRef.current);
        registeredHandlerRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  // Bloquer le scroll du body quand la modal est ouverte
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined' && document.body) {
      const scrollY = window.scrollY;
      // Bloquer le scroll du body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurer le scroll du body quand la modal est fermée
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined' || !document.body) return null;

  // Mobile: full-screen modal, Desktop: centered modal
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const modalContent = (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[9999] p-0 md:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-none md:rounded-2xl w-full h-full min-h-[100dvh] md:min-h-0 md:h-auto ${sizeClasses[size]} ${className} shadow-2xl relative md:my-auto overflow-hidden flex flex-col`}
        style={{
          paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          {typeof title === 'string' ? (
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h3>
          ) : (
            <div className="flex-1">{title}</div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 md:p-6 flex-1 overflow-y-auto max-h-[calc(100dvh-80px)] md:max-h-[calc(100vh-200px)]">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal in document.body to avoid z-index issues
  return createPortal(modalContent, document.body);
}
