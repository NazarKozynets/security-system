# Security Management System — Frontend

React + TypeScript (Vite) admin UI and public home for the security coursework project.

## Stack

- React Router 7, Axios (interceptors), React Toastify, React Hook Form + Zod
- Functional components, context auth, permission-aware UI

## Setup

```bash
npm install
cp .env.example .env
# Edit VITE_API_BASE_URL to match your NestJS backend (default http://localhost:3000)
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview build

## Architecture (overview)

- `src/api` — Axios instance, request/response interceptors, feature API modules
- `src/providers` — `AuthProvider` (JWT in `localStorage`, `/auth/me` bootstrap)
- `src/router` — routes, `RequireAdmin` guard
- `src/layouts` — `PublicLayout` (home, login, forbidden), `AdminLayout` (sidebar console)
- `src/pages` — screen-level components
- `src/shared` — UI kit, global PS5-inspired styles, error helpers, RBAC helpers
- `src/types` — domain types aligned with backend responses

## API connection

Set `VITE_API_BASE_URL` to the backend origin. The client attaches `Authorization: Bearer <token>` on each request after login.

Unauthorized responses (except `/auth/login` and `/auth/register`) clear the session and redirect to login; toasts surface permission and server errors.

## Demo

1. Start the backend and seed demo users.
2. Sign in as an analyst/admin — you should land in `/admin`.
3. Sign in as a basic user — you stay on the public home (`/`); `/admin` redirects to `/forbidden`.
