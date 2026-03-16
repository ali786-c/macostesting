'use client';

import { Users, ArrowLeft, Shield, Lock, Eye, AlertTriangle, CheckCircle, Key, Database, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-mobile-footer md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">InfluConnect</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors duration-200">
                EN
              </button>
              <span className="text-gray-300">|</span>
              <button className="px-3 py-1.5 text-sm font-medium text-orange-600 font-semibold">
                FR
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Sécurité et Protection</h1>
              <p className="text-gray-600">Nos engagements en matière de sécurité des données</p>
            </div>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Notre engagement sécurité</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Chez InfluConnect, la sécurité de vos données est notre priorité absolue. Nous mettons en place 
                les mesures les plus avancées pour protéger vos informations personnelles et professionnelles.
              </p>
              
              <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Certification ISO 27001</h3>
                    <p className="text-green-700">Notre système de management de la sécurité de l&apos;information est certifié ISO 27001</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mesures de sécurité techniques</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="flex items-center mb-4">
                    <Lock className="w-8 h-8 text-blue-600 mr-3" />
                    <h3 className="text-xl font-semibold text-blue-800">Chiffrement des données</h3>
                  </div>
                  <ul className="text-blue-700 space-y-2">
                    <li>• Chiffrement AES-256 en transit</li>
                    <li>• Chiffrement AES-256 au repos</li>
                    <li>• Certificats SSL/TLS 1.3</li>
                    <li>• Chiffrement bout en bout</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-6 rounded-xl">
                  <div className="flex items-center mb-4">
                    <Key className="w-8 h-8 text-purple-600 mr-3" />
                    <h3 className="text-xl font-semibold text-purple-800">Authentification</h3>
                  </div>
                  <ul className="text-purple-700 space-y-2">
                    <li>• Authentification à deux facteurs (2FA)</li>
                    <li>• Gestion des sessions sécurisées</li>
                    <li>• Authentification biométrique</li>
                    <li>• Single Sign-On (SSO)</li>
                  </ul>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-orange-50 p-6 rounded-xl">
                  <div className="flex items-center mb-4">
                    <Database className="w-8 h-8 text-orange-600 mr-3" />
                    <h3 className="text-xl font-semibold text-orange-800">Protection des données</h3>
                  </div>
                  <ul className="text-orange-700 space-y-2">
                    <li>• Sauvegardes chiffrées quotidiennes</li>
                    <li>• Réplication géographique</li>
                    <li>• Détection d&apos;intrusion 24/7</li>
                    <li>• Monitoring en temps réel</li>
                  </ul>
                </div>

                <div className="bg-red-50 p-6 rounded-xl">
                  <div className="flex items-center mb-4">
                    <Eye className="w-8 h-8 text-red-600 mr-3" />
                    <h3 className="text-xl font-semibold text-red-800">Surveillance</h3>
                  </div>
                  <ul className="text-red-700 space-y-2">
                    <li>• Logs d&apos;audit complets</li>
                    <li>• Détection d&apos;anomalies IA</li>
                    <li>• Alertes de sécurité automatiques</li>
                    <li>• Équipe SOC 24/7</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Conformité et certifications</h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">RGPD</h3>
                  <p className="text-gray-600 text-sm">Conformité européenne</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">ISO 27001</h3>
                  <p className="text-gray-600 text-sm">Sécurité de l&apos;information</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">SOC 2</h3>
                  <p className="text-gray-600 text-sm">Contrôles de sécurité</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Bonnes pratiques recommandées</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">Conseils de sécurité</h3>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Utilisez des mots de passe forts et uniques</li>
                      <li>• Activez l&apos;authentification à deux facteurs</li>
                      <li>• Ne partagez jamais vos identifiants</li>
                      <li>• Vérifiez régulièrement votre activité</li>
                      <li>• Signalez tout comportement suspect</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Incidents de sécurité</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                En cas d&apos;incident de sécurité, nous nous engageons à :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Notifier les utilisateurs concernés dans les 72 heures</li>
                <li>Coopérer avec les autorités compétentes</li>
                <li>Mettre en place des mesures correctives immédiates</li>
                <li>Publier un rapport détaillé de l&apos;incident</li>
                <li>Renforcer nos mesures de sécurité</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Audits et tests de sécurité</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Nous effectuons régulièrement des audits de sécurité et des tests de pénétration :
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Audits internes</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Mensuels</li>
                      <li>• Tests de vulnérabilités</li>
                      <li>• Révision des accès</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Audits externes</h3>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Trimestriels</li>
                      <li>• Tests de pénétration</li>
                      <li>• Certification ISO</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Signalement d&apos;incidents</h2>
              <div className="bg-red-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-red-800 mb-3">Comment signaler un problème de sécurité</h3>
                  <p className="text-red-700 mb-4">
                  Si vous découvrez une vulnérabilité ou un incident de sécurité, contactez-nous immédiatement&nbsp;:
                </p>
                <ul className="text-red-700 space-y-2">
                  <li>• <strong>Email :</strong> security@influconnect.com</li>
                  <li>• <strong>Téléphone :</strong> +33 1 23 45 67 89 (urgences)</li>
                  <li>• <strong>Signalement anonyme :</strong> Via notre formulaire dédié</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Formation et sensibilisation</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Tous nos employés reçoivent une formation régulière sur la sécurité des données et les bonnes 
                pratiques. Nous organisons également des sessions de sensibilisation pour nos utilisateurs.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                  <strong>Prochaine session :</strong> Webinaire &quot;Sécurité des données personnelles&quot; - 15 novembre 2024
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact sécurité</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 mb-4">
                  Pour toute question concernant la sécurité de vos données :
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Équipe sécurité</h3>
                    <p className="text-gray-700 text-sm">security@influconnect.com</p>
                    <p className="text-gray-600 text-sm">Réponse sous 4h</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">DPO (Délégué à la Protection des Données)</h3>
                    <p className="text-gray-700 text-sm">dpo@influconnect.com</p>
                    <p className="text-gray-600 text-sm">Réponse sous 24h</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
