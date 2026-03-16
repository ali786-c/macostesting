import { render, screen } from '@testing-library/react'
import PrivacyPage from '../page'

describe('Privacy Page', () => {
  it('renders privacy policy title', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('Politique de Confidentialité')).toBeInTheDocument()
  })

  it('renders protection subtitle', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Protection et traitement de vos données personnelles/)).toBeInTheDocument()
  })
})
