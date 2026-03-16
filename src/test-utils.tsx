/**
 * Utilitaires partagés pour les tests de pages et composants.
 */
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SearchProvider } from '@/contexts/SearchContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'

/** Wrapper avec tous les providers nécessaires aux pages */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SearchProvider>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
      </SearchProvider>
    </LanguageProvider>
  )
}

/** Render personnalisé avec providers */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: AllProviders,
    ...options,
  })
}
