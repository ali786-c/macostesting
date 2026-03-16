'use client';

import React from 'react';
import { FileText, Shield, Users, AlertCircle } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 md:pb-12 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Conditions générales d'utilisation
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
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                1. Objet et champ d'application
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après les "CGU") régissent l'utilisation de la plateforme Rentoall 
                accessible à l'adresse <strong>www.rentoall.fr</strong> (ci-après la "Plateforme").
              </p>
              <p>
                Rentoall est une plateforme de mise en relation permettant aux propriétaires (ci-après les "Hôtes") de proposer à la location 
                leurs espaces de stationnement, caves, box de stockage et autres espaces similaires (ci-après les "Espaces") à des locataires 
                (ci-après les "Locataires").
              </p>
              <p>
                En accédant et en utilisant la Plateforme, vous reconnaissez avoir lu, compris et accepté sans réserve les présentes CGU. 
                Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                2. Compte utilisateur
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.1. Création du compte</h3>
                <p>
                  Pour utiliser la Plateforme, vous devez créer un compte en fournissant des informations exactes, complètes et à jour. 
                  Vous êtes responsable de la confidentialité de vos identifiants de connexion.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.2. Utilisation du compte</h3>
                <p>
                  Vous êtes seul responsable de toutes les activités effectuées depuis votre compte. Vous vous engagez à ne pas partager 
                  vos identifiants et à nous informer immédiatement de toute utilisation non autorisée.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.3. Compte professionnel</h3>
                <p>
                  Si vous créez un compte professionnel, vous garantissez que vous avez l'autorité légale pour représenter l'entreprise 
                  et que toutes les informations fournies sont exactes.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                3. Utilisation de la Plateforme
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.1. Obligations des Hôtes</h3>
                <p className="mb-2">En tant qu'Hôte, vous vous engagez à :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Fournir des informations exactes et complètes concernant votre Espace</li>
                  <li>Respecter les lois et réglementations applicables</li>
                  <li>Assurer la disponibilité de l'Espace aux dates indiquées</li>
                  <li>Maintenir l'Espace dans un état propre et sécurisé</li>
                  <li>Respecter les droits des Locataires</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.2. Obligations des Locataires</h3>
                <p className="mb-2">En tant que Locataire, vous vous engagez à :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Utiliser l'Espace conformément à sa description et à sa destination</li>
                  <li>Respecter les règles établies par l'Hôte</li>
                  <li>Prendre soin de l'Espace et le restituer dans l'état où vous l'avez trouvé</li>
                  <li>Respecter les horaires et conditions d'accès convenus</li>
                  <li>Payer les montants dus dans les délais prévus</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.3. Interdictions</h3>
                <p className="mb-2">Il est strictement interdit de :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Utiliser la Plateforme à des fins illégales ou frauduleuses</li>
                  <li>Publier des contenus trompeurs, offensants ou discriminatoires</li>
                  <li>Contourner les systèmes de sécurité de la Plateforme</li>
                  <li>Usurper l'identité d'une autre personne</li>
                  <li>Perturber le fonctionnement de la Plateforme</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                4. Responsabilité
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Rentoall agit en tant que simple intermédiaire technique. La Plateforme met en relation les Hôtes et les Locataires, 
                mais n'est pas partie aux contrats de location conclus entre eux.
              </p>
              <p>
                Rentoall ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité 
                d'utiliser la Plateforme, ni des litiges entre Hôtes et Locataires.
              </p>
              <p>
                Chaque utilisateur est seul responsable de ses actes et de leurs conséquences. Les Hôtes sont responsables de la conformité 
                de leurs Espaces aux réglementations en vigueur et de leur disponibilité effective.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              5. Propriété intellectuelle
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                La Plateforme et son contenu (textes, images, logos, graphismes, etc.) sont protégés par le droit d'auteur et appartiennent 
                à Rentoall ou à ses partenaires.
              </p>
              <p>
                Vous vous engagez à ne pas reproduire, copier, modifier, distribuer ou exploiter tout ou partie de la Plateforme sans 
                autorisation préalable écrite de Rentoall.
              </p>
              <p>
                Les contenus que vous publiez sur la Plateforme (photos, descriptions, avis) restent votre propriété, mais vous accordez 
                à Rentoall une licence d'utilisation non exclusive pour les utiliser sur la Plateforme.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              6. Données personnelles
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Rentoall collecte et traite vos données personnelles conformément à sa Politique de Confidentialité et au Règlement 
                Général sur la Protection des Données (RGPD).
              </p>
              <p>
                En utilisant la Plateforme, vous consentez à la collecte, au traitement et à l'utilisation de vos données personnelles 
                dans les conditions décrites dans notre Politique de Confidentialité.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              7. Modification des CGU
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Rentoall se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur 
                publication sur la Plateforme.
              </p>
              <p>
                Il est de votre responsabilité de consulter régulièrement les CGU. Votre utilisation continue de la Plateforme après 
                modification des CGU vaut acceptation des nouvelles conditions.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              8. Résiliation
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Rentoall se réserve le droit de suspendre ou de résilier votre compte à tout moment en cas de violation des présentes CGU, 
                sans préavis ni remboursement.
              </p>
              <p>
                Vous pouvez résilier votre compte à tout moment en nous contactant. Les réservations en cours restent valides jusqu'à leur terme.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              9. Droit applicable et juridiction
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou à leur exécution relève 
                de la compétence exclusive des tribunaux français.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              10. Contact
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Pour toute question concernant les présentes CGU, vous pouvez nous contacter :
              </p>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Rentoall</p>
                <p className="text-slate-700">Email : contact@rentoall.fr</p>
                <p className="text-slate-700">Site web : www.rentoall.fr</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}
