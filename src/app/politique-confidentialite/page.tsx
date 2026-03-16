import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité – Rentoall',
  description: 'Politique de confidentialité de l\'application Rentoall',
};

export default function PolitiqueConfidentialite() {
  const lastUpdated = '16 mars 2026';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">
            ← Rentoall
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 text-sm">Politique de confidentialité</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Politique de confidentialité
          </h1>
          <p className="text-slate-500 text-sm">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Qui sommes-nous ?</h2>
            <p>
              Rentoall est une plateforme de mise en relation entre particuliers pour la location
              d'espaces (parkings, caves, box de stockage). L'application est éditée par{' '}
              <strong>Rentoall SAS</strong>, joignable à l'adresse{' '}
              <a href="mailto:contact@rentoall.com" className="text-emerald-600 hover:underline">
                contact@rentoall.com
              </a>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Données d'identification</strong> : nom, prénom, adresse e-mail, numéro
                de téléphone lors de la création d'un compte.
              </li>
              <li>
                <strong>Photos</strong> : photos de profil et photos de vos espaces mis en
                location, prises depuis la galerie ou la caméra de votre appareil.
              </li>
              <li>
                <strong>Données de localisation</strong> : position géographique (avec votre
                accord) pour afficher les espaces disponibles à proximité.
              </li>
              <li>
                <strong>Données de paiement</strong> : traitées exclusivement par notre
                prestataire Stripe. Rentoall ne stocke aucune donnée bancaire.
              </li>
              <li>
                <strong>Messages</strong> : échanges entre locataires et hôtes via la messagerie
                intégrée.
              </li>
              <li>
                <strong>Données de navigation</strong> : journaux d'activité, adresse IP,
                identifiant de l'appareil, pour assurer la sécurité et améliorer l'application.
              </li>
              <li>
                <strong>Notifications push</strong> : jeton d'appareil pour vous envoyer des
                notifications (nouvelles réservations, messages, etc.).
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Finalités du traitement</h2>
            <p className="mb-3">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Créer et gérer votre compte utilisateur.</li>
              <li>Mettre en relation locataires et hôtes.</li>
              <li>Traiter les réservations et les paiements.</li>
              <li>Vous envoyer des notifications liées à votre activité sur la plateforme.</li>
              <li>Améliorer la sécurité et les performances de l'application.</li>
              <li>Respecter nos obligations légales.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Permissions de l'application</h2>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">📷 Caméra</p>
                <p className="text-sm">
                  Utilisée uniquement pour vous permettre de prendre des photos de vos espaces
                  lors de la création ou modification d'une annonce. Cette permission n'est
                  activée qu'après votre accord explicite.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">🖼️ Galerie de photos</p>
                <p className="text-sm">
                  Accès à vos photos pour importer des images sur vos annonces ou votre
                  profil. L'accès est demandé uniquement lors de l'utilisation de cette
                  fonctionnalité.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">📍 Localisation</p>
                <p className="text-sm">
                  Utilisée pour afficher les espaces disponibles près de vous. Vous pouvez
                  utiliser l'application sans activer cette permission.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-1">🔔 Notifications</p>
                <p className="text-sm">
                  Pour vous alerter des nouvelles réservations, messages et mises à jour
                  importantes. Vous pouvez les désactiver à tout moment dans les paramètres
                  de votre appareil.
                </p>
              </div>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Partage des données</h2>
            <p className="mb-3">
              Nous ne vendons jamais vos données. Elles peuvent être partagées avec :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe</strong> (paiements) — politique :{' '}
                <a
                  href="https://stripe.com/fr/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  stripe.com/fr/privacy
                </a>
              </li>
              <li>
                <strong>Firebase / Google</strong> (notifications push, analytics) — politique :{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  policies.google.com/privacy
                </a>
              </li>
              <li>
                Autorités compétentes, si requis par la loi.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Conservation des données</h2>
            <p>
              Vos données sont conservées pendant la durée de votre compte et jusqu'à 3 ans
              après sa suppression, conformément aux obligations légales. Les données de paiement
              sont conservées 5 ans (obligation comptable).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Vos droits (RGPD)</h2>
            <p className="mb-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous
              disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données.</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes.</li>
              <li>
                <strong>Droit à l'effacement</strong> : demander la suppression de votre
                compte et de vos données.
              </li>
              <li>
                <strong>Droit d'opposition</strong> : vous opposer au traitement de vos données.
              </li>
              <li>
                <strong>Droit à la portabilité</strong> : recevoir vos données dans un format
                structuré.
              </li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:contact@rentoall.com" className="text-emerald-600 hover:underline">
                contact@rentoall.com
              </a>
              . Vous pouvez également introduire une réclamation auprès de la{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                CNIL
              </a>
              .
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
              pour protéger vos données contre tout accès non autorisé, perte ou divulgation :
              chiffrement HTTPS, accès restreint aux données, authentification sécurisée.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Mineurs</h2>
            <p>
              Rentoall est destiné aux personnes âgées de 18 ans et plus. Nous ne collectons
              pas sciemment de données de mineurs. Si vous pensez qu'un mineur nous a fourni
              des informations, contactez-nous pour les supprimer.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              10. Modifications de cette politique
            </h2>
            <p>
              Nous pouvons mettre à jour cette politique. En cas de modification significative,
              vous serez notifié via l'application ou par e-mail. La date de dernière mise à
              jour est indiquée en haut de cette page.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact</h2>
            <p>
              Pour toute question relative à cette politique ou à vos données personnelles :
            </p>
            <div className="mt-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <p className="font-semibold text-slate-900">Rentoall SAS</p>
              <p className="text-sm text-slate-600 mt-1">
                Email :{' '}
                <a href="mailto:contact@rentoall.com" className="text-emerald-600 hover:underline">
                  contact@rentoall.com
                </a>
              </p>
              <p className="text-sm text-slate-600">Site : rentoall.com</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full transition-colors text-sm"
          >
            Retour à Rentoall
          </Link>
        </div>
      </main>
    </div>
  );
}
