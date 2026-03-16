'use client';

import React from 'react';
import { Building2, Mail, Globe, Shield } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 md:pb-12 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Mentions légales
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none">
          {/* Section 1 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                1. Éditeur du site
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Rentoall</p>
                <p className="text-slate-700 mb-1">Société par Actions Simplifiée (SAS)</p>
                <p className="text-slate-700 mb-1">Capital social : [À compléter]</p>
                <p className="text-slate-700 mb-1">RCS : [À compléter]</p>
                <p className="text-slate-700 mb-1">SIRET : [À compléter]</p>
                <p className="text-slate-700 mb-1">Siège social : [À compléter]</p>
                <p className="text-slate-700 mb-1">Directeur de publication : [À compléter]</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                2. Hébergement
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Hébergeur du site</p>
                <p className="text-slate-700 mb-1">[Nom de l'hébergeur]</p>
                <p className="text-slate-700 mb-1">Adresse : [À compléter]</p>
                <p className="text-slate-700 mb-1">Téléphone : [À compléter]</p>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm italic">
                Note : Les informations d'hébergement doivent être complétées avec les données réelles de votre hébergeur (ex: Vercel, OVH, etc.)
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                3. Contact
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Pour toute question ou réclamation :</p>
                <p className="text-slate-700 mb-1">Email : contact@rentoall.fr</p>
                <p className="text-slate-700 mb-1">Site web : www.rentoall.fr</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              4. Propriété intellectuelle
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, etc.) est la propriété exclusive de Rentoall 
                ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que 
                soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de Rentoall.
              </p>
              <p>
                Toute exploitation non autorisée du site ou de son contenu engage la responsabilité civile et/ou pénale de l'utilisateur.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              5. Protection des données personnelles
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, Rentoall 
                s'engage à protéger vos données personnelles.
              </p>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">5.1. Données collectées</h3>
                <p className="mb-2">Rentoall collecte les données suivantes :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Données d'identification (nom, prénom, email, téléphone)</li>
                  <li>Données de connexion (adresse IP, logs)</li>
                  <li>Données de transaction (historique des réservations, paiements)</li>
                  <li>Données de localisation (adresse, code postal)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">5.2. Finalités du traitement</h3>
                <p className="mb-2">Vos données sont utilisées pour :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Gérer votre compte utilisateur</li>
                  <li>Traiter vos réservations et paiements</li>
                  <li>Vous contacter concernant nos services</li>
                  <li>Améliorer nos services et notre plateforme</li>
                  <li>Respecter nos obligations légales</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">5.3. Vos droits</h3>
                <p className="mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification des données inexactes</li>
                  <li>Droit à l'effacement de vos données</li>
                  <li>Droit à la limitation du traitement</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition au traitement</li>
                </ul>
                <p className="mt-3">
                  Pour exercer ces droits, contactez-nous à : <strong>contact@rentoall.fr</strong>
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">5.4. Conservation des données</h3>
                <p>
                  Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, 
                  conformément aux obligations légales et réglementaires.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                6. Cookies
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Le site utilise des cookies pour améliorer votre expérience de navigation et analyser le trafic du site. 
                Les cookies sont de petits fichiers texte stockés sur votre appareil.
              </p>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">6.1. Types de cookies utilisés</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Cookies essentiels</strong> : Nécessaires au fonctionnement du site</li>
                  <li><strong>Cookies de performance</strong> : Pour analyser l'utilisation du site</li>
                  <li><strong>Cookies de fonctionnalité</strong> : Pour mémoriser vos préférences</li>
                </ul>
              </div>
              <p>
                Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur. Le refus des cookies peut 
                affecter certaines fonctionnalités du site.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              7. Liens externes
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Le site peut contenir des liens vers des sites externes. Rentoall n'exerce aucun contrôle sur ces sites et décline 
                toute responsabilité quant à leur contenu, leur accessibilité ou leur politique de confidentialité.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              8. Limitation de responsabilité
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Rentoall s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. Cependant, 
                Rentoall ne peut garantir l'exactitude, la complétude ou l'actualité des informations.
              </p>
              <p>
                Rentoall ne pourra être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site ou de 
                l'impossibilité de l'utiliser, sauf en cas de faute lourde ou de dol.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              9. Droit applicable
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Les présentes mentions légales sont régies par le droit français. Tout litige relatif à leur interprétation ou à leur 
                exécution relève de la compétence exclusive des tribunaux français.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              10. Médiation
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Conformément aux articles L. 611-1 et R. 612-1 et suivants du Code de la consommation, Rentoall adhère au service du 
                médiateur de la consommation suivant :
              </p>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">[Nom du médiateur]</p>
                <p className="text-slate-700 mb-1">Adresse : [À compléter]</p>
                <p className="text-slate-700 mb-1">Site web : [À compléter]</p>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm italic">
                Note : Les informations du médiateur doivent être complétées avec les données réelles du médiateur de consommation 
                auquel vous adhérez.
              </p>
            </div>
          </section>
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}
