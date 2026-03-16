'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { handleCapacitorLinkClick } from '@/lib/capacitor';
import { Car, Warehouse, Archive, Euro, Shield, Users, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function HostPage() {
  const router = useRouter();
  const benefits = [
    {
      icon: <Euro className="w-8 h-8 text-[#43a047]" />,
      title: "Revenus supplémentaires",
      description: "Gagnez de l'argent facilement en louant votre espace inutilisé"
    },
    {
      icon: <Shield className="w-8 h-8 text-[#43a047]" />,
      title: "Protection totale",
      description: "Assurance complète et protection contre les dommages incluse"
    },
    {
      icon: <Users className="w-8 h-8 text-[#43a047]" />,
      title: "Communauté de confiance",
      description: "Tous les locataires sont vérifiés et évalués"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-[#43a047]" />,
      title: "Gestion simplifiée",
      description: "Tableau de bord intuitif pour gérer vos locations"
    }
  ];

  const spaceTypes = [
    {
      icon: <Car className="w-12 h-12" />,
      title: "Parking",
      description: "Place de parking, garage, allée",
      price: "À partir de 50€/mois"
    },
    {
      icon: <Warehouse className="w-12 h-12" />,
      title: "Box de stockage",
      description: "Garage, box fermé, local",
      price: "À partir de 80€/mois"
    },
    {
      icon: <Archive className="w-12 h-12" />,
      title: "Cave",
      description: "Cave, sous-sol, cellier",
      price: "À partir de 40€/mois"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Créez votre annonce",
      description: "Décrivez votre espace, ajoutez des photos et fixez votre prix"
    },
    {
      number: "2",
      title: "Accueillez vos premiers locataires",
      description: "Validez les réservations et communiquez avec les locataires"
    },
    {
      number: "3",
      title: "Recevez vos paiements",
      description: "Les paiements sont sécurisés et automatiques chaque mois"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pb-mobile-footer md:pb-0">
      {/* Hero Section */}
      <section className="relative h-[60vh] sm:h-[70vh] min-h-[400px] sm:min-h-[500px] bg-gradient-to-br from-[#43a047] to-[#2e7d32] text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Transformez votre espace en revenus
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-white/90">
              Louez votre parking, box de stockage ou cave et gagnez jusqu&apos;à 1200€ par an
            </p>
            <Link 
              href="/host/create"
              prefetch={false}
              onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)}
              className="inline-block bg-white text-[#43a047] px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base md:text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
            >
              Créer mon annonce gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 text-[#222222]">
            Pourquoi louer sur Rentoall ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 sm:mb-4">{benefit.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#222222]">{benefit.title}</h3>
                <p className="text-sm sm:text-base text-[#717171]">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Space Types Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4 text-[#222222]">
            Quel type d&apos;espace louez-vous ?
          </h2>
          <p className="text-center text-[#717171] text-sm sm:text-base md:text-lg mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto px-4">
            Tous les types d&apos;espaces sont les bienvenus sur Rentoall
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {spaceTypes.map((type, index) => (
              <div key={index} className="border-2 border-[#DDDDDD] rounded-xl p-5 sm:p-6 md:p-8 hover:border-[#43a047] transition-colors cursor-pointer group">
                <div className="text-[#43a047] mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  {type.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 text-[#222222]">{type.title}</h3>
                <p className="text-sm sm:text-base text-[#717171] mb-3 sm:mb-4">{type.description}</p>
                <p className="text-sm sm:text-base text-[#43a047] font-semibold">{type.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 text-[#222222]">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#43a047] text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#222222]">{step.title}</h3>
                    <p className="text-sm sm:text-base text-[#717171]">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 sm:top-8 left-[calc(100%+1rem)] w-[calc(100%-5rem)] h-0.5 bg-[#DDDDDD]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16 text-[#222222]">
            Ils nous font confiance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                name: "Marie L.",
                location: "Paris",
                text: "Je loue mon garage depuis 6 mois et je gagne 100€/mois. C'est simple et sans contraintes !",
                rating: 5
              },
              {
                name: "Thomas B.",
                location: "Lyon",
                text: "Excellente plateforme ! J'ai loué 3 places de parking et les locataires sont sérieux.",
                rating: 5
              },
              {
                name: "Sophie M.",
                location: "Marseille",
                text: "Ma cave était inutilisée, maintenant elle me rapporte 60€/mois. Je recommande !",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-sm border border-[#DDDDDD]">
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <CheckCircle2 key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-[#43a047] fill-[#43a047]" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-[#222222] mb-3 sm:mb-4 italic">&quot;{testimonial.text}&quot;</p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#43a047] to-[#2e7d32] rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-[#222222]">{testimonial.name}</p>
                    <p className="text-xs sm:text-sm text-[#717171]">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-[#43a047] to-[#2e7d32] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 lg:px-20 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-white/90">
            Créez votre annonce gratuitement en quelques minutes
          </p>
          <Link 
            href="/host/create"
            prefetch={false}
            onClick={(e) => handleCapacitorLinkClick(e, '/host/create', router)}
            className="inline-block bg-white text-[#43a047] px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base md:text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
          >
            Créer mon annonce
          </Link>
        </div>
      </section>
    </div>
  );
}
