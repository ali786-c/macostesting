'use client';

import React from 'react';
import { Star, Quote } from 'lucide-react';

export default function TrustSection() {
  const testimonials = [
    {
      name: 'Marie L.',
      city: 'Paris',
      rating: 5,
      text: 'Service impeccable, j\'ai trouvé mon parking en 5 minutes !',
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    {
      name: 'Thomas M.',
      city: 'Lyon',
      rating: 5,
      text: 'Très pratique et sécurisé. Je recommande vivement.',
      avatar: 'https://i.pravatar.cc/150?img=2'
    },
    {
      name: 'Sophie D.',
      city: 'Marseille',
      rating: 5,
      text: 'Prix transparents et réservation simple. Parfait !',
      avatar: 'https://i.pravatar.cc/150?img=3'
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            Ils nous ont fait confiance
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Plus de 10 000 utilisateurs satisfaits nous font confiance chaque jour
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <Quote className="w-8 h-8 text-emerald-600 mb-3 opacity-50" />
              <p className="text-slate-700 mb-4 italic">
                &quot;{testimonial.text}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}





