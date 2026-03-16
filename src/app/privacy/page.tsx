'use client';

import { Users, ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
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
              <h1 className="text-4xl font-bold text-gray-900">Politique de Confidentialité</h1>
              <p className="text-gray-600">Protection et traitement de vos données personnelles</p>
            </div>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Dernière mise à jour :</strong> 26 octobre 2024
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                InfluConnect s&apos;engage à protéger votre vie privée et vos données personnelles. Cette politique 
                de confidentialité explique comment nous collectons, utilisons et protégeons vos informations 
                lorsque vous utilisez notre plateforme.
              </p>
              <p className="text-gray-700 leading-relaxed">
                En utilisant InfluConnect, vous acceptez les pratiques décrites dans cette politique de confidentialité.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Responsable du traitement</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed">
                  <strong>InfluConnect SAS</strong><br />
                  Adresse : 123 Avenue des Champs-Élysées, 75008 Paris, France<br />
                  Email : privacy@influconnect.com<br />
                  Téléphone : +33 1 23 45 67 89
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Données collectées</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Données d&apos;identification</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Date de naissance</li>
                <li>Adresse postale</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Données de profil</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Photo de profil</li>
                <li>Biographie</li>
                <li>Catégorie d&apos;activité</li>
                <li>Localisation</li>
                <li>Statut de vérification</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Données de réseaux sociaux</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Noms d&apos;utilisateur sur les plateformes</li>
                <li>Nombre de followers/abonnés</li>
                <li>Métriques d&apos;engagement</li>
                <li>Contenu publié (avec autorisation)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4 Données techniques</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Adresse IP</li>
                <li>Type de navigateur et version</li>
                <li>Système d&apos;exploitation</li>
                <li>Pages visitées et durée de visite</li>
                <li>Cookies et technologies similaires</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Finalités du traitement</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-orange-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Fonctionnement de la plateforme
                  </h3>
                  <ul className="text-orange-700 space-y-1 text-sm">
                    <li>• Création et gestion de votre compte</li>
                    <li>• Mise en relation avec d&apos;autres utilisateurs</li>
                    <li>• Facilitation des collaborations</li>
                    <li>• Communication entre utilisateurs</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Amélioration du service
                  </h3>
                  <ul className="text-blue-700 space-y-1 text-sm">
                    <li>• Analyse des performances</li>
                    <li>• Développement de nouvelles fonctionnalités</li>
                    <li>• Personnalisation de l&apos;expérience</li>
                    <li>• Support client</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Base légale du traitement</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <div>
                      <strong>Exécution du contrat :</strong> Traitement nécessaire à l&apos;exécution de nos services
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <div>
                      <strong>Intérêt légitime :</strong> Amélioration de nos services et communication marketing
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <div>
                      <strong>Consentement :</strong> Pour certains traitements spécifiques (cookies, marketing)
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Partage des données</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations uniquement dans les cas suivants :
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Avec d&apos;autres utilisateurs :</strong> Informations de profil nécessaires aux collaborations</li>
                <li><strong>Prestataires de services :</strong> Partenaires techniques sous contrat de confidentialité</li>
                <li><strong>Obligations légales :</strong> Lorsque requis par la loi ou les autorités compétentes</li>
                <li><strong>Protection des droits :</strong> Pour protéger nos droits, votre sécurité ou celle d&apos;autrui</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Sécurité des données</h2>
              <div className="bg-green-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Mesures de sécurité
                </h3>
                <ul className="text-green-700 space-y-2">
                  <li>• Chiffrement des données en transit et au repos</li>
                  <li>• Authentification à deux facteurs</li>
                  <li>• Accès restreint aux données personnelles</li>
                  <li>• Surveillance continue des systèmes</li>
                  <li>• Sauvegardes régulières et sécurisées</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Vos droits</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit d&apos;accès</h3>
                  <p className="text-blue-700 text-sm">Consulter vos données personnelles</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit de rectification</h3>
                  <p className="text-blue-700 text-sm">Corriger des informations inexactes</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit d&apos;effacement</h3>
                  <p className="text-blue-700 text-sm">Supprimer vos données</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit à la portabilité</h3>
                  <p className="text-blue-700 text-sm">Récupérer vos données</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit d&apos;opposition</h3>
                  <p className="text-blue-700 text-sm">Vous opposer au traitement</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Droit de limitation</h3>
                  <p className="text-blue-700 text-sm">Limiter le traitement</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies et technologies similaires</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nous utilisons des cookies pour améliorer votre expérience sur notre site. Vous pouvez gérer 
                vos préférences de cookies dans les paramètres de votre navigateur.
              </p>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Note :</strong> La désactivation de certains cookies peut affecter le fonctionnement de la plateforme.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Conservation des données</h2>
              <p className="text-gray-700 leading-relaxed">
                Nous conservons vos données personnelles uniquement le temps nécessaire aux finalités pour 
                lesquelles elles ont été collectées, conformément aux obligations légales applicables.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact et réclamations</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Pour exercer vos droits ou pour toute question concernant cette politique de confidentialité :
                </p>
                <ul className="text-gray-700 space-y-2">
                  <li><strong>Email :</strong> privacy@influconnect.com</li>
                  <li><strong>Courrier :</strong> InfluConnect SAS, 123 Avenue des Champs-Élysées, 75008 Paris</li>
                  <li><strong>CNIL :</strong> Vous pouvez également saisir la CNIL si vous estimez que vos droits ne sont pas respectés</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
