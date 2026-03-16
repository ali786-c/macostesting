import { render, screen } from '@testing-library/react'
import SecurityPage from '../page'

describe('Security Page', () => {
  it('renders security title', () => {
    render(<SecurityPage />)
    expect(screen.getByText('Sécurité et Protection')).toBeInTheDocument()
  })

  it('renders security section', () => {
    render(<SecurityPage />)
    expect(screen.getByText(/Notre engagement sécurité/)).toBeInTheDocument()
  })
})
