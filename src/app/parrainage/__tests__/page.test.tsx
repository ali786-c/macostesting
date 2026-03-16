import { render, waitFor } from '@testing-library/react'
import ParrainagePage from '../page'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

describe('Parrainage Page', () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  it('redirects to host referrals', async () => {
    render(<ParrainagePage />)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/host/referrals')
    })
  })
})
