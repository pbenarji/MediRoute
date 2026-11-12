# MediRoute

MediRoute is a full-stack college project demo for exploring a sample hospital directory in five Andhra Pradesh cities. It includes a React interface, an Express API, MongoDB persistence, account sign-in, hospital search and filters, visit counts, reviews, a cost estimator, map links, and a simulated bed-status view.

> **Demo only.** Hospital names, locations, contacts, ratings, prices, doctors, equipment, emergency listings, ICU beds, and wait times are sample values. Live bed and ER numbers are simulated. Verify provider details directly. Do not use MediRoute for medical decisions, emergency dispatch, or urgent care.

## Run it locally

Requirements: Node.js 22 or newer and npm.

1. Copy `.env.example` to `.env`.
2. Leave `MONGODB_URI` empty to try temporary demo mode, or set it to a MongoDB Atlas application connection string to persist accounts, visits, and reviews.
3. Set `JWT_SECRET` to a long random secret before deploying. Never commit `.env` or a real secret.
4. Install packages with `npm install`.
5. In one terminal, run `npm run server:dev`.
6. In a second terminal, run `npm run dev` and open `http://localhost:5173`.

Without a database URI, the directory remains searchable and accounts work temporarily in server memory. Account activity is cleared when the server restarts. The header shows whether MongoDB is connected.

## Deploy with Render and MongoDB Atlas

The included `render.yaml` creates a Render web service and asks for `MONGODB_URI`. In MongoDB Atlas, create a database user with access to a dedicated `mediroute` database, allow the Render service to connect, then copy the driver connection URI into Render's `MONGODB_URI` setting. Do not put the URI in this repository. Render generates `JWT_SECRET` for a new Blueprint deployment.

The first successful database connection seeds 12 clearly named sample hospital records if the `hospitals` collection is empty. The records contain no real patient data. The service serves both the built React app and API from the same Render URL.

Render's free web service can sleep when unused, so its first request after a quiet period may take longer. Use an always-on plan if you need continuous availability.

## Main routes

- `GET /api/health` — service and database status
- `GET /api/hospitals` — search by specialty, city, type, equipment, tags, emergency option, distance, rating, or reviews
- `GET /api/hospitals/live` — simulated ICU bed counts and ER waits
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/hospitals/:id` — hospital details, sample prices, doctors, and reviews
- `POST /api/hospitals/:id/visit` — add a self-reported visit for the signed-in user
- `POST` and `DELETE /api/hospitals/:id/reviews` — create or remove the signed-in user's review
- `GET /api/me/profile` — personal visit counts and reviews

## Notes

- Passwords are hashed with bcrypt. Sign-in uses a signed, HTTP-only session cookie.
- User activity is scoped to the signed-in account when MongoDB is connected.
- Location access is optional and requested only when the user selects **Use my location**. Without it, distance estimates use the Vijayawada demo centre.
- The map uses OpenStreetMap; directions open Google Maps.
- This is an educational prototype. It does not connect to hospital systems, validate clinicians, provide clinical guidance, prove visits, or offer emergency dispatch.
