# PROJECT CONTEXT - RIZZA BOOKING

This file is a living summary of the project so context is not lost between sessions.
Keep this updated when requirements, domains, or config change.

## Goal
Online booking flow for RIZZA services. User selects service, vehicle, date/time, fills details, and confirms via email.

## Current Domains (prod intent)
- Frontend: https://booking.rizzagroup.com
- API: https://api.rizzagroup.com
- Main domain (redirect only): https://rizzagroup.com -> https://booking.rizzagroup.com

## Stack
- Backend: Node.js + Fastify + Prisma + Zod + Nodemailer
- DB: PostgreSQL (Docker for local)
- Frontend: Angular (standalone, SPA)

## Repo Layout
- backend/
  - src/server.ts: Fastify app and routes registration
  - src/env.ts: env vars
  - src/routes/*.ts: API endpoints
  - src/services/email.ts: email template + send
  - src/utils/slots.ts: time slots
  - prisma/schema.prisma: DB schema
  - prisma/seed.ts: seed makes/models
- frontend/
  - src/index.html: SEO meta + JSON-LD
  - src/app/app.routes.ts: routes
  - src/app/pages/*.page.ts: UI pages
  - src/app/state/booking-draft.store.ts: sessionStorage draft
  - src/app/shared/config.ts: API_BASE config
  - src/styles.css: global styles
  - src/robots.txt, src/sitemap.xml: SEO

## Backend API (key routes)
- GET /api/health
- GET /api/vehicles/makes
- GET /api/vehicles/models?makeId=ID
- GET /api/availability?date=DD-MM-YYYY (also accepts YYYY-MM-DD)
  - Uses 30-min slots from 08:00 to 17:30
  - Marks slots unavailable if CONFIRMED or PENDING (recent)
- POST /api/bookings
  - Creates booking as PENDING
  - Generates confirmation token and sends email
- POST /api/bookings/confirm
  - Confirms booking by token
- GET /api/bookings/export.csv
  - CSV export (Basic Auth if ADMIN_USER/ADMIN_PASS set)
- GET /admin/bookings
  - Simple HTML admin (Basic Auth if ADMIN_USER/ADMIN_PASS set)
- GET /api/vehicle-image
  - Proxies VehicleImagery API and returns PNG

## DB Models (Prisma)
- VehicleMake (id, name)
- VehicleModel (id, makeId, name, imageKey, VehicleImagery mapping fields)
- Booking (serviceType, makeId, modelId, date, time, customer info, status, confirm token)

## Frontend Flow
- / (ServiceSelectPage)
- /vehicle (VehicleSelectPage)
- /schedule (SchedulePage)
- /confirm (ConfirmPage)
- /success (SuccessPage)

State is stored in sessionStorage via BookingDraftStore.

## Config / Env Notes
- Backend env vars:
  - DATABASE_URL (required)
  - PORT (default 3000)
  - CORS_ORIGIN (must be https://booking.rizzagroup.com in prod)
  - FRONTEND_URL (used in confirmation links)
  - SMTP_* (email sending)
  - ADMIN_USER, ADMIN_PASS (protect CSV export)
  - VEHICLE_IMAGERY_API_KEY, VEHICLE_IMAGERY_BASE_URL
  - CONFIRM_TOKEN_MINUTES (default 30)
- Frontend config:
  - API_BASE default is https://api.rizzagroup.com (frontend/src/app/shared/config.ts)
  - Optional runtime override: window.__RIZZA_CONFIG in index.html

## SEO Files (prod)
- frontend/src/robots.txt
  - disallow /confirm and /success
  - sitemap points to https://booking.rizzagroup.com/sitemap.xml
- frontend/src/sitemap.xml
  - includes only https://booking.rizzagroup.com/
- frontend/angular.json includes robots.txt and sitemap.xml in assets
- frontend/src/index.html includes title, description, canonical, OG/Twitter tags, JSON-LD Organization

## Local Dev
- DB: docker compose up -d (Postgres on host port 5433)
- Backend: npm i; prisma generate/migrate/seed; npm run dev
- Frontend: npm i; npm start

## Known Issues / TODO (prod readiness)
- Some UI and backend strings appear with bad encoding (mojibake). Normalize to UTF-8.
- CORS must be locked to https://booking.rizzagroup.com in prod env.
- Decide email policy if SMTP is not set (currently POST /api/bookings returns 500).
- Ensure FRONTEND_URL is set in prod env for correct confirmation links.
- Node version: uses fetch + top-level await; use Node 18+.
- Decide VehicleImagery usage (API key required) or fallback to local images.

## Recent Changes
- API_BASE set to https://api.rizzagroup.com
- Vehicle image URL now uses API_BASE (no hardcoded localhost)
- robots.txt + sitemap.xml created for booking.rizzagroup.com
- index.html updated with SEO meta + JSON-LD
- Vehicle select uses typeahead inputs and still pulls makes/models from DB
- Booking flow accepts DD-MM-YYYY dates

## Deployment Notes
- Serve frontend at booking.rizzagroup.com with HTTPS.
- Serve backend at api.rizzagroup.com with HTTPS.
- Set proper DNS + TLS.
- Configure redirect rizzagroup.com -> booking.rizzagroup.com (301).
- Submit sitemap in Google Search Console and Bing Webmaster Tools.
