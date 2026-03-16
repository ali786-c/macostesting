import { http, HttpResponse } from 'msw'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/signup`, async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'existing@test.com') {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      id: 1,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      token: 'mock-jwt-token',
    })
  }),

  // Register endpoint (authAPI.signup utilise /users/register)
  http.post(`${API_BASE_URL}/users/register`, async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'existing@test.com') {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      id: 1,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      token: 'mock-jwt-token',
    })
  }),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'wrong@test.com') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    return HttpResponse.json({
      id: 1,
      email: body.email,
      token: 'mock-jwt-token',
    })
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  // Places endpoints
  http.get(`${API_BASE_URL}/places`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Parking',
        address: '123 Test St',
        city: 'Paris',
        pricePerHour: 2,
        pricePerDay: 10,
        ownerId: 1,
      },
    ])
  }),

  http.get(`${API_BASE_URL}/places/search`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Parking',
        address: '123 Test St',
        city: 'Paris',
        pricePerDay: 10,
        ownerId: 1,
        type: 'PARKING',
      },
    ])
  }),

  // Recherche optimisée (POST) — même réponse que GET pour compatibilité
  http.post(`${API_BASE_URL}/places/search`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Parking',
        address: '123 Test St',
        city: 'Paris',
        pricePerDay: 10,
        ownerId: 1,
        type: 'PARKING',
      },
    ])
  }),

  http.get('*/api/places/filters', () => {
    return HttpResponse.json({
      placeTypes: ['PARKING', 'CAVE', 'STORAGE_SPACE'],
      characteristics: {},
      booleanFilters: ['instantBooking', 'freeCancellation'],
      cities: ['Paris', 'Lyon'],
    })
  }),

  http.get(`${API_BASE_URL}/places/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id: Number(id),
      title: 'Test Parking',
      address: '123 Test St',
      city: 'Paris',
      pricePerHour: 2,
      pricePerDay: 10,
      ownerId: 1,
      minHours: 1,
      minDays: 1,
    })
  }),

  // Reservations endpoints
  http.post('*/reservations', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 1,
      placeId: body.placeId,
      clientId: body.clientId,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      status: 'PENDING',
      totalPrice: 20,
    })
  }),

  http.get('*/reservations/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id: Number(id),
      placeId: 1,
      userId: 1,
      startDateTime: '2024-01-01T10:00:00Z',
      endDateTime: '2024-01-01T12:00:00Z',
      status: 'CONFIRMED',
      totalPrice: 20,
    })
  }),

  // Payments endpoints
  http.post(`${API_BASE_URL}/payments/create-payment-intent`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      clientSecret: 'pi_test_1234567890_secret',
      amount: body.amount,
    })
  }),

  // Messages endpoints
  http.get(`${API_BASE_URL}/messages/unread-count/:userId`, ({ params }) => {
    return HttpResponse.json(Number(params.userId) === 1 ? 3 : 0)
  }),

  // Favoris (Rentoall)
  http.get('*/api/users/:userId/favorites', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Parking',
        address: '123 Test St',
        city: 'Paris',
        pricePerDay: 10,
        ownerId: 1,
      },
    ])
  }),

  // Owner endpoints
  http.get(`${API_BASE_URL}/owners/me`, () => {
    return HttpResponse.json({
      id: 1,
      userId: 1,
      stripeAccountId: null,
      onboardingStatus: 'NOT_STARTED',
    })
  }),

  http.post(`${API_BASE_URL}/owners/onboard`, () => {
    return HttpResponse.json({
      url: 'https://connect.stripe.com/setup/test',
    })
  }),

  // Error simulation endpoints
  http.get(`${API_BASE_URL}/error/500`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }),

  http.get(`${API_BASE_URL}/error/401`, () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }),

  http.get(`${API_BASE_URL}/error/403`, () => {
    return HttpResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }),
]
