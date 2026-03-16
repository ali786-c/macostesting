/**
 * Tests unitaires pour les services API
 */
import { http, HttpResponse } from 'msw'
import { server } from '@/__mocks__/server'
import { reservationsAPI, placesAPI, messagesAPI, rentoallFavoritesAPI } from '../api'

describe('API Services', () => {
  describe('reservationsAPI', () => {
    it.skip('should create a reservation successfully', async () => {
      const reservationData = {
        placeId: 1,
        clientId: 1,
        startDateTime: '2024-01-01T10:00:00Z',
        endDateTime: '2024-01-01T12:00:00Z',
      }

      const result = await reservationsAPI.create(reservationData)

      expect(result).toHaveProperty('id')
      expect(result.placeId).toBe(1)
      expect(result.status).toBe('PENDING')
    })

    it.skip('should handle API errors', async () => {
      server.use(
        http.post('*/api/reservations', () => {
          return HttpResponse.json(
            { error: 'Place not available' },
            { status: 400 }
          )
        })
      )

      await expect(
        reservationsAPI.create({
          placeId: 999,
          clientId: 1,
          startDateTime: '2024-01-01T10:00:00Z',
          endDateTime: '2024-01-01T12:00:00Z',
        })
      ).rejects.toThrow()
    })
  })

  describe('placesAPI', () => {
    it.skip('should fetch places successfully', async () => {
      const places = await placesAPI.getAll()
      
      expect(Array.isArray(places)).toBe(true)
      expect(places.length).toBeGreaterThan(0)
      expect(places[0]).toHaveProperty('id')
      expect(places[0]).toHaveProperty('title')
    })

    it.skip('should fetch a single place by id', async () => {
      const place = await placesAPI.getById(1)
      
      expect(place).toHaveProperty('id', 1)
      expect(place).toHaveProperty('title')
      expect(place).toHaveProperty('address')
    })

    it.skip('should handle 404 errors', async () => {
      server.use(
        http.get('*/api/places/999', () => {
          return HttpResponse.json(
            { error: 'Place not found' },
            { status: 404 }
          )
        })
      )

      await expect(placesAPI.getById(999)).rejects.toThrow()
    })

    it.skip('should search places with params', async () => {
      const places = await placesAPI.search({ city: 'Paris', type: 'PARKING' })
      expect(Array.isArray(places)).toBe(true)
      if (places.length > 0) {
        expect(places[0]).toHaveProperty('id')
        expect(places[0]).toHaveProperty('city')
      }
    })

    it.skip('should fetch available filters', async () => {
      const filters = await placesAPI.getAvailableFilters()
      expect(filters).toHaveProperty('placeTypes')
      expect(filters).toHaveProperty('cities')
      expect(Array.isArray(filters.placeTypes)).toBe(true)
    })
  })

  describe('messagesAPI', () => {
    it.skip('should fetch unread count for user', async () => {
      const count = await messagesAPI.getUnreadCount(1)
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('rentoallFavoritesAPI', () => {
    it.skip('should fetch favorites for user', async () => {
      const favorites = await rentoallFavoritesAPI.getFavorites(1)
      expect(Array.isArray(favorites)).toBe(true)
      if (favorites.length > 0) {
        expect(favorites[0]).toHaveProperty('id')
        expect(favorites[0]).toHaveProperty('title')
      }
    })
  })
})
