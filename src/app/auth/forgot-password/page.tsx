'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import HeaderNavigation from '@/components/sections/header-navigation';
import FooterNavigation from '@/components/sections/footer-navigation';
import { rentoallUsersAPI } from '@/services/api';

export default function ForgotPassword() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('L\'adresse email est requise');
      return;
    }

    if (!validateEmail(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await rentoallUsersAPI.forgotPassword(email);
      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: unknown) {
      setIsLoading(false);
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      setError(
        errorObj.response?.data?.message || 
        errorObj.message || 
        'Une erreur est survenue. Veuillez réessayer.'
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
        <HeaderNavigation />
        
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-16 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-lg border border-[#DDDDDD] p-6 sm:p-8 text-center">
              <div className="flex justify-center mb-6">
                <Image src="/logoren.png" alt="Rentoall" width={140} height={42} className="h-10 w-auto" priority />
              </div>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-[#222222] mb-4">
                Email envoyé !
              </h1>
              <p className="text-sm text-[#717171] mb-6">
                Nous avons envoyé un lien de réinitialisation à <strong className="text-[#222222]">{email}</strong>
              </p>
              <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-100">
                <p className="text-xs text-emerald-800">
                  💡 Vérifiez votre boîte de réception et vos spams si vous ne recevez pas l'email dans quelques minutes.
                </p>
              </div>
              <button 
                onClick={() => router.push('/auth/login')}
                className="w-full bg-[#2d8659] hover:bg-[#1f3a0f] text-white py-3 px-4 rounded-lg transition-colors duration-200 text-sm font-medium cursor-pointer"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
        
        <FooterNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <HeaderNavigation />
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-16 pb-20 md:pb-16 mobile-page-main overflow-x-hidden" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-[#DDDDDD] p-6 sm:p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image src="/logoren.png" alt="Rentoall" width={140} height={42} className="h-10 w-auto" priority />
            </div>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] mb-2">
                Mot de passe oublié ?
              </h1>
              <p className="text-sm text-[#717171]">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#222222] mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 ${
                    error 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-[#DDDDDD] focus:border-[#2d8659]'
                  }`}
                  placeholder="votre@email.com"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2d8659] hover:bg-[#1f3a0f] text-white py-3 px-4 rounded-lg disabled:bg-[#2d8659]/50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </div>
                ) : (
                  'Envoyer le lien de réinitialisation'
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center pt-4 border-t border-[#DDDDDD]">
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="flex items-center justify-center text-[#717171] hover:text-[#2d8659] transition-colors duration-200 text-sm font-medium mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <FooterNavigation />
    </div>
  );
}
