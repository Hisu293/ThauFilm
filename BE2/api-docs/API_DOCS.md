# FilmTicket API Documentation

## Base URL

```
http://localhost:8080/api
```

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Auth Response (Login/Register)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "type": "Bearer",
    "userId": "uuid",
    "email": "user@gmail.com",
    "fullName": "John Doe",
    "role": "MEMBER",
    "provider": "LOCAL",
    "avatarUrl": "https://..."
  }
}
```

---

## Public Endpoints

### Auth

#### 1. Register

```
POST /auth/register
```

**Request Body:**

```json
{
  "email": "user@gmail.com",
  "password": "123456",
  "fullName": "John Doe",
  "phone": "0912345678"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Must be a valid gmail.com address |
| password | string | Yes | At least 6 characters |
| fullName | string | No | - |
| phone | string | No | Exactly 10 digits |

---

#### 2. Login

```
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@gmail.com",
  "password": "123456"
}
```

---

#### 3. Google Login

```
POST /auth/google
```

**Request Body:**

```json
{
  "idToken": "google_id_token_here"
}
```

---

#### 4. Refresh Token

```
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

#### 5. Logout

```
POST /auth/logout
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

### Movies

#### 6. List all active movies

```
GET /movies
```

**Response:**

```json
{
  "success": true,
  "message": "Movies fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Movie Title",
      "description": "...",
      "durationMinutes": 120,
      "rating": 8.5,
      "active": true,
      "posterUrl": "https://...",
      "director": "Director Name",
      "actors": "Actor 1, Actor 2",
      "genre": "Action",
      "releaseDate": "2026-06-01",
      "language": "Vietnamese",
      "rated": "PG-13",
      "status": "NOW_SHOWING"
    }
  ]
}
```

---

#### 7. List now showing movies

```
GET /movies/now-showing
```

**Response:** Returns array of `MovieCardResponse` (lightweight version):

```json
[
  {
    "id": "uuid",
    "title": "Movie Title",
    "posterUrl": "https://...",
    "status": "NOW_SHOWING"
  }
]
```

---

#### 8. List coming soon movies

```
GET /movies/coming-soon
```

**Response:** Same structure as now-showing with status `COMING_SOON`.

---

#### 9. Get movie detail

```
GET /movies/{movieId}
```

**Response:** Full `MovieResponse` object.

---

#### 10. Get cinemas showing a movie

```
GET /movies/{movieId}/cinemas
```

**Response:**

```json
{
  "success": true,
  "message": "Cinemas for movie fetched",
  "data": [
    {
      "id": "uuid",
      "name": "Room 1",
      "capacity": 100,
      "status": 1
    }
  ]
}
```

---

#### 11. Get show dates for a movie

```
GET /movies/{movieId}/show-dates
```

**Response:**

```json
{
  "success": true,
  "message": "Show dates for movie fetched",
  "data": [
    "2026-06-01",
    "2026-06-02",
    "2026-06-03"
  ]
}
```

---

### Showtimes

#### 12. Get showtimes (with optional filters)

```
GET /showtimes
GET /showtimes?movieId={uuid}
GET /showtimes?date={yyyy-MM-dd}
GET /showtimes?movieId={uuid}&date={yyyy-MM-dd}
```

**Response:**

```json
{
  "success": true,
  "message": "Showtimes fetched",
  "data": [
    {
      "id": "uuid",
      "movieId": "uuid",
      "movieTitle": "Movie Title",
      "cinemaRoomId": "uuid",
      "cinemaRoomName": "Room 1",
      "startTime": "2026-06-01T14:00:00",
      "endTime": "2026-06-01T16:00:00",
      "status": 1
    }
  ]
}
```

---

#### 13. Get showtimes by movie

```
GET /showtimes/movie/{movieId}
```

---

#### 14. Get seat map for a showtime

```
GET /showtimes/{showtimeId}/seats
```

**Response:**

```json
{
  "success": true,
  "message": "Seat map fetched",
  "data": [
    {
      "seatId": "uuid",
      "rowName": "A",
      "seatNumber": 1,
      "type": "NORMAL",
      "available": true,
      "price": 75000.00
    },
    {
      "seatId": "uuid",
      "rowName": "A",
      "seatNumber": 2,
      "type": "VIP",
      "available": false,
      "price": 90000.00
    }
  ]
}
```

Seat types: `NORMAL`, `VIP`, `COUPLE`

---

### Realtime Events

#### 15. Subscribe to movie updates (SSE)

```
GET /events/movies
```

Returns an SSE stream. No response body — listen for events.

---

## Protected Endpoints (Require Authentication)

> All endpoints below require `Authorization: Bearer <access_token>` header.
> Roles: `MEMBER`, `STAFF`, `ADMIN`

---

### Booking

#### 16. Create a booking (hold seats)

```
POST /member/booking
```

**Request Body:**

```json
{
  "showtimeId": "uuid",
  "seatIds": ["uuid", "uuid"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| showtimeId | UUID | Yes | Must be a valid showtime |
| seatIds | List<UUID> | Yes | At least 1 seat |

**Response:**

```json
{
  "success": true,
  "message": "Booking created. Complete payment before hold expires.",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "showtimeId": "uuid",
    "movieTitle": "Movie Title",
    "cinemaRoomName": "Room 1",
    "startTime": "2026-06-01T14:00:00",
    "totalAmount": 165000.00,
    "status": "PENDING",
    "confirmationCode": "ABC123",
    "holdExpiresAt": "2026-06-01T13:10:00",
    "confirmedAt": null,
    "seats": [...]
  }
}
```

**Note:** Booking has a **10-minute hold** — complete payment before expiration.

---

#### 17. Pay and confirm booking

```
POST /member/booking/{bookingId}/pay
```

**Request Body:**

```json
{
  "paymentMethod": "VNPAY"
}
```

Supported payment methods: `VNPAY`, `MOMO`, `ZALOPAY`, `CASH`

**Response:**

```json
{
  "success": true,
  "message": "Payment successful. Tickets generated.",
  "data": {
    "booking": { ... },
    "payment": {
      "id": "uuid",
      "amount": 165000.00,
      "method": "VNPAY",
      "status": "SUCCESS",
      "transactionId": "TXN123",
      "paidAt": "2026-06-01T13:05:00"
    },
    "tickets": [
      {
        "id": "uuid",
        "bookingId": "uuid",
        "seatId": "uuid",
        "ticketCode": "TKT-ABC123-001",
        "checkedIn": false
      }
    ]
  }
}
```

---

#### 18. Get my bookings

```
GET /member/booking
```

Returns list of user's bookings.

---

#### 19. Get booking detail

```
GET /member/booking/{bookingId}
```

---

#### 20. Get tickets for a booking

```
GET /member/booking/{bookingId}/tickets
```

---

## Admin Endpoints

> Role: `ADMIN` only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users |
| GET | `/admin/users/{id}` | Get user detail |
| PUT | `/admin/users/{id}/role` | Update user role |
| POST | `/admin/movies` | Create movie |
| PUT | `/admin/movies/{id}` | Update movie |
| DELETE | `/admin/movies/{id}` | Delete movie |
| POST | `/admin/cinema-rooms` | Create cinema room |
| PUT | `/admin/cinema-rooms/{id}` | Update cinema room |
| POST | `/admin/showtimes` | Create showtime |
| PUT | `/admin/showtimes/{id}` | Update showtime |
| DELETE | `/admin/showtimes/{id}` | Delete showtime |

---

## Staff Endpoints

> Roles: `STAFF`, `ADMIN`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff/bookings` | List all bookings |
| GET | `/staff/bookings/{id}` | Get booking detail |
| PUT | `/staff/bookings/{id}/status` | Update booking status |
| POST | `/staff/checkin/{ticketCode}` | Check in ticket |

---

## Standard Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error format:**

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (e.g., seat already booked) |
| 500 | Internal Server Error |
