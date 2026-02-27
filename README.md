# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Booking frontend

The customer booking landing page is at `/` and submits to `/api/bookings`.

### Backend link

1. Copy `.env.example` to `.env.local`.
2. Set `BOOKING_BACKEND_URL` to your backend booking endpoint.
3. Optionally set `BOOKING_BACKEND_API_KEY` if your backend requires bearer auth.

The API route validates input, enforces basic anti-abuse checks, computes totals server-side, and forwards clean payloads to your backend.
