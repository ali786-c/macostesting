/**
 * Données FAQ partagées entre la page FAQ et le bot
 */

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
}

export const FAQ_DATA: FAQItem[] = [
  // === COMPTE ET PROFIL ===
  {
    id: 'account-1',
    question: 'Comment créer un compte Rentoall ?',
    answer: 'Cliquez sur "S\'inscrire" en haut à droite. Remplissez le formulaire avec vos informations. Vous pourrez ensuite réserver des parkings, caves et box ou mettre vos espaces en location.',
    keywords: ['créer', 'compte', 'inscrire', 'inscription']
  },
  {
    id: 'account-2',
    question: 'Comment modifier mon profil ?',
    answer: 'Allez dans "Profil" ou "Paramètres" depuis le menu. Vous pouvez modifier vos informations personnelles, votre photo et vos préférences.',
    keywords: ['profil', 'modifier', 'paramètres', 'informations', 'photo']
  },
  {
    id: 'account-3',
    question: 'Comment supprimer mon compte ?',
    answer: 'Dans Paramètres > Sécurité > Supprimer mon compte. Confirmez en tapant "SUPPRIMER". Cette action est irréversible.',
    keywords: ['supprimer', 'compte', 'suppression', 'désinscription']
  },
  {
    id: 'account-4',
    question: 'Comment changer mon mot de passe ?',
    answer: 'Allez dans Paramètres > Connexion et sécurité. Section "Changer le mot de passe", saisissez l\'ancien mot de passe puis le nouveau.',
    keywords: ['mot', 'passe', 'changer', 'connexion', 'sécurité']
  },
  {
    id: 'account-5',
    question: 'Qu\'est-ce que l\'authentification à deux facteurs (2FA) ?',
    answer: 'La 2FA renforce la sécurité de votre compte en demandant un code en plus du mot de passe. Activez-la dans Paramètres > Connexion et sécurité.',
    keywords: ['2fa', 'authentification', 'deux', 'facteurs', 'sécurité', 'code']
  },
  // === RECHERCHE ===
  {
    id: 'search-1',
    question: 'Comment rechercher un parking ou une cave ?',
    answer: 'Utilisez la barre de recherche sur la page d\'accueil ou dans le header : indiquez la destination (ville), les dates et le type d\'espace (parking, cave, box). Les résultats s\'affichent sur la carte et en liste.',
    keywords: ['rechercher', 'recherche', 'parking', 'cave', 'trouver', 'ville', 'dates', 'destination']
  },
  {
    id: 'search-2',
    question: 'Quels types d\'espaces puis-je louer ?',
    answer: 'Rentoall propose des parkings, des caves et des box de stockage. Vous pouvez filtrer par type, prix, équipements (recharge électrique, accès 24h, etc.).',
    keywords: ['types', 'parking', 'cave', 'box', 'stockage', 'louer', 'espaces']
  },
  {
    id: 'search-3',
    question: 'Comment filtrer les résultats de recherche ?',
    answer: 'Utilisez les filtres avancés (icône sliders) : prix, équipements, réservation instantanée, annulation gratuite. Sur la page recherche, filtrez par type (parking, cave, box).',
    keywords: ['filtre', 'filtrer', 'recherche', 'résultats']
  },
  // === RÉSERVATION ===
  {
    id: 'reserv-1',
    question: 'Comment réserver un espace ?',
    answer: 'Sélectionnez les dates sur la fiche de l\'annonce, puis cliquez sur "Réserver". Vous pouvez envoyer un message au propriétaire avant de confirmer, ou réserver directement si la réservation instantanée est activée.',
    keywords: ['réserver', 'réservation', 'dates', 'annonce']
  },
  {
    id: 'reserv-2',
    question: 'Comment annuler une réservation ?',
    answer: 'Allez dans "Réservations", sélectionnez la réservation et cliquez sur "Annuler". Les conditions d\'annulation (remboursement partiel ou total) dépendent de la politique de l\'annonce.',
    keywords: ['annuler', 'annulation', 'remboursement']
  },
  {
    id: 'reserv-3',
    question: 'Comment voir mes réservations ?',
    answer: 'Cliquez sur "Réservations" dans le menu (ou "Agenda" en mode hôte). Vous y voyez les réservations en cours, passées et à venir.',
    keywords: ['réservations', 'voir', 'mes', 'liste', 'agenda']
  },
  {
    id: 'reserv-4',
    question: 'Qu\'est-ce que la réservation instantanée ?',
    answer: 'La réservation instantanée permet de réserver sans attendre l\'accord du propriétaire. Le bien est confirmé immédiatement après paiement.',
    keywords: ['instantanée', 'instantané', 'immédiat']
  },
  {
    id: 'reserv-5',
    question: 'Puis-je modifier ma réservation ?',
    answer: 'Oui, si le propriétaire accepte. Depuis la fiche de votre réservation, vous pouvez demander une modification de dates. Le propriétaire peut accepter ou refuser.',
    keywords: ['modifier', 'modification', 'changer', 'dates', 'réservation']
  },
  // === HÔTE / PROPRIÉTAIRE ===
  {
    id: 'host-1',
    question: 'Comment mettre mon parking ou ma cave en location ?',
    answer: 'Passez en mode Hôte (menu), puis cliquez sur "Mettre mon espace en ligne". Remplissez le formulaire : photos, description, tarifs, disponibilités. Votre annonce sera publiée après vérification.',
    keywords: ['mettre', 'location', 'hôte', 'propriétaire', 'louer', 'annonce', 'publier']
  },
  {
    id: 'host-2',
    question: 'Comment gérer mes réservations en tant qu\'hôte ?',
    answer: 'Allez dans "Réservations" ou "Agenda". Vous y verrez les demandes en attente, les réservations confirmées et votre calendrier. Vous pouvez accepter ou refuser les demandes.',
    keywords: ['gérer', 'réservations', 'agenda', 'calendrier', 'demandes', 'accepter', 'refuser', 'hôte']
  },
  {
    id: 'host-3',
    question: 'Comment gérer mon calendrier et les disponibilités ?',
    answer: 'Allez dans "Mon calendrier" (mode hôte). Vous pouvez bloquer ou débloquer des dates, définir vos plages horaires et gérer les disponibilités par espace.',
    keywords: ['calendrier', 'disponibilités', 'bloquer', 'plages', 'horaires']
  },
  {
    id: 'host-4',
    question: 'Comment sont versés les paiements aux propriétaires ?',
    answer: 'Les paiements sont sécurisés via Stripe. Le montant est débité à la réservation et versé au propriétaire selon les conditions (généralement après la fin de la location). Configurez Stripe dans Paramètres > Versements.',
    keywords: ['paiement', 'versement', 'argent', 'débité', 'propriétaire', 'stripe']
  },
  {
    id: 'host-5',
    question: 'Comment configurer Stripe pour recevoir mes paiements ?',
    answer: 'Dans Paramètres > Versements, cliquez sur "Configurer Stripe". Complétez l\'onboarding Stripe (informations bancaires, identité) pour activer les versements.',
    keywords: ['stripe', 'configurer', 'versement', 'bancaire', 'rib']
  },
  {
    id: 'host-6',
    question: 'Comment modifier ou supprimer mon annonce ?',
    answer: 'Allez dans "Mes espaces" ou "Mes annonces", sélectionnez l\'annonce. Vous pouvez modifier les détails, les photos, les tarifs ou désactiver l\'annonce.',
    keywords: ['modifier', 'supprimer', 'annonce', 'mes', 'espaces']
  },
  // === PAIEMENTS ===
  {
    id: 'payment-1',
    question: 'Quels moyens de paiement sont acceptés ?',
    answer: 'Rentoall accepte les cartes bancaires (CB, Visa, Mastercard). Les paiements sont sécurisés et encaissés au moment de la réservation.',
    keywords: ['carte', 'paiement', 'cb', 'visa', 'mastercard', 'banque', 'payer']
  },
  {
    id: 'payment-2',
    question: 'Les paiements sont-ils sécurisés ?',
    answer: 'Oui, les paiements passent par Stripe, une plateforme de paiement sécurisée et certifiée. Vos données bancaires ne sont jamais stockées sur Rentoall.',
    keywords: ['sécurisé', 'sécurité', 'stripe']
  },
  {
    id: 'payment-3',
    question: 'Y a-t-il des frais de service ?',
    answer: 'L\'inscription et la recherche sont gratuites. Des frais de service sont prélevés sur les réservations. Les propriétaires peuvent publier leurs annonces gratuitement.',
    keywords: ['frais', 'commission', 'service']
  },
  // === FAVORIS ET MESSAGES ===
  {
    id: 'misc-1',
    question: 'Comment ajouter un espace aux favoris ?',
    answer: 'Sur la fiche d\'un bien ou dans les résultats de recherche, cliquez sur l\'icône cœur pour l\'ajouter à vos favoris. Retrouvez-les dans le menu "Favoris".',
    keywords: ['favoris', 'cœur', 'ajouter', 'sauvegarder']
  },
  {
    id: 'misc-2',
    question: 'Comment contacter un propriétaire ?',
    answer: 'Sur la fiche du bien, cliquez sur "Contacter le propriétaire". Vous pouvez aussi envoyer un message avant de réserver. Les échanges se font dans "Messages".',
    keywords: ['contacter', 'propriétaire', 'message', 'hôte']
  },
  {
    id: 'misc-3',
    question: 'Où sont mes messages ?',
    answer: 'Cliquez sur "Messages" ou "Messagerie" dans le menu. Vous y voyez toutes vos conversations avec les propriétaires et locataires.',
    keywords: ['messages', 'messagerie', 'conversation']
  },
  // === PARRAINAGE ===
  {
    id: 'ref-1',
    question: 'Comment fonctionne le parrainage ?',
    answer: 'Parrainez des amis avec votre code dans Paramètres > Parrainage. Vous gagnez un crédit (ex: 5€) par filleul inscrit. Le crédit est utilisable sur les réservations.',
    keywords: ['parrainage', 'parrainer', 'filleul', 'code', 'crédit']
  },
  {
    id: 'ref-2',
    question: 'Où trouver mon code de parrainage ?',
    answer: 'Allez dans Paramètres > Parrainage. Votre code personnel y est affiché. Partagez-le pour inviter des amis.',
    keywords: ['code', 'parrainage', 'trouver']
  },
  // === NOTIFICATIONS ET CONFIDENTIALITÉ ===
  {
    id: 'tech-1',
    question: 'Comment gérer mes notifications ?',
    answer: 'Dans Paramètres > Notifications, activez ou désactivez les emails (réservations, messages, promotions) et les notifications push.',
    keywords: ['notification', 'paramètres', 'email', 'push']
  },
  {
    id: 'tech-2',
    question: 'Je ne reçois pas les notifications',
    answer: 'Vérifiez les paramètres de notification dans Paramètres > Notifications. Assurez-vous que les emails ne sont pas dans les spams et que les notifications navigateur sont autorisées.',
    keywords: ['notification', 'email', 'reçois', 'reçu', 'spam']
  },
  {
    id: 'tech-3',
    question: 'Comment gérer ma confidentialité ?',
    answer: 'Dans Paramètres > Confidentialité et partage, choisissez ce qui est visible (ville, pays) sur vos avis publics.',
    keywords: ['confidentialité', 'vie', 'privée', 'visible']
  },
  // === TECHNIQUE ===
  {
    id: 'technical-1',
    question: 'Le site ne se charge pas correctement',
    answer: 'Vérifiez votre connexion internet, videz le cache de votre navigateur et essayez en navigation privée. Utilisez un navigateur récent (Chrome, Firefox, Safari, Edge).',
    keywords: ['site', 'charger', 'problème', 'technique', 'connexion', 'cache', 'navigateur']
  },
  {
    id: 'technical-2',
    question: 'Rentoall fonctionne-t-il sur mobile ?',
    answer: 'Oui, Rentoall est responsive et fonctionne sur smartphone et tablette. Une application mobile (Capacitor) est également disponible pour iOS et Android.',
    keywords: ['mobile', 'application', 'app', 'smartphone', 'ios', 'android']
  },
  // === GÉNÉRAL ===
  {
    id: 'general-1',
    question: 'Rentoall est-il gratuit ?',
    answer: 'L\'inscription et la recherche sont gratuites. Des frais de service sont prélevés sur les réservations. Les propriétaires peuvent publier leurs annonces gratuitement.',
    keywords: ['gratuit', 'prix', 'coût', 'frais', 'tarif']
  },
  {
    id: 'general-2',
    question: 'Où trouver les CGU et CGV ?',
    answer: 'Les Conditions Générales d\'Utilisation (CGU) et Conditions Générales de Vente (CGV) sont accessibles en bas de page ou dans les liens légaux (Mentions légales, CGU, CGV).',
    keywords: ['cgu', 'cgv', 'conditions', 'générales', 'légal']
  },
  {
    id: 'general-3',
    question: 'Comment contacter le support ?',
    answer: 'Dans Paramètres > Nous contacter, ou via la page Messages. Vous pouvez aussi consulter la FAQ et le centre d\'aide.',
    keywords: ['support', 'contacter', 'aide', 'contact']
  },
  {
    id: 'general-4',
    question: 'Quelle est la politique d\'annulation ?',
    answer: 'Chaque annonce peut avoir sa propre politique (annulation gratuite jusqu\'à X jours, remboursement partiel...). Consultez la fiche du bien avant de réserver.',
    keywords: ['politique', 'annulation', 'annuler']
  },
  // === ACCUEIL & DASHBOARD ===
  {
    id: 'home-1',
    question: 'Où est la page d\'accueil ?',
    answer: 'Sur desktop, cliquez sur le logo Rentoall pour accéder à l\'accueil. Sur mobile, vous êtes redirigé vers la page de recherche. Le tableau de bord (réservations, favoris) est accessible via le menu.',
    keywords: ['accueil', 'home', 'page', 'accéder']
  },
  {
    id: 'home-2',
    question: 'Comment accéder au tableau de bord ?',
    answer: 'Cliquez sur "Tableau de bord" ou "Dashboard" dans le menu une fois connecté. Vous y verrez vos réservations, vos espaces (mode hôte), vos statistiques et revenus.',
    keywords: ['tableau', 'bord', 'dashboard', 'statistiques', 'revenus']
  },
  {
    id: 'home-3',
    question: 'Qu\'est-ce que le mode hôte et le mode client ?',
    answer: 'Le mode client permet de réserver des espaces. Le mode hôte permet de mettre vos espaces en location et de gérer vos annonces. Basculez entre les deux via le menu en haut.',
    keywords: ['mode', 'hôte', 'client', 'basculer', 'changer']
  },
  // === RECHERCHE AVANCÉE ===
  {
    id: 'search-4',
    question: 'Comment rechercher par destination ?',
    answer: 'Dans le header, cliquez sur le champ "Destination" et tapez une ville ou un lieu. Les résultats s\'affichent avec un rayon de recherche. Vous pouvez aussi rechercher un mot-clé (ex: "parking sécurisé").',
    keywords: ['destination', 'recherche', 'ville', 'lieu', 'header']
  },
  {
    id: 'search-5',
    question: 'Comment fonctionne la recherche par rayon ?',
    answer: 'La recherche utilise un rayon autour de votre destination (par défaut 50 km). Les biens dans ce périmètre sont affichés sur la carte. Ajustez le rayon dans les filtres avancés si disponible.',
    keywords: ['rayon', 'kilomètres', 'carte', 'périmètre', 'proximité']
  },
  {
    id: 'search-6',
    question: 'Où voir la carte des espaces ?',
    answer: 'Sur la page de recherche (search-parkings), les résultats s\'affichent sur une carte et en liste. Vous pouvez cliquer sur un marqueur pour voir les détails d\'un bien.',
    keywords: ['carte', 'map', 'carte', 'résultats', 'marqueur']
  },
  // === TARIFS & PRIX ===
  {
    id: 'price-1',
    question: 'Quels tarifs sont proposés (heure, jour, semaine, mois) ?',
    answer: 'Chaque annonce peut proposer des tarifs à l\'heure, au jour, à la semaine ou au mois. Consultez la fiche du bien pour voir les options disponibles. Filtrez par type de période dans la recherche.',
    keywords: ['tarif', 'prix', 'heure', 'jour', 'semaine', 'mois', 'période']
  },
  {
    id: 'price-2',
    question: 'Comment réserver à l\'heure ?',
    answer: 'Sur la fiche du bien, sélectionnez la période "À l\'heure", choisissez la date et la plage horaire (début, fin). Le prix s\'affiche en fonction de la durée. Cliquez sur "Réserver".',
    keywords: ['horaire', 'heure', 'plage', 'durée', 'réservation']
  },
  {
    id: 'price-3',
    question: 'Puis-je louer un parking pour une journée ?',
    answer: 'Oui, si l\'annonce propose un tarif journalier. Sélectionnez "Au jour" sur la fiche, choisissez vos dates d\'arrivée et de départ, puis réservez.',
    keywords: ['jour', 'journée', 'journalier', 'parking']
  },
  // === CRÉATION D'ANNONCE ===
  {
    id: 'host-7',
    question: 'Comment créer une annonce de parking ?',
    answer: 'Passez en mode Hôte > Mes espaces > Mettre mon espace en ligne. Choisissez le type "Parking", ajoutez des photos, une description, l\'adresse, les tarifs (heure/jour/semaine/mois) et vos disponibilités.',
    keywords: ['créer', 'annonce', 'parking', 'nouvelle', 'publication']
  },
  {
    id: 'host-8',
    question: 'Quelles informations fournir pour une annonce ?',
    answer: 'Photos, description, adresse, type d\'espace (parking/cave/box), tarifs, disponibilités, équipements (recharge, accès 24h), type d\'accès (clé, digicode, etc.). Plus votre annonce est complète, plus elle sera visible.',
    keywords: ['informations', 'annonce', 'détails', 'équipements', 'photos']
  },
  {
    id: 'host-9',
    question: 'Comment devenir hôte sur Rentoall ?',
    answer: 'Créez un compte, passez en mode Hôte via le menu, puis cliquez sur "Mettre mon espace en ligne". Remplissez le formulaire de création d\'annonce. Votre espace sera publié après validation.',
    keywords: ['devenir', 'hôte', 'propriétaire', 'louer', 'inscription']
  },
  // === PAIEMENT DÉTAILLÉ ===
  {
    id: 'payment-4',
    question: 'Quand est-ce que je suis débité ?',
    answer: 'Le paiement est effectué au moment de la confirmation de la réservation, juste après avoir cliqué sur "Réserver" et validé le paiement par carte. Le montant est débité immédiatement.',
    keywords: ['débité', 'prélèvement', 'quand', 'moment', 'paiement']
  },
  {
    id: 'payment-5',
    question: 'Comment obtenir une facture ou un reçu ?',
    answer: 'Après une réservation, un email de confirmation est envoyé avec les détails. Pour une facture, consultez Paramètres > Factures ou contactez le support. Les versements hôtes sont visibles dans Paramètres > Versements.',
    keywords: ['facture', 'reçu', 'justificatif', 'preuve', 'paiement']
  },
  {
    id: 'payment-6',
    question: 'Puis-je payer en plusieurs fois ?',
    answer: 'Rentoall utilise Stripe pour les paiements. Le paiement en une fois est la règle. Pour des options de paiement échelonné, vérifiez les modalités affichées lors de la réservation.',
    keywords: ['plusieurs', 'fois', 'échelonné', 'fractionné', 'paiement']
  },
  // === RÉSERVATION DÉTAILLÉE ===
  {
    id: 'reserv-6',
    question: 'Que signifient les statuts de réservation (PENDING, CONFIRMED...) ?',
    answer: 'PENDING : en attente de paiement ou de validation. CONFIRMED : réservation validée et payée. CANCELLED : annulée. COMPLETED : terminée. Consultez "Réservations" pour le détail de chaque statut.',
    keywords: ['statut', 'pending', 'confirmed', 'cancelled', 'completed', 'réservation']
  },
  {
    id: 'reserv-7',
    question: 'Comment voir le détail d\'une réservation ?',
    answer: 'Allez dans "Réservations", cliquez sur la réservation qui vous intéresse. Vous verrez les dates, l\'adresse, le montant, les coordonnées du propriétaire/locataire et les options (annuler, contacter, modifier).',
    keywords: ['détail', 'réservation', 'voir', 'fiche', 'information']
  },
  {
    id: 'reserv-8',
    question: 'Où trouver l\'adresse exacte après réservation ?',
    answer: 'L\'adresse complète et les instructions d\'accès (code, clé...) sont envoyées par email après confirmation. Vous les retrouvez aussi sur la fiche de votre réservation dans "Réservations".',
    keywords: ['adresse', 'accès', 'code', 'clé', 'localisation', 'après']
  },
  // === FAVORIS ===
  {
    id: 'misc-4',
    question: 'Comment supprimer un favori ?',
    answer: 'Allez dans "Favoris", cliquez sur l\'icône cœur ou sur "Retirer des favoris" sur la carte du bien. Le bien sera retiré de votre liste.',
    keywords: ['supprimer', 'retirer', 'favori', 'favoris', 'cœur']
  },
  {
    id: 'misc-5',
    question: 'Où sont mes favoris ?',
    answer: 'Cliquez sur "Favoris" dans le menu (icône cœur). Vous y verrez tous les espaces que vous avez sauvegardés. Vous pouvez les filtrer et les réserver directement depuis cette page.',
    keywords: ['favoris', 'liste', 'sauvegarder', 'cœur', 'voir']
  },
  // === MESSAGES ===
  {
    id: 'misc-6',
    question: 'Comment envoyer un message à un propriétaire ?',
    answer: 'Sur la fiche du bien, cliquez sur "Contacter le propriétaire" ou "Message". Rédigez votre message et envoyez. La conversation apparaît dans "Messages" / "Messagerie".',
    keywords: ['envoyer', 'message', 'écrire', 'contacter', 'propriétaire']
  },
  {
    id: 'misc-7',
    question: 'Comment répondre à un message ?',
    answer: 'Allez dans "Messages", ouvrez la conversation concernée, tapez votre réponse dans le champ en bas et cliquez sur Envoyer. Vous recevrez une notification à chaque nouveau message.',
    keywords: ['répondre', 'réponse', 'message', 'conversation']
  },
  // === MON CALENDRIER (HÔTE) ===
  {
    id: 'calendar-1',
    question: 'Comment accéder à mon calendrier ?',
    answer: 'En mode hôte, cliquez sur "Mon calendrier" ou "Agenda" dans le menu. Vous y verrez vos disponibilités, les réservations confirmées et vous pourrez bloquer des dates.',
    keywords: ['calendrier', 'agenda', 'disponibilités', 'hôte']
  },
  {
    id: 'calendar-2',
    question: 'Comment bloquer des dates sur mon calendrier ?',
    answer: 'Dans "Mon calendrier" (mode hôte), sélectionnez les dates à bloquer et marquez-les comme indisponibles. Les locataires ne pourront pas réserver ces créneaux.',
    keywords: ['bloquer', 'dates', 'indisponible', 'calendrier']
  },
  // === MES ESPACES ===
  {
    id: 'host-10',
    question: 'Où voir mes annonces ?',
    answer: 'En mode hôte, cliquez sur "Mes espaces" ou "Mes annonces" dans le menu. Vous verrez la liste de tous vos espaces en location avec leur statut (actif, désactivé, en attente).',
    keywords: ['mes', 'annonces', 'espaces', 'liste', 'voir']
  },
  {
    id: 'host-11',
    question: 'Comment désactiver temporairement une annonce ?',
    answer: 'Allez dans "Mes espaces", sélectionnez l\'annonce, puis désactivez-la ou mettez-la en pause. Elle ne sera plus visible dans les résultats de recherche. Vous pouvez la réactiver à tout moment.',
    keywords: ['désactiver', 'pause', 'temporaire', 'annonce', 'masquer']
  },
  // === VERSEMENTS HÔTE ===
  {
    id: 'host-12',
    question: 'Quand suis-je payé en tant qu\'hôte ?',
    answer: 'Les versements sont généralement effectués après la fin de la location. Configurez Stripe dans Paramètres > Versements pour recevoir vos paiements. Les délais dépendent des conditions Stripe.',
    keywords: ['payé', 'versement', 'hôte', 'argent', 'reçu']
  },
  {
    id: 'host-13',
    question: 'Comment voir l\'historique de mes versements ?',
    answer: 'Allez dans Paramètres > Versements (ou Paiements). Vous y verrez l\'historique des versements, les montants et les réservations associées.',
    keywords: ['historique', 'versements', 'paiements', 'hôte', 'voir']
  },
  // === PARAMÈTRES ===
  {
    id: 'param-1',
    question: 'Où sont les paramètres ?',
    answer: 'Cliquez sur l\'icône utilisateur ou "Paramètres" dans le menu. Vous accédez à : Profil, Connexion et sécurité, Notifications, Confidentialité, Nous contacter, Versements (hôte), Parrainage.',
    keywords: ['paramètres', 'réglages', 'settings', 'profil', 'menu']
  },
  {
    id: 'param-2',
    question: 'Comment changer la langue du site ?',
    answer: 'Dans Paramètres, section Langue, sélectionnez Français, English, Español ou Deutsch. Le site s\'adapte immédiatement.',
    keywords: ['langue', 'language', 'changer', 'français', 'english']
  },
  {
    id: 'param-3',
    question: 'Comment modifier mon adresse ou mes coordonnées ?',
    answer: 'Allez dans Paramètres > Profil. Vous pouvez modifier votre adresse, téléphone, email et autres informations personnelles. Cliquez sur Enregistrer après modification.',
    keywords: ['adresse', 'coordonnées', 'téléphone', 'email', 'modifier']
  },
  {
    id: 'param-4',
    question: 'Comment envoyer une demande de contact au support ?',
    answer: 'Dans Paramètres > Nous contacter, remplissez le titre et la description de votre demande, puis envoyez. Vous recevrez une réponse par email ou dans la messagerie.',
    keywords: ['contacter', 'support', 'demande', 'aide', 'formulaire']
  },
  // === AIDE & PAGES LÉGALES ===
  {
    id: 'help-1',
    question: 'Où est le centre d\'aide ?',
    answer: 'Le centre d\'aide est accessible via la page /help ou "Aide" dans le menu. Vous y trouverez des FAQ par catégorie (compte, recherche, réservation, propriétaires, paiements) et des liens vers la FAQ et le support.',
    keywords: ['aide', 'centre', 'help', 'support', 'faq']
  },
  {
    id: 'help-2',
    question: 'Où sont les mentions légales ?',
    answer: 'Les mentions légales sont accessibles en bas de page (footer) ou directement sur /mentions-legales. Elles contiennent les informations sur l\'éditeur, l\'hébergeur et les contacts.',
    keywords: ['mentions', 'légales', 'éditeur', 'hébergeur', 'légal']
  },
  {
    id: 'help-3',
    question: 'Où trouver la page FAQ ?',
    answer: 'La FAQ est accessible via le lien "FAQ" en bas de page ou sur /faq. Vous y trouverez toutes les questions fréquentes classées par thème.',
    keywords: ['faq', 'questions', 'fréquentes', 'réponses']
  },
  // === AUTHENTIFICATION ===
  {
    id: 'auth-1',
    question: 'J\'ai oublié mon mot de passe',
    answer: 'Cliquez sur "Connexion", puis "Mot de passe oublié ?". Entrez votre email et vous recevrez un lien pour réinitialiser votre mot de passe.',
    keywords: ['oublié', 'mot', 'passe', 'password', 'réinitialiser']
  },
  {
    id: 'auth-2',
    question: 'Comment me connecter ?',
    answer: 'Cliquez sur "Connexion" en haut à droite, entrez votre email et mot de passe, puis validez. Vous pouvez aussi vous connecter via Google si cette option est disponible.',
    keywords: ['connexion', 'connecter', 'login', 'se', 'connecter']
  },
  {
    id: 'auth-3',
    question: 'Comment m\'inscrire ?',
    answer: 'Cliquez sur "S\'inscrire" ou "Inscription" en haut à droite. Remplissez le formulaire (nom, prénom, email, mot de passe). Validez l\'inscription et connectez-vous.',
    keywords: ['inscrire', 'inscription', 'signup', 'créer', 'compte']
  },
  // === FICHE BIEN & RÉSERVATION ===
  {
    id: 'bien-1',
    question: 'Comment partager une annonce ?',
    answer: 'Sur la fiche du bien, cliquez sur l\'icône "Partager". Vous pouvez copier le lien, l\'envoyer par email, WhatsApp ou Instagram.',
    keywords: ['partager', 'share', 'lien', 'annonce', 'fiche']
  },
  {
    id: 'bien-2',
    question: 'Comment sont notés les propriétaires ?',
    answer: 'Après une réservation terminée, les locataires peuvent laisser un avis et une note (sur 5). Les notes sont affichées sur la fiche du bien. Les hôtes vérifiés ont un badge "Vérifié".',
    keywords: ['note', 'avis', 'évaluation', 'propriétaire', 'rating']
  },
  {
    id: 'bien-3',
    question: 'Comment signaler une annonce ?',
    answer: 'Sur la fiche du bien, cliquez sur "Signaler" (icône drapeau) si l\'annonce est incorrecte ou abusive. Renseignez la raison. L\'équipe Rentoall examinera le signalement.',
    keywords: ['signaler', 'report', 'abus', 'incorrect', 'problème']
  },
  {
    id: 'bien-4',
    question: 'Qu\'est-ce qu\'une réservation à l\'heure ?',
    answer: 'Certains espaces (parkings) proposent une location à l\'heure. Vous choisissez une date, une heure de début et une heure de fin. Le prix est calculé selon la durée. Idéal pour une courte durée.',
    keywords: ['horaire', 'heure', 'créneau', 'court', 'durée']
  },
  // === PAGE ACCUEIL / HOMEPAGE ===
  {
    id: 'general-5',
    question: 'Qu\'est-ce que Rentoall ?',
    answer: 'Rentoall est une plateforme de location d\'espaces : parkings, caves et box de stockage. Propriétaires et locataires se rencontrent pour louer des espaces inutilisés. Économisez ou gagnez de l\'argent en toute simplicité.',
    keywords: ['rentoall', 'quoi', 'plateforme', 'location', 'espaces']
  },
  {
    id: 'general-6',
    question: 'Comment fonctionne Rentoall ?',
    answer: 'Les propriétaires publient leurs espaces (parking, cave, box). Les locataires recherchent, comparent et réservent. Le paiement est sécurisé. Après réservation, les deux parties communiquent pour organiser l\'accès.',
    keywords: ['fonctionne', 'comment', 'principe', 'usage']
  },
  {
    id: 'general-7',
    question: 'Rentoall est-il fiable ?',
    answer: 'Oui. Les paiements passent par Stripe (sécurisé). Les hôtes peuvent être vérifiés. Les avis des locataires aident à choisir. Une politique d\'annulation protège les deux parties. En cas de litige, le support intervient.',
    keywords: ['fiable', 'sûr', 'sécurité', 'confiance', 'sérieux']
  },
  // === PAGES SPÉCIFIQUES ===
  {
    id: 'page-1',
    question: 'Où est mon calendrier ?',
    answer: 'Cliquez sur "Mon calendrier" dans le menu. Vous y voyez vos réservations à venir (client) et vos disponibilités (hôte). En mode hôte, vous pouvez bloquer ou débloquer des dates.',
    keywords: ['mon', 'calendrier', 'agenda', 'disponibilités', 'bloquer']
  },
  {
    id: 'page-2',
    question: 'Où sont mes espaces ou mes annonces ?',
    answer: 'Cliquez sur "Mes espaces" ou "Mes annonces" dans le menu (mode hôte). Vous y gérez vos annonces : modifier, désactiver, voir les réservations. Pour créer une annonce : "Mettre mon espace en ligne".',
    keywords: ['mes', 'espaces', 'annonces', 'gérer', 'liste']
  },
  {
    id: 'page-3',
    question: 'Où est la politique de confidentialité ?',
    answer: 'La politique de confidentialité est accessible via le lien en bas de page ou sur /privacy. Elle explique comment Rentoall utilise vos données personnelles.',
    keywords: ['confidentialité', 'privacy', 'données', 'vie', 'privée', 'politique']
  },
  {
    id: 'page-4',
    question: 'Mon paiement a échoué ou a été annulé',
    answer: 'Si le paiement a échoué, vérifiez vos informations bancaires et réessayez. Si le paiement a été annulé (page payment/cancel), aucune somme n\'a été débitée. Retournez sur la fiche du bien pour réserver à nouveau. En cas de problème persistant, contactez le support.',
    keywords: ['paiement', 'échoué', 'annulé', 'refusé', 'erreur', 'carte']
  },
  {
    id: 'page-5',
    question: 'Où voir la confirmation de ma réservation ?',
    answer: 'Après réservation, une page de confirmation s\'affiche. Vous recevez aussi un email. Retrouvez toutes vos réservations dans le menu "Réservations". Cliquez sur une réservation pour voir les détails.',
    keywords: ['confirmation', 'réservation', 'reçu', 'email', 'détails']
  },
  {
    id: 'page-6',
    question: 'Comment choisir entre client et hôte ?',
    answer: 'Lors de l\'inscription ou dans Paramètres, vous pouvez indiquer si vous souhaitez réserver (client) ou louer (hôte). Vous pouvez faire les deux : basculez entre les modes via le menu. Le mode client sert à réserver, le mode hôte à gérer vos annonces.',
    keywords: ['choisir', 'client', 'hôte', 'mode', 'compte', 'type']
  },
  {
    id: 'page-7',
    question: 'Où sont les CGU ?',
    answer: 'Les Conditions Générales d\'Utilisation (CGU) sont accessibles en bas de page ou sur /cgu. Elles définissent les règles d\'utilisation de la plateforme.',
    keywords: ['cgu', 'conditions', 'utilisation', 'générales']
  },
  {
    id: 'page-8',
    question: 'Où sont les CGV ?',
    answer: 'Les Conditions Générales de Vente (CGV) sont accessibles en bas de page ou sur /cgv. Elles définissent les conditions de vente et de réservation.',
    keywords: ['cgv', 'conditions', 'vente', 'générales']
  }
];

// Questions suggérées : les plus pertinentes pour convertir et rassurer (ordre stratégique)
export const SUGGESTED_QUESTIONS = [
  'Comment réserver un espace ?',
  'Rentoall est-il gratuit ?',
  'Comment mettre mon espace en location ?',
  'Les paiements sont-ils sécurisés ?',
  'Comment annuler une réservation ?',
  'Quels types d\'espaces puis-je louer ?',
  'Comment contacter le support ?',
];
