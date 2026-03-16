'use client';
import { isCapacitor, capacitorNavigate } from '@/lib/capacitor';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useLanguage } from '../../../contexts/LanguageContext';
import { rentoallUsersAPI } from '@/services/api';

function ResetPasswordContent() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.password) {
      newErrors.password = t('resetPassword.errors.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('resetPassword.errors.passwordTooShort');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.errors.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!token) {
      setErrors({ token: 'Token manquant' });
      return;
    }

    setIsLoading(true);
    
    try {
      await rentoallUsersAPI.resetPassword({
        token,
        newPassword: formData.password,
      });
      
      setIsLoading(false);
      setIsSuccess(true);
      
      // Redirection vers la page de connexion après 3 secondes
      setTimeout(() => {
        if (isCapacitor()) { capacitorNavigate('/auth/login'); } else { router.push('/auth/login'); }
      }, 3000);
    } catch (err: unknown) {
      setIsLoading(false);
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      setErrors({
        password: errorObj.response?.data?.message || 
                 errorObj.message || 
                 'Une erreur est survenue. Veuillez réessayer.'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-mobile-footer md:pb-0">
        <Header />
        <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-6">
              <Image src="/logoren.png" alt="Rentoall" width={140} height={42} className="h-10 w-auto" priority />
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('resetPassword.invalidToken.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {t('resetPassword.invalidToken.description')}
            </p>
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full bg-orange-500 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors duration-200 text-sm sm:text-base font-medium cursor-pointer"
            >
              {t('resetPassword.invalidToken.requestNew')}
            </button>
          </div>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-mobile-footer md:pb-0">
        <Header />
        <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-6">
              <Image src="/logoren.png" alt="Rentoall" width={140} height={42} className="h-10 w-auto" priority />
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('resetPassword.success.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {t('resetPassword.success.description')}
            </p>
            <div className="text-xs sm:text-sm text-gray-500">
              {t('resetPassword.success.redirect')}
            </div>
          </div>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-mobile-footer md:pb-0">
      <Header />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image src="/logoren.png" alt="Rentoall" width={140} height={42} className="h-10 w-auto" priority />
          </div>
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('resetPassword.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {t('resetPassword.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('resetPassword.newPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder={t('resetPassword.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t('resetPassword.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-300 ${
                    errors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-orange-500'
                  }`}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                {t('resetPassword.requirements.title')}
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  {t('resetPassword.requirements.minLength')}
                </li>
                <li className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${formData.password === formData.confirmPassword && formData.password ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  {t('resetPassword.requirements.match')}
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-all duration-300 font-medium hover:scale-105 hover:shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('resetPassword.resetting')}
                </div>
              ) : (
                t('resetPassword.resetButton')
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="flex items-center justify-center text-gray-600 hover:text-orange-600 transition-colors duration-200 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('resetPassword.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
