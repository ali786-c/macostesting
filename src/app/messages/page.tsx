'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import SkeletonLoading from '@/components/ui/skeleton-loading';
import LoadingLogo from '@/components/ui/loading-logo';
import AnimatedLoadingText from '@/components/ui/animated-loading-text';
import Image from 'next/image';
import { MessageSquare, Search, Send, Paperclip, Smile, MoreVertical, Check, CheckCheck, Clock, Car, Box, Warehouse, Calendar, Euro, MapPin, CheckCircle, XCircle, Image as ImageIcon, FileText, Zap, X, ChevronLeft, User, Phone, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { messagesAPI, MessageDTO, placesAPI, PlaceDTO, rentoallUsersAPI, UserDTO, reservationsAPI, ReservationDTO, reportingAPI, ReportReason } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { CapacitorDynamicLink } from '@/components/CapacitorDynamicLink';
import { getDisplayFirstName, capitalizeFirstPerLine, getDefaultPlaceImage, getValidPhoto } from '@/lib/utils';
import {
  localModeration,
  MODERATION_ERROR_MESSAGE,
  MODERATION_HELP_MESSAGE,
  MAX_MESSAGE_LENGTH,
  SPAM_MESSAGE_LIMIT,
  SPAM_WINDOW_MS,
  isContentModeratedByBackend,
  MODERATED_CONTENT_PLACEHOLDER,
} from '@/lib/message-moderation';
import { fromApiDateTime } from '@/lib/datetime';

interface ConversationSummary {
  placeId: number;
  placeTitle: string;
  placeImage: string;
  placeType: 'parking' | 'storage' | 'cellar';
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage?: string;
  lastMessageDate?: Date;
  /** Date du dernier message (modéré ou non), utilisée uniquement pour le tri */
  lastActivityDate?: Date;
  unreadCount: number;
}

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDTO | null>(null);
  const [otherUserDetails, setOtherUserDetails] = useState<UserDTO | null>(null);
  const [reservation, setReservation] = useState<ReservationDTO | null>(null);
  const [isLoadingReservation, setIsLoadingReservation] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportValidationError, setReportValidationError] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showReservationSheet, setShowReservationSheet] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUserSendingRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const hasScrolledRef = useRef<boolean>(false);
  const sendTimestampsRef = useRef<number[]>([]);
  const addedFromUrlRef = useRef<string | null>(null);

  // Bloc "coordonnées" (modération) : affiché une seule fois par conversation, puis masqué (persisté en localStorage)
  const MODERATION_SEEN_KEY = 'messages_moderation_seen';
  const [moderationHelpSeenKeys, setModerationHelpSeenKeys] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const s = localStorage.getItem(MODERATION_SEEN_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const showModerationHelp =
    selectedPlaceId != null &&
    selectedOtherUserId != null &&
    !moderationHelpSeenKeys.includes(`${selectedPlaceId}_${selectedOtherUserId}`);
  const markModerationHelpSeen = () => {
    if (selectedPlaceId == null || selectedOtherUserId == null) return;
    const key = `${selectedPlaceId}_${selectedOtherUserId}`;
    if (moderationHelpSeenKeys.includes(key)) return;
    const next = [...moderationHelpSeenKeys, key];
    setModerationHelpSeenKeys(next);
    try {
      localStorage.setItem(MODERATION_SEEN_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  // Mode utilisateur (client / hôte) : détermine quelles conversations afficher et le senderRole à l'envoi
  const [userMode, setUserMode] = useState<'client' | 'host'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('userMode') === 'host' ? 'host' : 'client'
  );

  // Récupérer l'ID de l'utilisateur connecté
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setCurrentUserId(parseInt(userId, 10));
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Synchroniser le mode (client/hôte) avec le localStorage ; le rechargement des conversations est fait par l'effet ci-dessous (currentUserId + userMode)
  useEffect(() => {
    const saved = localStorage.getItem('userMode') as 'client' | 'host' | null;
    if (saved === 'host' || saved === 'client') setUserMode(saved);
    const onModeChange = () => {
      const next = localStorage.getItem('userMode') as 'client' | 'host' | null;
      if (next === 'host' || next === 'client') setUserMode(next);
    };
    window.addEventListener('userModeChanged', onModeChange);
    return () => window.removeEventListener('userModeChanged', onModeChange);
  }, []);

  // Réinitialiser les refs de scroll quand on change de conversation
  useEffect(() => {
    if (selectedPlaceId && selectedOtherUserId) {
      isInitialLoadRef.current = true;
      hasScrolledRef.current = false;
      setModerationError(null);
    }
  }, [selectedPlaceId, selectedOtherUserId]);

  // Fermer le menu au clic dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatMenu]);

  // Vérifier les paramètres d'URL pour ouvrir une conversation depuis une fiche place / lien direct
  // Ne faire que mettre à jour la sélection : le chargement (messages, place, user) est fait par l'effet "conversation sélectionnée" pour éviter double reload
  useEffect(() => {
    const placeIdParam = searchParams.get('placeId');
    const userIdParam = searchParams.get('userId');
    
    if (!placeIdParam || !userIdParam || !currentUserId) return;
    
    const placeId = parseInt(placeIdParam, 10);
    const otherUserId = parseInt(userIdParam, 10);
    if (Number.isNaN(placeId) || Number.isNaN(otherUserId)) return;
    
    setSelectedPlaceId(placeId);
    setSelectedOtherUserId(otherUserId);
  }, [searchParams, currentUserId]);

  // Charger les conversations de l'utilisateur (filtrées par rôle : GUEST en mode client, HOST en mode hôte)
  const loadConversations = async () => {
    if (!currentUserId) return;

    const messageRole: 'HOST' | 'GUEST' = userMode === 'host' ? 'HOST' : 'GUEST';

    try {
      setIsLoading(true);
      const allMessages = await messagesAPI.getUserMessages(currentUserId, messageRole);
      
      // Grouper les messages par conversation (placeId + otherUserId)
      const conversationsMap = new Map<string, ConversationSummary>();
      
      for (const message of allMessages) {
        // Utiliser les nouveaux champs du MessageDTO avec fallback sur les anciens
        const senderIdNum = typeof message.senderId === 'string' ? parseInt(message.senderId, 10) : message.senderId;
        const receiverIdNum = typeof message.receiverId === 'string' 
          ? parseInt(message.receiverId, 10) 
          : (typeof message.receiverId === 'number' 
            ? message.receiverId 
            : (typeof message.recipientId === 'string' 
              ? parseInt(message.recipientId, 10) 
              : (typeof message.recipientId === 'number' ? message.recipientId : 0)));
        const otherUserId = senderIdNum === currentUserId ? receiverIdNum : senderIdNum;
        const placeId = message.placeId;
        const key = `${placeId || 'unknown'}-${otherUserId}`;
        
        // Utiliser timestamp avec fallback sur createdAt
        const messageTimestamp = message.timestamp || message.createdAt || new Date().toISOString();
        const messageDate = new Date(messageTimestamp);
        // Vérifier si le message est lu : utiliser isRead en priorité, puis status === 'READ'
        const isRead = message.isRead !== undefined 
          ? message.isRead 
          : (message.status === 'READ');
        
        if (!conversationsMap.has(key)) {
          // Charger les détails du bien et de l'utilisateur
          let place: PlaceDTO | null = null;
          let otherUser: UserDTO | null = null;
          
          try {
            if (typeof placeId === 'number') {
              place = await placesAPI.getById(placeId);
            }
          } catch (err) {
            console.error('Erreur lors du chargement du bien:', err);
          }
          
          try {
            otherUser = await rentoallUsersAPI.getProfile(otherUserId);
          } catch (err) {
            console.error('Erreur lors du chargement de l\'utilisateur:', err);
          }
          
          const spaceType = place?.type === 'PARKING' ? 'parking' as const :
                           place?.type === 'STORAGE_SPACE' ? 'storage' as const :
                           'cellar' as const;
          
          const defaultImage = '/fond.jpg';
          const isModerated = isContentModeratedByBackend(message.content ?? '') || (message.content === MODERATED_CONTENT_PLACEHOLDER);
          
          conversationsMap.set(key, {
            placeId: typeof placeId === 'number' ? placeId : (typeof placeId === 'string' ? parseInt(placeId, 10) || 0 : 0),
            placeTitle: capitalizeFirstPerLine(message.placeName || (place?.title && String(place.title).trim()) || place?.description?.split('.')[0] || `${spaceType} - ${place?.city || ''}`),
            placeImage: getValidPhoto(place?.photos, place?.type),
            placeType: spaceType,
            otherUserId: otherUserId,
            otherUserName: getDisplayFirstName(
              message.receiverName || message.senderName || (otherUser ? { firstName: otherUser.firstName, email: otherUser.email } : null),
              `Utilisateur ${otherUserId}`
            ),
            otherUserAvatar: (typeof otherUser?.profilePicture === 'string' ? otherUser.profilePicture : null) || '/logoR.png',
            lastMessage: isModerated ? undefined : message.content,
            lastMessageDate: isModerated ? undefined : messageDate,
            lastActivityDate: messageDate,
            unreadCount: receiverIdNum === (currentUserId ?? 0) && !isRead ? 1 : 0,
          });
        } else {
          const conv = conversationsMap.get(key)!;
          const isModerated = isContentModeratedByBackend(message.content ?? '') || (message.content === MODERATED_CONTENT_PLACEHOLDER);
          if (!conv.lastActivityDate || messageDate > conv.lastActivityDate) {
            conv.lastActivityDate = messageDate;
          }
          if (!isModerated) {
            if (!conv.lastMessageDate || messageDate > conv.lastMessageDate) {
              conv.lastMessage = message.content;
              conv.lastMessageDate = messageDate;
            }
          }
          // Incrémenter le compteur de non lus
          if (receiverIdNum === (currentUserId ?? 0) && !isRead) {
            conv.unreadCount += 1;
          }
        }
      }
      
      const conversationsList = Array.from(conversationsMap.values())
        .sort((a, b) => {
          const dateA = a.lastActivityDate?.getTime() ?? a.lastMessageDate?.getTime() ?? 0;
          const dateB = b.lastActivityDate?.getTime() ?? b.lastMessageDate?.getTime() ?? 0;
          return dateB - dateA;
        });
      
      // Ne jamais réafficher le badge pour la conversation actuellement ouverte
      const listToSet = (selectedPlaceId != null && selectedOtherUserId != null)
        ? conversationsList.map(c =>
            c.placeId === selectedPlaceId && c.otherUserId === selectedOtherUserId
              ? { ...c, unreadCount: 0 }
              : c
          )
        : conversationsList;
      
      setConversations(listToSet);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les messages d'une conversation
  const loadMessages = async (placeId: number, otherUserId: number) => {
    if (!currentUserId) {
      console.warn('⚠️ [MESSAGES] Impossible de charger les messages : currentUserId manquant');
      return;
    }
    
    // Validation des IDs
    if (!placeId || placeId <= 0) {
      console.error('❌ [MESSAGES] placeId invalide:', placeId);
      return;
    }
    
    if (!otherUserId || otherUserId <= 0) {
      console.error('❌ [MESSAGES] otherUserId invalide:', otherUserId);
      return;
    }
    
    if (currentUserId === otherUserId) {
      console.error('❌ [MESSAGES] Erreur : currentUserId et otherUserId sont identiques:', currentUserId);
      return;
    }
    
    // S'assurer que les IDs sont des nombres
    const placeIdNum = typeof placeId === 'number' ? placeId : parseInt(String(placeId), 10);
    const currentUserIdNum = typeof currentUserId === 'number' ? currentUserId : parseInt(String(currentUserId), 10);
    const otherUserIdNum = typeof otherUserId === 'number' ? otherUserId : parseInt(String(otherUserId), 10);
    
    console.log('🔵 [MESSAGES] Chargement de la conversation:', {
      placeId: placeIdNum,
      currentUserId: currentUserIdNum,
      otherUserId: otherUserIdNum,
      'URL attendue': `/api/messages/conversation?placeId=${placeIdNum}&user1Id=${currentUserIdNum}&user2Id=${otherUserIdNum}`
    });
    
    try {
      const conversationMessages = await messagesAPI.getConversation(placeIdNum, currentUserIdNum, otherUserIdNum);
      console.log('✅ [MESSAGES] Messages récupérés:', conversationMessages?.length || 0, 'message(s)');
      setMessages(conversationMessages || []);
      
      // Marquer la conversation comme lue (même si 0 message, pour synchroniser le compteur côté backend)
      try {
        await messagesAPI.markAsRead(currentUserIdNum, otherUserIdNum, placeIdNum);
      } catch (_) {}
      setConversations(prev => prev.map(conv =>
        conv.placeId === placeIdNum && conv.otherUserId === otherUserIdNum
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
      window.dispatchEvent(new CustomEvent('messagesRead'));
    } catch (error) {
      console.error('❌ [MESSAGES] Erreur lors du chargement des messages:', error);
      const errorObj = error as { response?: { status?: number; data?: unknown } };
      if (errorObj?.response) {
        console.error('❌ [MESSAGES] Détails de l\'erreur:', {
          status: errorObj.response.status,
          data: errorObj.response.data
        });
      }
      // Si la conversation n'existe pas encore, on initialise avec un tableau vide
      setMessages([]);
    }
  };

  // Charger les détails du bien
  const loadPlaceDetails = async (placeId: number) => {
    try {
      const place = await placesAPI.getById(placeId);
      setPlaceDetails(place);
    } catch (error) {
      console.error('Erreur lors du chargement du bien:', error);
    }
  };

  // Charger les détails de l'utilisateur
  const loadUserDetails = async (userId: number) => {
    try {
      const user = await rentoallUsersAPI.getProfile(userId);
      setOtherUserDetails(user);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    }
  };

  // Charger la réservation liée au bien et à l'autre utilisateur
  const loadReservation = async (placeId: number, otherUserId: number) => {
    if (!currentUserId || !placeDetails) return;
    
    try {
      setIsLoadingReservation(true);
      // Récupérer toutes les réservations du bien
      const placeReservations = await reservationsAPI.getPlaceReservations(placeId);
      
      // Trouver la réservation qui concerne l'autre utilisateur et l'utilisateur actuel
      const relevantReservation = placeReservations.find(res => {
        // Vérifier si la réservation concerne les deux utilisateurs
        // Si l'utilisateur actuel est le client et l'autre est le propriétaire
        const isClient = res.clientId === currentUserId && placeDetails.ownerId === otherUserId;
        // Si l'utilisateur actuel est le propriétaire et l'autre est le client
        const isHost = res.clientId === otherUserId && placeDetails.ownerId === currentUserId;
        return isClient || isHost;
      });
      
      if (relevantReservation) {
        setReservation(relevantReservation);
      } else {
        setReservation(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la réservation:', error);
      setReservation(null);
    } finally {
      setIsLoadingReservation(false);
    }
  };

  // Charger les conversations au montage et quand le mode (client/hôte) change
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, userMode]);

  // Charger les messages quand une conversation est sélectionnée (dépendances stables : pas searchParams pour éviter re-runs inutiles)
  useEffect(() => {
    if (!selectedPlaceId || !selectedOtherUserId || !currentUserId) return;

    const placeIdNum = selectedPlaceId;
    const otherUserIdNum = selectedOtherUserId;
    const currentUserIdNum = typeof currentUserId === 'number' ? currentUserId : parseInt(String(currentUserId), 10);

    // Marquer comme lu immédiatement dès l'ouverture de la conversation (ne pas attendre le chargement des messages)
    // pour que le backend persiste avant un éventuel refresh
    messagesAPI.markAsRead(currentUserIdNum, otherUserIdNum, placeIdNum).then(() => {
      setConversations(prev => prev.map(conv =>
        conv.placeId === placeIdNum && conv.otherUserId === otherUserIdNum
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
      window.dispatchEvent(new CustomEvent('messagesRead'));
    }).catch(() => {});

    const placeIdParam = searchParams.get('placeId');
    const userIdParam = searchParams.get('userId');
    const fromUrl = placeIdParam === String(selectedPlaceId) && userIdParam === String(selectedOtherUserId);
    if (!fromUrl) setMessages([]);

    loadMessages(selectedPlaceId, selectedOtherUserId);
    loadPlaceDetails(selectedPlaceId);
    loadUserDetails(selectedOtherUserId);

    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      loadMessages(selectedPlaceId, selectedOtherUserId);
      window.dispatchEvent(new CustomEvent('messagesRead'));
    }, 60000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedPlaceId, selectedOtherUserId, currentUserId]);

  // Charger la réservation quand les détails du bien sont chargés
  useEffect(() => {
    if (placeDetails && selectedPlaceId && selectedOtherUserId && currentUserId) {
      loadReservation(selectedPlaceId, selectedOtherUserId);
    } else {
      setReservation(null);
    }
  }, [placeDetails, selectedPlaceId, selectedOtherUserId, currentUserId]);

  // Quand on ouvre une conversation via l'URL : l'ajouter à la liste si pas déjà fait (une seule fois par placeId-userId, sans dépendre de conversations)
  const placeIdUrl = searchParams.get('placeId');
  const userIdUrl = searchParams.get('userId');
  useEffect(() => {
    if (!placeIdUrl || !userIdUrl) {
      addedFromUrlRef.current = null;
      return;
    }
    if (!selectedPlaceId || !selectedOtherUserId || !currentUserId) return;
    const placeId = parseInt(placeIdUrl, 10);
    const otherUserId = parseInt(userIdUrl, 10);
    if (Number.isNaN(placeId) || Number.isNaN(otherUserId)) return;
    if (selectedPlaceId !== placeId || selectedOtherUserId !== otherUserId) return;

    const key = `${placeId}-${otherUserId}`;
    if (addedFromUrlRef.current === key) return;
    if (!placeDetails || !otherUserDetails) return;

    addedFromUrlRef.current = key;
    const placeTitle = capitalizeFirstPerLine((placeDetails?.title && String(placeDetails.title).trim()) || placeDetails?.description?.split('.')[0] || `Espace #${placeId}`);
    const spaceType = placeDetails?.type === 'PARKING' ? 'parking' as const : placeDetails?.type === 'STORAGE_SPACE' ? 'storage' as const : 'cellar' as const;
    const otherUserName = getDisplayFirstName(otherUserDetails || null, `Utilisateur ${otherUserId}`);
    const otherUserAvatar = (typeof otherUserDetails?.profilePicture === 'string' ? otherUserDetails.profilePicture : null) || '/logoR.png';
    const placeImage = getValidPhoto(placeDetails?.photos, placeDetails?.type);

    setConversations(prev => {
      if (prev.some(c => c.placeId === placeId && c.otherUserId === otherUserId)) return prev;
      return [{
        placeId,
        placeTitle,
        placeImage,
        placeType: spaceType,
        otherUserId,
        otherUserName,
        otherUserAvatar,
        unreadCount: 0,
      }, ...prev];
    });
  }, [placeIdUrl, userIdUrl, selectedPlaceId, selectedOtherUserId, currentUserId, placeDetails, otherUserDetails]);

  // Toujours scroller en bas de la conversation à l'ouverture ou quand les messages changent (comportement type app de messagerie)
  const scrollMessagesToBottom = useCallback((smooth = false) => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    
    if (messages.length === 0) {
      scrollMessagesToBottom(false);
      return;
    }
    
    if (isUserSendingRef.current) {
      isUserSendingRef.current = false;
    }
    
    // Laisser le DOM se mettre à jour puis scroller en bas (plusieurs frames pour layout)
    const t1 = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollMessagesToBottom(false);
        });
      });
    }, 80);
    const t2 = setTimeout(() => scrollMessagesToBottom(false), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, scrollMessagesToBottom]);

  // Envoyer un message
  const handleSendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedPlaceId || !selectedOtherUserId || !currentUserId || isSending) return;

    // Limite longueur
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setModerationError(`Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères.`);
      return;
    }

    // Anti-spam : max 5 messages en 10 secondes
    const now = Date.now();
    const timestamps = sendTimestampsRef.current.filter((t) => now - t < SPAM_WINDOW_MS);
    if (timestamps.length >= SPAM_MESSAGE_LIMIT) {
      setModerationError('Trop de messages envoyés. Veuillez patienter quelques secondes.');
      return;
    }

    const allowEmailPhone = reservation?.status === 'CONFIRMED' || reservation?.status === 'confirmée';
    const mod = localModeration(trimmed, { allowEmailPhone });
    if (!mod.allowed) {
      setModerationError(MODERATION_ERROR_MESSAGE);
      return;
    }

    setModerationError(null);

    try {
      setIsSending(true);
      isUserSendingRef.current = true;

      const senderIdNum = typeof currentUserId === 'number' ? currentUserId : parseInt(String(currentUserId), 10);
      const receiverIdNum = typeof selectedOtherUserId === 'number' ? selectedOtherUserId : parseInt(String(selectedOtherUserId), 10);
      const placeIdNum = typeof selectedPlaceId === 'number' ? selectedPlaceId : parseInt(String(selectedPlaceId), 10);
      const senderRole: 'HOST' | 'GUEST' = userMode === 'host' ? 'HOST' : 'GUEST';

      const response = await messagesAPI.sendMessage({
        senderId: senderIdNum,
        receiverId: receiverIdNum,
        placeId: placeIdNum,
        content: trimmed,
        senderRole,
        ...(reservation?.id != null && { reservationId: reservation.id }),
      });

      // Backend peut renvoyer 200 avec status BLOCKED
      const data = response as { status?: string; message?: string; id?: number; content?: string; senderId?: number; createdAt?: string };
      if (data?.status === 'BLOCKED') {
        setModerationError(data.message || MODERATION_ERROR_MESSAGE);
        return;
      }

      sendTimestampsRef.current = [...timestamps, now].slice(-SPAM_MESSAGE_LIMIT);

      setMessageInput('');
      markModerationHelpSeen();
      await loadMessages(placeIdNum, receiverIdNum);
      setConversations(prev => prev.map(conv =>
        conv.placeId === placeIdNum && conv.otherUserId === receiverIdNum
          ? { ...conv, lastMessage: trimmed, lastMessageDate: new Date(), lastActivityDate: new Date() }
          : conv
      ));

      // Scroller vers le bas pour afficher le message envoyé (après mise à jour du DOM)
      setTimeout(() => scrollMessagesToBottom(true), 100);
      setTimeout(() => scrollMessagesToBottom(true), 350);

      if (messages.length === 0 && pollingIntervalRef.current === null) {
        pollingIntervalRef.current = setInterval(() => {
          if (selectedPlaceId && selectedOtherUserId) {
            loadMessages(selectedPlaceId, selectedOtherUserId);
            window.dispatchEvent(new CustomEvent('messagesRead'));
          }
        }, 60000);
      }
    } catch (error) {
      const err = error as { response?: { data?: { status?: string; message?: string } } };
      if (err.response?.data?.status === 'BLOCKED') {
        setModerationError(err.response.data.message || MODERATION_ERROR_MESSAGE);
      } else {
        console.error('Erreur lors de l\'envoi du message:', error);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Fonction pour formater l'heure (HH:mm)
  const formatHour = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    if (isNaN(dateObj.getTime())) return '';
    
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return dateObj.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  // Fonction pour formater la date (pour les séparateurs)
  const formatDateLabel = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    if (isNaN(dateObj.getTime())) return '';

    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return language === 'fr' ? "Aujourd'hui" : "Today";
    } else if (diffDays === 1) {
      return language === 'fr' ? 'Hier' : 'Yesterday';
    } else if (diffDays < 7) {
      return dateObj.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    } else {
      return dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Fonction pour vérifier si deux dates sont le même jour
  const isSameDay = (date1: Date | string | undefined | null, date2: Date | string | undefined | null): boolean => {
    if (!date1 || !date2) return false;
    
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatTime = (date: Date | string | undefined | null) => {
    // Gérer les cas où date est undefined, null ou invalide
    if (!date) {
      return 'Date inconnue';
    }

    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = fromApiDateTime(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return 'Date invalide';
    }

    // Vérifier que la date est valide
    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }

    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days === 0) {
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 0 ? 'À l\'instant' : `Il y a ${minutes} min`;
      }
      return `Il y a ${hours}h`;
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  // Fonction pour signaler un utilisateur
  const handleReportUser = async () => {
    setReportValidationError(null);
    setReportError(null);
    if (!selectedOtherUserId || !currentUserId || !reportReason.trim()) {
      setReportValidationError('Veuillez sélectionner une raison de signalement');
      return;
    }

    setIsReporting(true);
    try {
      await reportingAPI.reportUser({
        userId: selectedOtherUserId,
        reason: reportReason as ReportReason,
        description: reportDescription.trim() || undefined,
        reporterId: currentUserId,
      });

      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      setShowReportSuccess(true);
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      setReportError('Une erreur est survenue lors du signalement. Veuillez réessayer.');
    } finally {
      setIsReporting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? fromApiDateTime(date) : date;
    return dateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'parking': return Car;
      case 'storage': return Box;
      case 'cellar': return Warehouse;
      default: return Car;
    }
  };

  const selectedConversation = conversations.find(
    conv => conv.placeId === selectedPlaceId && conv.otherUserId === selectedOtherUserId
  );

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const isChatOpen = !!(selectedPlaceId && selectedOtherUserId);

  return (
    <div className="flex flex-col bg-slate-50 w-full max-w-full overflow-hidden min-h-0
      max-md:h-[calc(100dvh-3.5rem-max(5.5rem,calc(env(safe-area-inset-bottom,0px)+5rem)))]
      md:h-[calc(100vh-5rem)] md:min-h-0"
    >
      <HeaderNavigation />

      <main
        className="flex-1 flex flex-col mobile-page-main min-h-0 overflow-hidden w-full md:h-full
          pt-0 md:pt-[max(0.5rem,calc(env(safe-area-inset-top,0px)+0.5rem))]
          md:pb-0
        "
        style={{
          paddingBottom: isChatOpen ? 0 : 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)',
        }}
      >
        <SkeletonLoading isLoading={isLoading}>
        <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full px-3 sm:px-4 md:px-6 lg:px-8 overflow-hidden md:h-full">
          {/* Header - masqué sur mobile quand une conversation est ouverte */}
          <div className={`flex items-center justify-between flex-shrink-0 ${isChatOpen ? 'hidden md:flex md:mb-4 md:mb-6' : 'mb-4 sm:mb-6'}`}>
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900">Messages</h1>
                {totalUnreadCount > 0 && (
                  <span className="px-2 sm:px-3 py-1 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
              <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">
                {userMode === 'host' ? 'Conversations en tant qu\'hôte' : 'Conversations en tant que client'}
              </p>
            </div>
          </div>

          {/* Desktop : 3 colonnes (liste | conversation | panneau). Sur mobile une seule colonne. */}
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_340px] md:grid-rows-[minmax(0,1fr)] gap-3 sm:gap-4 flex-1 min-h-0 min-w-0 w-full overflow-hidden">
            {/* Colonne gauche : liste — masquée uniquement sur mobile quand une conv est ouverte */}
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 w-full md:w-[280px] md:min-w-[280px] md:max-w-[280px] ${selectedPlaceId && selectedOtherUserId ? 'max-md:hidden' : ''}`}>
              {/* Search */}
              <div className="p-3 sm:p-4 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Conversations - un seul scroll, fluide sur mobile */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Chargement...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Aucune conversation</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {conversations.map((conversation) => {
                      const TypeIcon = getTypeIcon(conversation.placeType);
                      const isSelected = selectedPlaceId === conversation.placeId && 
                                        selectedOtherUserId === conversation.otherUserId;
                      
                      return (
                        <button
                          key={`${conversation.placeId}-${conversation.otherUserId}`}
                          onClick={() => {
                            // Enlever tout de suite le badge et marquer comme lu côté backend
                            const placeIdNum = conversation.placeId;
                            const otherUserIdNum = conversation.otherUserId;
                            setConversations(prev => prev.map(conv => 
                              conv.placeId === placeIdNum && conv.otherUserId === otherUserIdNum
                                ? { ...conv, unreadCount: 0 }
                                : conv
                            ));
                            if (currentUserId && conversation.unreadCount > 0) {
                              messagesAPI.markAsRead(
                                typeof currentUserId === 'number' ? currentUserId : parseInt(String(currentUserId), 10),
                                otherUserIdNum,
                                placeIdNum
                              ).then(() => {
                                window.dispatchEvent(new CustomEvent('messagesRead'));
                              }).catch(() => {});
                            }
                            setSelectedPlaceId(conversation.placeId);
                            setSelectedOtherUserId(conversation.otherUserId);
                          }}
                          className={`w-full p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer min-h-[72px] ${
                            isSelected ? 'bg-emerald-50' : ''
                          }`}
                        >
                          <div className="flex gap-2 sm:gap-3">
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-200">
                                <Image
                                  src={conversation.otherUserAvatar}
                                  alt={conversation.otherUserName}
                                  width={48}
                                  height={48}
                                  className="object-cover"
                                />
                              </div>
                              {conversation.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] sm:text-xs font-bold text-white">{conversation.unreadCount}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                  {conversation.otherUserName}
                                </h3>
                                {conversation.lastMessageDate && (
                                  <span className="text-[10px] sm:text-xs text-slate-500 flex-shrink-0">
                                    {formatTime(conversation.lastMessageDate)}
                                </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                <TypeIcon className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <p className="text-[10px] sm:text-xs text-slate-600 truncate">{conversation.placeTitle}</p>
                              </div>
                              {conversation.lastMessage && (
                                <p className={`text-xs sm:text-sm truncate ${
                                conversation.unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-600'
                              }`}>
                                {conversation.lastMessage}
                              </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Zone conversation : scroll dans la zone messages, barre d'envoi en bas — toujours visible sur desktop quand une conv est sélectionnée */}
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 flex-1 min-w-0 md:max-h-full ${!selectedPlaceId || !selectedOtherUserId ? 'hidden md:flex' : ''}`}>
              {selectedPlaceId && selectedOtherUserId ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Back button on mobile */}
                      <button
                        onClick={() => {
                          setSelectedPlaceId(null);
                          setSelectedOtherUserId(null);
                        }}
                        className="lg:hidden mr-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                        <Image
                          src={(typeof otherUserDetails?.profilePicture === 'string' ? otherUserDetails.profilePicture : null) || selectedConversation?.otherUserAvatar || '/logoR.png'}
                          alt={otherUserDetails?.firstName || selectedConversation?.otherUserName || 'Utilisateur'}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {getDisplayFirstName(
                            otherUserDetails || selectedConversation?.otherUserName,
                            'Hôte'
                          )}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                          {capitalizeFirstPerLine((placeDetails?.title && placeDetails.title.trim()) || placeDetails?.description?.split('.')[0] || selectedConversation?.placeTitle || 'Espace')}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0" ref={chatMenuRef}>
                      {/* Desktop : lien direct vers l'espace */}
                      <CapacitorDynamicLink
                        href={`/parking/${selectedPlaceId}/`}
                        className="hidden md:flex p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Voir l'espace"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-600" />
                      </CapacitorDynamicLink>
                      {/* Mobile : bouton qui ouvre le menu d'actions */}
                      <button
                        type="button"
                        onClick={() => setShowChatMenu(!showChatMenu)}
                        className="lg:hidden p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer touch-manipulation"
                        title="Options"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                      </button>
                      {/* Menu mobile : popup avec les options */}
                      {showChatMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-[10005] lg:hidden bg-black/40" 
                            onClick={() => setShowChatMenu(false)}
                            aria-hidden="true"
                          />
                          {/* Mobile: bottom sheet */}
                          <div className="fixed inset-x-0 bottom-0 z-[10010] bg-white rounded-t-2xl shadow-2xl border border-slate-200 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200">
                          <CapacitorDynamicLink
                            href={`/parking/${selectedPlaceId}/`}
                            onClick={() => setShowChatMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 min-h-[48px] text-left text-sm font-medium text-slate-900 hover:bg-slate-50 active:bg-slate-100 cursor-pointer touch-manipulation"
                          >
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            Voir l&apos;espace
                          </CapacitorDynamicLink>
                          <button
                            type="button"
                            onClick={() => {
                              setShowChatMenu(false);
                              setShowReservationSheet(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] text-left text-sm font-medium text-slate-900 hover:bg-slate-50 active:bg-slate-100 cursor-pointer touch-manipulation"
                          >
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Détails de la réservation
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowChatMenu(false);
                              setShowReportModal(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] text-left text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 cursor-pointer touch-manipulation"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Signaler cet utilisateur
                          </button>
                        </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Zone messages scrollable — scroll uniquement ici, barre d'envoi reste visible */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-behavior-contain p-4 sm:p-4 space-y-4 sm:space-y-4 pb-4 flex flex-col max-md:pb-[11rem]"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                    role="log"
                    aria-label="Messages de la conversation"
                  >
                    {messages.map((message, index) => {
                      const senderIdNum = typeof message.senderId === 'string' ? parseInt(message.senderId, 10) : message.senderId;
                      const isSent = senderIdNum === (currentUserId ?? 0);
                      // Utiliser timestamp avec fallback sur createdAt
                      const messageTimestamp = message.timestamp || message.createdAt;
                      const isRead = message.isRead !== undefined ? message.isRead : (message.status === 'READ');
                      
                      // Vérifier si on doit afficher un séparateur de date
                      const previousMessage = index > 0 ? messages[index - 1] : null;
                      const previousTimestamp = previousMessage?.timestamp || previousMessage?.createdAt;
                      const showDateSeparator = !previousMessage || !isSameDay(messageTimestamp, previousTimestamp);
                      
                      return (
                        <React.Fragment key={message.id}>
                          {/* Séparateur de date au milieu de la fenêtre */}
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-4 sm:my-5">
                              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 rounded-full">
                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                                <span className="text-[10px] sm:text-xs font-medium text-slate-600">
                                  {messageTimestamp ? formatDateLabel(messageTimestamp) : 'Date inconnue'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className={`flex gap-3 ${isSent ? 'flex-row-reverse' : ''}`}>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                              <Image
                                src={isSent 
                                  ? '/logoR.png'
                                  : ((typeof otherUserDetails?.profilePicture === 'string' ? otherUserDetails.profilePicture : null) || selectedConversation?.otherUserAvatar || '/logoR.png')
                                }
                                alt={isSent ? 'Moi' : (otherUserDetails?.firstName || 'Utilisateur')}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                            <div className={`flex flex-col max-w-[88%] sm:max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
                              <div className={`rounded-2xl px-4 py-3 sm:px-4 sm:py-2.5 ${
                                isSent
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                              }`}>
                                <p className="text-[15px] sm:text-sm leading-relaxed break-words">{isContentModeratedByBackend(message.content) ? MODERATED_CONTENT_PLACEHOLDER : message.content}</p>
                              </div>
                              {/* Heure sous le message */}
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-xs sm:text-xs text-slate-500">
                                  {messageTimestamp ? formatHour(messageTimestamp) : ''}
                                </span>
                                {!isSent && (message.senderRole === 'HOST' || message.senderRole === 'GUEST') && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    message.senderRole === 'HOST' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {message.senderRole === 'HOST' ? 'Hôte' : 'Client'}
                                  </span>
                                )}
                                {isSent && (
                                  <div className="flex items-center" title={isRead ? "Lu" : "Envoyé"}>
                                    {isRead ? (
                                      <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                                    ) : (
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Barre d'envoi - fixe en bas sur mobile (au-dessus de la nav), en flow sur desktop */}
                  <div
                    className="messages-input-bar-mobile flex-shrink-0 bg-white border-t border-slate-200 p-3 sm:p-4
                      max-md:shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
                    style={{
                      paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                    }}
                  >
                    {/* Message d'aide modération : affiché une fois par conversation, puis masqué */}
                    {showModerationHelp && (
                      <p className="text-xs text-slate-500 mb-2">
                        {MODERATION_HELP_MESSAGE}
                      </p>
                    )}
                    {moderationError && (
                      <div className="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {moderationError}
                      </div>
                    )}
                    {/* Barre et bouton Envoyer toujours sur la même ligne (mobile + desktop) */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 min-h-[44px]">
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                              if (moderationError) setModerationError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Tapez votre message..."
                            rows={1}
                            maxLength={MAX_MESSAGE_LENGTH}
                            className="w-full min-h-[44px] max-md:h-[44px] max-md:min-h-[44px] max-md:max-h-[44px] max-md:overflow-y-hidden max-md:resize-none px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
                          />
                        </div>
                        <button
                          onClick={handleSendMessage}
                          disabled={
                            !messageInput.trim() ||
                            isSending ||
                            messageInput.length > MAX_MESSAGE_LENGTH ||
                            !localModeration(messageInput.trim(), {
                              allowEmailPhone: reservation?.status === 'CONFIRMED' || reservation?.status === 'confirmée',
                            }).allowed
                          }
                          className="flex-shrink-0 p-2 sm:p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                      <span className={`text-right text-[10px] ${messageInput.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {messageInput.length} / {MAX_MESSAGE_LENGTH}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Sélectionnez une conversation</h3>
                    <p className="text-slate-600">Choisissez une conversation pour commencer à échanger</p>
                  </div>
                </div>
              )}
            </div>

            {/* Panneau réservation - colonne droite (desktop) */}
            {selectedPlaceId && selectedOtherUserId && (
              <div className="hidden md:flex flex-col min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:max-h-full">
                {isLoadingReservation ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Chargement de la réservation...</p>
                    </div>
                  </div>
                ) : reservation ? (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      Détails de la réservation
                    </h3>
                    
                    {/* Reservation Status */}
                    <div className={`mb-4 p-3 rounded-lg border ${
                      reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : reservation.status === 'PENDING' || reservation.status === 'en attente'
                        ? 'bg-amber-50 border-amber-200'
                        : reservation.status === 'CANCELLED' || reservation.status === 'annulée'
                        ? 'bg-red-50 border-red-200'
                        : reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested'
                        ? 'bg-blue-50 border-blue-200'
                        : reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted'
                        ? 'bg-emerald-50 border-emerald-200'
                        : reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : reservation.status === 'CANCELLED' || reservation.status === 'annulée' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested' ? (
                          <AlertTriangle className="w-5 h-5 text-blue-600" />
                        ) : reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600" />
                        )}
                        <span className={`text-sm font-semibold ${
                          reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' 
                            ? 'text-emerald-700' 
                            : reservation.status === 'CANCELLED' || reservation.status === 'annulée'
                            ? 'text-red-700'
                            : reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested'
                            ? 'text-blue-700'
                            : reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted'
                            ? 'text-emerald-700'
                            : reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}>
                          {reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' 
                            ? 'Confirmée' 
                            : reservation.status === 'PENDING' || reservation.status === 'en attente'
                            ? 'En attente'
                            : reservation.status === 'CANCELLED' || reservation.status === 'annulée'
                            ? 'Annulée'
                            : reservation.status === 'UPDATE_REQUESTED' || reservation.status === 'update_requested'
                            ? 'Modification demandée'
                            : reservation.status === 'UPDATE_ACCEPTED' || reservation.status === 'update_accepted'
                            ? 'Modification acceptée'
                            : reservation.status === 'UPDATE_REJECTED' || reservation.status === 'update_rejected'
                            ? 'Modification refusée'
                            : reservation.status}
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="mb-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 mb-1">Date de début</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(reservation.startDateTime)}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {fromApiDateTime(reservation.startDateTime).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                          <Calendar className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 mb-1">Date de fin</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(reservation.endDateTime)}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {fromApiDateTime(reservation.endDateTime).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Durée</span>
                          <span className="text-sm font-bold text-slate-900">
                            {Math.ceil((fromApiDateTime(reservation.endDateTime).getTime() - fromApiDateTime(reservation.startDateTime).getTime()) / (1000 * 60 * 60 * 24))} jour{Math.ceil((fromApiDateTime(reservation.endDateTime).getTime() - fromApiDateTime(reservation.startDateTime).getTime()) / (1000 * 60 * 60 * 24)) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Prix */}
                    <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">Montant total</span>
                        <span className="text-xl font-bold text-emerald-600">
                          {reservation.totalPrice.toFixed(2)} €
                        </span>
                      </div>
                      {reservation.serviceFee && (
                        <p className="text-xs text-slate-500">
                          Frais de service : {reservation.serviceFee.toFixed(2)} €
                        </p>
                      )}
                    </div>

                    {/* Espace */}
                    {placeDetails && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          Espace
                        </h4>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm font-medium text-slate-900 break-words whitespace-pre-line leading-relaxed">
                            {placeDetails.description || `Espace #${placeDetails.id}`}
                          </p>
                          <p className="text-xs text-slate-600 mt-2">{placeDetails.city || placeDetails.address}</p>
                          <CapacitorDynamicLink
                            href={`/parking/${placeDetails.id}/`}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                          >
                            Voir l'espace
                            <ChevronLeft className="w-3 h-3 rotate-180" />
                          </CapacitorDynamicLink>
                        </div>
                      </div>
                    )}

                    {/* Lien vers la réservation complète */}
                    <CapacitorDynamicLink
                      href={`/reservations/${reservation.id}/`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors text-sm mb-2"
                    >
                      Voir les détails complets
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </CapacitorDynamicLink>

                    {/* Bouton Signaler cet utilisateur */}
                    {selectedOtherUserId && (
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors text-sm border border-red-200 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Signaler cet utilisateur
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-8">
                    {placeDetails ? (
                      <>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                          Bien concerné
                        </h3>
                        <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          <div className="relative aspect-[16/10] w-full bg-slate-200">
                            <Image
                              src={getValidPhoto(placeDetails.photos, placeDetails?.type)}
                              alt={(placeDetails.title && placeDetails.title.trim()) || placeDetails.description?.split('.')[0] || `Espace #${placeDetails.id}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 320px"
                            />
                          </div>
                          <div className="p-3 sm:p-4">
                            <p className="text-sm font-semibold text-slate-900 mb-1">
                              {(placeDetails.title && placeDetails.title.trim()) || placeDetails.description?.split('.')[0] || `Espace #${placeDetails.id}`}
                            </p>
                            {(placeDetails.address || placeDetails.city) && (
                              <p className="text-xs text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {[placeDetails.address, placeDetails.city].filter(Boolean).join(', ')}
                              </p>
                            )}
                            <CapacitorDynamicLink
                              href={`/parking/${placeDetails.id}/`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 mt-3"
                            >
                              Voir l&apos;espace
                              <ChevronLeft className="w-4 h-4 rotate-180" />
                            </CapacitorDynamicLink>
                          </div>
                        </div>
                        {selectedOtherUserId && (
                          <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors text-sm border border-red-200 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Signaler cet utilisateur
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-sm text-slate-500">Chargement du bien...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </SkeletonLoading>
      </main>

      {/* Sheet mobile : panneau Détails réservation (équivalent au sidebar web) */}
      {showReservationSheet && selectedPlaceId && selectedOtherUserId && (
        <div className="fixed inset-0 z-[10010] lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowReservationSheet(false)}
            aria-hidden="true"
          />
          <div 
            className="absolute bottom-0 left-0 right-0 top-[15%] bg-white rounded-t-2xl shadow-2xl overflow-y-auto"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {reservation ? 'Détails de la réservation' : 'Bien concerné'}
              </h3>
              <button
                type="button"
                onClick={() => setShowReservationSheet(false)}
                className="p-2 -mr-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4">
              {isLoadingReservation ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-500">Chargement...</p>
                </div>
              ) : reservation ? (
                <>
                  <div className={`mb-4 p-3 rounded-lg border ${
                    reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : reservation.status === 'PENDING' || reservation.status === 'en attente'
                      ? 'bg-amber-50 border-amber-200'
                      : reservation.status === 'CANCELLED' || reservation.status === 'annulée'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : reservation.status === 'CANCELLED' || reservation.status === 'annulée' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600" />
                      )}
                      <span className="text-sm font-semibold">
                        {reservation.status === 'CONFIRMED' || reservation.status === 'confirmée' 
                          ? 'Confirmée' 
                          : reservation.status === 'PENDING' || reservation.status === 'en attente'
                          ? 'En attente'
                          : reservation.status === 'CANCELLED' || reservation.status === 'annulée'
                          ? 'Annulée'
                          : reservation.status}
                      </span>
                    </div>
                  </div>
                  <div className="mb-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Date de début</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(reservation.startDateTime)}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {fromApiDateTime(reservation.startDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                        <Calendar className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Date de fin</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(reservation.endDateTime)}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {fromApiDateTime(reservation.endDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-600">Durée</span>
                      <span className="text-sm font-bold text-slate-900">
                        {Math.ceil((fromApiDateTime(reservation.endDateTime).getTime() - fromApiDateTime(reservation.startDateTime).getTime()) / (1000 * 60 * 60 * 24))} jour(s)
                      </span>
                    </div>
                  </div>
                  <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Montant total</span>
                      <span className="text-xl font-bold text-emerald-600">{reservation.totalPrice.toFixed(2)} €</span>
                    </div>
                    {reservation.serviceFee && (
                      <p className="text-xs text-slate-500">Frais de service : {reservation.serviceFee.toFixed(2)} €</p>
                    )}
                  </div>
                  {placeDetails && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        Espace
                      </h4>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-sm font-medium text-slate-900 break-words whitespace-pre-line leading-relaxed">
                          {placeDetails.description || `Espace #${placeDetails.id}`}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">{placeDetails.city || placeDetails.address}</p>
                        <CapacitorDynamicLink
                          href={`/parking/${placeDetails.id}/`}
                          onClick={() => setShowReservationSheet(false)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                        >
                          Voir l&apos;espace
                          <ChevronLeft className="w-3 h-3 rotate-180" />
                        </CapacitorDynamicLink>
                      </div>
                    </div>
                  )}
                  <CapacitorDynamicLink
                    href={`/reservations/${reservation.id}/`}
                    onClick={() => setShowReservationSheet(false)}
                    className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors text-sm mb-2"
                  >
                    Voir les détails complets
                  </CapacitorDynamicLink>
                  {selectedOtherUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowReservationSheet(false);
                        setShowReportModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm border border-red-200 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Signaler cet utilisateur
                    </button>
                  )}
                </>
              ) : (
                placeDetails ? (
                  <>
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      Bien concerné
                    </h3>
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <div className="relative aspect-[16/10] w-full bg-slate-200">
                        <Image
                          src={getValidPhoto(placeDetails.photos, placeDetails?.type)}
                          alt={(placeDetails.title && placeDetails.title.trim()) || placeDetails.description?.split('.')[0] || `Espace #${placeDetails.id}`}
                          fill
                          className="object-cover"
                          sizes="100vw"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="text-sm font-semibold text-slate-900 mb-1">
                          {(placeDetails.title && placeDetails.title.trim()) || placeDetails.description?.split('.')[0] || `Espace #${placeDetails.id}`}
                        </p>
                        {(placeDetails.address || placeDetails.city) && (
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            {[placeDetails.address, placeDetails.city].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <CapacitorDynamicLink
                          href={`/parking/${placeDetails.id}/`}
                          onClick={() => setShowReservationSheet(false)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 mt-3"
                        >
                          Voir l&apos;espace
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </CapacitorDynamicLink>
                      </div>
                    </div>
                    {selectedOtherUserId && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowReservationSheet(false);
                          setShowReportModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm border border-red-200 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Signaler cet utilisateur
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-slate-500">Chargement du bien...</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de signalement - z-index au-dessus du footer mobile */}
      {showReportModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[10010]"
            onClick={() => {
              setShowReportModal(false);
              setReportValidationError(null);
              setReportError(null);
            }}
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[10010] p-0 md:p-4">
            <div 
              className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Signaler cet utilisateur
                </h3>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                    setReportDescription('');
                    setReportValidationError(null);
                    setReportError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg -mr-2"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(reportValidationError || reportError) && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{reportValidationError || reportError}</p>
                </div>
              )}

              <p className="text-sm text-slate-600 mb-4">
                Veuillez sélectionner une raison pour signaler cet utilisateur.
              </p>

              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="INACCURATE_OR_INCORRECT"
                    checked={reportReason === 'INACCURATE_OR_INCORRECT'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Information inexacte ou incorrecte</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="NOT_A_REAL_ACCOMMODATION"
                    checked={reportReason === 'NOT_A_REAL_ACCOMMODATION'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Annonce fictive / pas un vrai hébergement</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="SCAM"
                    checked={reportReason === 'SCAM'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Arnaque</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="SHOCKING_CONTENT"
                    checked={reportReason === 'SHOCKING_CONTENT'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Contenu choquant</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="ILLEGAL_CONTENT"
                    checked={reportReason === 'ILLEGAL_CONTENT'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Contenu illégal</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="SPAM"
                    checked={reportReason === 'SPAM'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Spam</span>
                </label>

                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="reportReason"
                    value="OTHER"
                    checked={reportReason === 'OTHER'}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-slate-900">Autre</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Décrivez le problème..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                    setReportDescription('');
                    setReportValidationError(null);
                    setReportError(null);
                  }}
                  className="flex-1 px-4 py-2 min-h-[44px] border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed touch-manipulation"
                  disabled={isReporting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleReportUser}
                  disabled={!reportReason.trim() || isReporting}
                  className="flex-1 px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 touch-manipulation"
                >
                  {isReporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Signaler
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Message de succès après signalement */}
      {showReportSuccess && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-[10015]"
            onClick={() => setShowReportSuccess(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[10015] p-4">
            <div 
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Signalement envoyé</h3>
              <p className="text-sm text-slate-600 mb-6">
                Merci pour votre signalement. Nous examinerons votre demande dans les plus brefs délais.
              </p>
              <button
                onClick={() => setShowReportSuccess(false)}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}

      <div className={`shrink-0 ${isChatOpen ? 'hidden' : ''}`}>
        <FooterNavigation />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-white flex flex-col">
          <HeaderNavigation />
          <main className="pt-0 md:pt-[max(5rem,calc(env(safe-area-inset-top,0px)+5rem))] pb-20 md:pb-12 flex-1 flex items-center justify-center mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
            <div className="text-center">
              <div className="md:hidden mb-4">
                <LoadingLogo size="md" />
              </div>
              <div className="hidden md:block mb-4">
                <LoadingLogo size="md" />
              </div>
              <AnimatedLoadingText className="mt-2" />
            </div>
          </main>
          <FooterNavigation />
        </div>
      }>
        <MessagesPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
