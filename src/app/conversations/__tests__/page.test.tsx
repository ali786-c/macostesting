import { render, waitFor } from '@testing-library/react'
import ConversationsRedirect from '../page'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('Conversations Page (redirect)', () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  it('renders without crashing', () => {
    const { container } = render(<ConversationsRedirect />)
    expect(container).toBeInTheDocument()
  })

  it('redirects to messages', async () => {
    render(<ConversationsRedirect />)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/messages')
    })
  })
})
