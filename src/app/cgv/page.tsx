'use client';

import React from 'react';
import { Euro, Calendar, XCircle, CreditCard } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderNavigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 md:pb-12 mobile-page-main overflow-x-hidden" style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-3 sm:mb-4">
            Conditions générales de vente
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
              <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                1. Objet
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Les présentes Conditions Générales de Vente (ci-après les "CGV") régissent la vente de services de location d'espaces 
                (parkings, caves, box de stockage, etc.) proposés sur la plateforme Rentoall.
              </p>
              <p>
                Toute réservation effectuée sur la Plateforme implique l'acceptation sans réserve des présentes CGV par le Locataire.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                2. Tarifs et paiement
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.1. Tarifs</h3>
                <p>
                  Les tarifs affichés sur la Plateforme sont exprimés en euros TTC (Toutes Taxes Comprises). Ils incluent la commission 
                  de Rentoall. Les tarifs peuvent varier selon la période, la durée de location et les caractéristiques de l'Espace.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.2. Modalités de paiement</h3>
                <p className="mb-2">Le paiement s'effectue par carte bancaire via notre prestataire de paiement sécurisé. Les moyens de paiement acceptés sont :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Cartes bancaires (Visa, Mastercard, American Express)</li>
                  <li>Paiement en ligne sécurisé</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.3. Moment du paiement</h3>
                <p>
                  Le paiement est exigible immédiatement lors de la confirmation de la réservation. Le montant total est débité au moment 
                  de la réservation. En cas de paiement échelonné, les modalités sont précisées lors de la réservation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">2.4. Commission de service</h3>
                <p>
                  Rentoall prélève une commission de service sur chaque réservation. Cette commission est incluse dans le prix affiché 
                  et est reversée à Rentoall pour les services de mise en relation, de gestion des paiements et d'assistance.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                3. Réservation et confirmation
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.1. Processus de réservation</h3>
                <p className="mb-2">La réservation s'effectue en plusieurs étapes :</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Sélection de l'Espace et des dates souhaitées</li>
                  <li>Vérification des informations et du montant total</li>
                  <li>Paiement en ligne</li>
                  <li>Confirmation de la réservation par email</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.2. Confirmation</h3>
                <p>
                  La réservation est confirmée dès réception du paiement. Un email de confirmation est envoyé au Locataire avec tous les 
                  détails de la réservation (dates, adresse, coordonnées de l'Hôte, montant payé).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">3.3. Disponibilité</h3>
                <p>
                  La disponibilité des Espaces est mise à jour en temps réel. En cas d'indisponibilité au moment de la réservation, 
                  Rentoall s'engage à proposer une solution de remplacement ou à rembourser intégralement le Locataire.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                4. Annulation et remboursement
              </h2>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">4.1. Annulation par le Locataire</h3>
                <p className="mb-2">Les conditions d'annulation varient selon la politique d'annulation choisie par l'Hôte :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Annulation gratuite</strong> : Remboursement intégral jusqu'à 24h avant le début de la location</li>
                  <li><strong>Annulation modérée</strong> : Remboursement intégral jusqu'à 5 jours avant le début de la location</li>
                  <li><strong>Annulation stricte</strong> : Remboursement intégral jusqu'à 14 jours avant le début de la location</li>
                  <li><strong>Non annulable</strong> : Aucun remboursement en cas d'annulation</li>
                </ul>
                <p className="mt-3">
                  Les frais de service de Rentoall ne sont pas remboursables en cas d'annulation, sauf en cas d'annulation par l'Hôte 
                  ou de force majeure.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">4.2. Annulation par l'Hôte</h3>
                <p>
                  Si l'Hôte annule une réservation, le Locataire est intégralement remboursé, y compris les frais de service. 
                  Rentoall peut proposer une solution de remplacement au Locataire.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">4.3. Remboursement</h3>
                <p>
                  Les remboursements sont effectués sur le moyen de paiement utilisé lors de la réservation, dans un délai de 5 à 10 
                  jours ouvrés suivant l'annulation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              5. Utilisation de l'Espace
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Le Locataire s'engage à utiliser l'Espace conformément à sa destination et aux règles établies par l'Hôte. 
                L'Espace doit être restitué dans l'état où il a été trouvé.
              </p>
              <p>
                Toute utilisation non conforme peut entraîner la résiliation immédiate de la location sans remboursement et des poursuites 
                pour dommages et intérêts.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              6. Responsabilité et assurance
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                L'Hôte est responsable de la conformité de son Espace aux réglementations en vigueur et de sa disponibilité effective 
                aux dates convenues.
              </p>
              <p>
                Le Locataire est responsable des dommages causés à l'Espace pendant la durée de la location. Il est recommandé aux 
                Locataires de souscrire une assurance responsabilité civile.
              </p>
              <p>
                Rentoall ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation de l'Espace, 
                sauf en cas de faute lourde ou de dol de sa part.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              7. Réclamations et litiges
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                En cas de problème ou de réclamation, le Locataire doit contacter Rentoall dans les 48 heures suivant le début de la 
                location. Rentoall s'engage à traiter toute réclamation dans les meilleurs délais.
              </p>
              <p>
                Conformément aux dispositions du Code de la consommation concernant le règlement amiable des litiges, Rentoall adhère 
                au service du médiateur de la consommation. Le consommateur peut saisir le médiateur dans les conditions prévues à 
                l'article L. 612-1 du Code de la consommation.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">
              8. Droit de rétractation
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p>
                Conformément à l'article L. 221-18 du Code de la consommation, le droit de rétractation ne s'applique pas aux contrats 
                de fourniture de services d'hébergement, de transport, de restauration ou de loisirs qui doivent être fournis à une 
                date ou à une période déterminée.
              </p>
              <p>
                Par conséquent, les réservations d'espaces sur Rentoall ne bénéficient pas du droit de rétractation de 14 jours, 
                sauf disposition contraire prévue dans la politique d'annulation de l'Hôte.
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
                Les présentes CGV sont régies par le droit français. Tout litige relatif à leur interprétation ou à leur exécution 
                relève de la compétence exclusive des tribunaux français.
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
                Pour toute question concernant les présentes CGV, vous pouvez nous contacter :
              </p>
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">Rentoall</p>
                <p className="text-slate-700">Email : contact@rentoall.com</p>
                <p className="text-slate-700">Site web : rentoall.com</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <FooterNavigation />
    </div>
  );
}
