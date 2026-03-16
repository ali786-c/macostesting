// Mock uuid before importing conversations (which uses it)
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}))

// Mock the chatAPI
jest.mock('@/services/api', () => ({
  chatAPI: {
    sendMessage: jest.fn(),
  },
}))

import {
  navigateToConversation,
  createConversation,
  createConversationAndNavigate,
} from '../conversations'
import { chatAPI } from '@/services/api'

describe('conversations utils', () => {
  const mockRouter = { push: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('navigateToConversation', () => {
    it('should push to messages with conversationId', () => {
      navigateToConversation(mockRouter, 'conv-123')
      expect(mockRouter.push).toHaveBeenCalledWith('/messages?conversationId=conv-123')
    })
  })

  describe('createConversation', () => {
    it('should call chatAPI.sendMessage with correct params', async () => {
      const mockMessage = {
        id: 1,
        content: 'Bonjour',
        conversationId: 'conv-1',
        senderId: '1',
        recipientId: '2',
      }
      ;(chatAPI.sendMessage as jest.Mock).mockResolvedValue(mockMessage)

      const result = await createConversation('1', '2', 'Bonjour')

      expect(chatAPI.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: '1',
          recipientId: '2',
          content: 'Bonjour',
        })
      )
      expect(result).toEqual(mockMessage)
    })

    it('should use default message when not provided', async () => {
      ;(chatAPI.sendMessage as jest.Mock).mockResolvedValue({})

      await createConversation('1', '2')

      expect(chatAPI.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Bonjour' })
      )
    })

    it('should throw when API fails', async () => {
      ;(chatAPI.sendMessage as jest.Mock).mockRejectedValue(new Error('API Error'))

      await expect(createConversation('1', '2')).rejects.toThrow('API Error')
    })
  })

  describe('createConversationAndNavigate', () => {
    it('should navigate to conversation when conversationId is returned', async () => {
      const mockMessage = {
        id: 1,
        content: 'Bonjour',
        conversationId: 'conv-123',
        senderId: '1',
        recipientId: '2',
      }
      ;(chatAPI.sendMessage as jest.Mock).mockResolvedValue(mockMessage)

      await createConversationAndNavigate(mockRouter, '1', '2', 'Bonjour')

      expect(mockRouter.push).toHaveBeenCalledWith('/messages?conversationId=conv-123')
    })

    it('should navigate with chatRoomId when conversationId is missing', async () => {
      const mockMessage = {
        id: 1,
        content: 'Bonjour',
        senderId: '1',
        recipientId: '2',
      }
      ;(chatAPI.sendMessage as jest.Mock).mockResolvedValue(mockMessage)

      await createConversationAndNavigate(mockRouter, '2', '1', 'Hello')

      expect(mockRouter.push).toHaveBeenCalledWith('/messages?conversationId=1_2')
    })

    it('should navigate to /messages on error', async () => {
      ;(chatAPI.sendMessage as jest.Mock).mockRejectedValue(new Error('Failed'))

      await createConversationAndNavigate(mockRouter, '1', '2')

      expect(mockRouter.push).toHaveBeenCalledWith('/messages')
    })
  })
})
