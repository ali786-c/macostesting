'use client';

import { Users, ArrowLeft, Building, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LegalPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Mentions Légales</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-6 h-6 mr-3 text-orange-600" />
                Informations sur l&apos;entreprise
              </h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Raison sociale</h3>
                    <p className="text-gray-700">InfluConnect SAS</p>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-4">Forme juridique</h3>
                    <p className="text-gray-700">Société par Actions Simplifiée (SAS)</p>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-4">Capital social</h3>
                    <p className="text-gray-700">50 000 €</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">SIRET</h3>
                    <p className="text-gray-700">123 456 789 00012</p>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-4">RCS</h3>
                    <p className="text-gray-700">Paris B 123 456 789</p>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-4">Code APE</h3>
                    <p className="text-gray-700">6201Z - Programmation informatique</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-6 h-6 mr-3 text-orange-600" />
                Siège social
              </h2>
              <div className="bg-orange-50 p-6 rounded-xl">
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-orange-600 mt-1" />
                  <div>
                    <p className="text-gray-800 font-medium">123 Avenue des Champs-Élysées</p>
                    <p className="text-gray-700">75008 Paris</p>
                    <p className="text-gray-700">France</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="w-6 h-6 mr-3 text-orange-600" />
                Contact
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Téléphone
                  </h3>
                  <p className="text-blue-700">+33 1 23 45 67 89</p>
                  <p className="text-blue-600 text-sm mt-1">Du lundi au vendredi, 9h-18h</p>
                </div>
                <div className="bg-green-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Email
                  </h3>
                  <p className="text-green-700">contact@influconnect.com</p>
                  <p className="text-green-600 text-sm mt-1">Réponse sous 24h</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="w-6 h-6 mr-3 text-orange-600" />
                Hébergement
              </h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700 mb-4">
                  Le site web InfluConnect est hébergé par :
                </p>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold text-gray-800 mb-2">Vercel Inc.</h3>
                  <p className="text-gray-700 text-sm">340 S Lemon Ave #4133</p>
                  <p className="text-gray-700 text-sm">Walnut, CA 91789, États-Unis</p>
                  <p className="text-gray-700 text-sm">Site web : <a href="https://vercel.com" className="text-orange-600 hover:text-orange-700">vercel.com</a></p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Directeur de publication</h2>
              <div className="bg-yellow-50 p-6 rounded-xl">
                <p className="text-gray-700">
                  <strong>Nom :</strong> Jean Dupont<br />
                  <strong>Fonction :</strong> Président de InfluConnect SAS<br />
                  <strong>Email :</strong> jean.dupont@influconnect.com
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Propriété intellectuelle</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                L&apos;ensemble de ce site relève de la législation française et internationale sur le droit d&apos;auteur 
                et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour 
                les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
              <p className="text-gray-700 leading-relaxed">
                La reproduction de tout ou partie de ce site sur un support électronique quel qu&apos;il soit est 
                formellement interdite sauf autorisation expresse du directeur de la publication.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation de responsabilité</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Les informations contenues sur ce site sont aussi précises que possible et le site remis à jour 
                à différentes périodes de l&apos;année, mais peut toutefois contenir des inexactitudes ou des omissions.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Si vous constatez une lacune, erreur ou ce qui parait être un dysfonctionnement, merci de bien 
                vouloir le signaler par email, à l&apos;adresse contact@influconnect.com, en décrivant le problème 
                de la manière la plus précise possible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Liens hypertextes</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Des liens hypertextes peuvent être présents sur le site. L&apos;utilisateur est informé qu&apos;en 
                cliquant sur ces liens, il sortira du site influconnect.com. Ce dernier n&apos;a pas de contrôle 
                sur les pages web sur lesquelles aboutissent ces liens et ne saurait en aucun cas être 
                responsable de leur contenu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Le site influconnect.com peut être amené à vous demander l&apos;acceptation des cookies pour des 
                besoins de statistiques et d&apos;affichage. Un cookie est une information déposée sur votre 
                disque dur par le serveur du site que vous visitez.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Il contient plusieurs données qui sont stockées sur votre ordinateur dans un simple fichier 
                texte auquel un serveur accède pour lire et enregistrer des informations. Certaines parties 
                de ce site ne peuvent être fonctionnelles sans l&apos;acceptation de cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Droit applicable</h2>
              <div className="bg-red-50 p-6 rounded-xl">
                <p className="text-red-800 font-medium mb-2">Loi applicable</p>
                <p className="text-red-700">
                  Tout litige en relation avec l&apos;utilisation du site influconnect.com est soumis au droit français. 
                  Il est fait attribution exclusive de juridiction aux tribunaux compétents de Paris.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Évolution des mentions légales</h2>
              <p className="text-gray-700 leading-relaxed">
                InfluConnect se réserve le droit de modifier les présentes mentions légales à tout moment. 
                L&apos;utilisateur s&apos;engage donc à les consulter de manière régulière.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact pour les mentions légales</h2>
              <div className="bg-gray-50 p-6 rounded-xl">
                <p className="text-gray-700">
                  Pour toute question concernant ces mentions légales, vous pouvez nous contacter :
                </p>
                <ul className="text-gray-700 mt-3 space-y-1">
                  <li>• Par email : legal@influconnect.com</li>
                  <li>• Par courrier : InfluConnect SAS, 123 Avenue des Champs-Élysées, 75008 Paris</li>
                  <li>• Par téléphone : +33 1 23 45 67 89</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
