'use client';

import { useState } from 'react';
import { Users, MapPin, Award, FileText, Flag, X, CheckCircle } from 'lucide-react';
import Button from '../Button';
import { UserProfile } from './types';
import { reportingAPI, UserReportDTO, ReportReason } from '@/services/api';

interface UserProfileSidebarProps {
  profile: UserProfile;
  onQuoteClick?: () => void;
}

export default function UserProfileSidebar({
  profile,
  onQuoteClick,
}: UserProfileSidebarProps) {
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [reportUserReason, setReportUserReason] = useState('');
  const [reportUserDescription, setReportUserDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Profile Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Profil</h3>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                profile.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{profile.name}</h4>
            {profile.title && <p className="text-xs text-gray-500">{profile.title}</p>}
            <p className={`text-[10px] ${profile.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stats */}
        {profile.stats && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h5 className="font-medium text-gray-900 text-xs mb-2.5">Statistiques</h5>
            <div className="grid grid-cols-2 gap-3">
              {profile.stats.followers && (
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{profile.stats.followers}</div>
                  <div className="text-[10px] text-gray-500">Followers</div>
                </div>
              )}
              {profile.stats.engagement && (
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{profile.stats.engagement}</div>
                  <div className="text-[10px] text-gray-500">Engagement</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platforms */}
        {profile.platforms && profile.platforms.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h5 className="font-medium text-gray-900 text-xs mb-2.5">Plateformes</h5>
            <div className="space-y-2.5">
              {profile.platforms.map((platform, index) => (
                <div key={index} className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">
                      {platform.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-xs">{platform.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{platform.handle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audience */}
        {(profile.targetAudience || profile.city) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h5 className="font-medium text-gray-900 text-xs mb-2.5">Audience cible</h5>
            <div className="space-y-2">
              {profile.targetAudience && (
                <div className="flex items-center space-x-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{profile.targetAudience}</span>
                </div>
              )}
              {profile.city && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{profile.city}</span>
                </div>
              )}
              {profile.rating && (
                <div className="flex items-center space-x-2">
                  <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">
                    {profile.rating}/5 ({profile.reviewCount || 0} avis)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quote Generation */}
        {onQuoteClick && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h5 className="font-medium text-gray-900 text-xs mb-3">Générer un devis</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Libellé du devis
                </label>
                <input
                  type="text"
                  placeholder="Ex: Collaboration 3 stories + 1 post"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Prix (€)
                </label>
                <input
                  type="number"
                  placeholder="2000"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Description (optionnel)
                </label>
                <textarea
                  placeholder="Ex: Délai 7 jours, visibilité en story + post"
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-xs bg-white"
                />
              </div>
              <Button
                onClick={onQuoteClick}
                variant="primary"
                fullWidth
                icon={FileText}
                className="!text-xs !py-2"
              >
                Envoyer le devis
              </Button>
              <button className="w-full text-xs text-orange-600 hover:text-orange-700 font-medium">
                Voir mes devis envoyés
              </button>
            </div>
          </div>
        )}

        {/* Bouton Signaler l'utilisateur */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <button
            onClick={() => setShowReportUserModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Flag className="w-4 h-4" />
            Signaler l'utilisateur
          </button>
        </div>
      </div>

      {/* Modal de signalement d'utilisateur */}
      {showReportUserModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!reportSuccess) {
              setShowReportUserModal(false);
              setReportUserReason('');
              setReportUserDescription('');
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setShowReportUserModal(false)}
          aria-label="Fermer"
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-600" />
                Signaler cet utilisateur
              </h3>
              <button
                onClick={() => {
                  setShowReportUserModal(false);
                  setReportUserReason('');
                  setReportUserDescription('');
                  setReportSuccess(false);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-900 mb-2">Signalement envoyé</h4>
                <p className="text-slate-600 mb-6">
                  Merci pour votre signalement. Notre équipe va examiner cet utilisateur dans les plus brefs délais.
                </p>
                <button
                  onClick={() => {
                    setShowReportUserModal(false);
                    setReportUserReason('');
                    setReportUserDescription('');
                    setReportSuccess(false);
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <p className="text-slate-600 mb-6">
                  Aidez-nous à maintenir la qualité de notre plateforme en signalant cet utilisateur.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Raison du signalement *
                    </label>
                    <select
                      value={reportUserReason}
                      onChange={(e) => setReportUserReason(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Sélectionnez une raison</option>
                      <option value="INACCURATE_OR_INCORRECT">Information inexacte ou incorrecte</option>
                      <option value="NOT_A_REAL_ACCOMMODATION">Annonce fictive / pas un vrai hébergement</option>
                      <option value="SCAM">Escroquerie</option>
                      <option value="SHOCKING_CONTENT">Contenu choquant</option>
                      <option value="ILLEGAL_CONTENT">Contenu illégal</option>
                      <option value="SPAM">Spam</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={reportUserDescription}
                      onChange={(e) => setReportUserDescription(e.target.value)}
                      rows={4}
                      placeholder="Décrivez le problème..."
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowReportUserModal(false);
                        setReportUserReason('');
                        setReportUserDescription('');
                      }}
                      disabled={isSubmittingReport}
                      className="flex-1 px-4 py-2 text-slate-700 border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (!reportUserReason || !profile.id) return;
                        
                        setIsSubmittingReport(true);
                        try {
                          const userId = localStorage.getItem('userId');
                          const report: UserReportDTO = {
                            userId: parseInt(profile.id, 10),
                            reason: reportUserReason as ReportReason,
                            description: reportUserDescription || undefined,
                            reporterId: userId ? parseInt(userId, 10) : undefined,
                          };
                          
                          await reportingAPI.reportUser(report);
                          setReportSuccess(true);
                        } catch (error) {
                          console.error('Erreur lors du signalement:', error);
                          alert('Une erreur est survenue. Veuillez réessayer.');
                        } finally {
                          setIsSubmittingReport(false);
                        }
                      }}
                      disabled={!reportUserReason || isSubmittingReport}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmittingReport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Flag className="w-4 h-4" />
                          Signaler
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

