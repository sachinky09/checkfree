# CheckFree

CheckFree is a **Next.js 14 + TypeScript** application that allows Buyers and Sellers to schedule and manage appointments seamlessly using **Google Calendar** integration. The app is minimal, production-ready, and deployable on **Vercel**.

## Features

- **Authentication & Role Management**
  - Google OAuth2 with NextAuth.js.
  - Scopes: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly`.
  - Secure refresh token encryption using `REFRESH_TOKEN_SECRET`.
  - Existing users are redirected to their dashboard.
  - New users are prompted to select a role (Buyer or Seller).
  - Role selection happens only once.

- **Seller Dashboard**
  - Availability fetched from Google Calendar Free/Busy API.
  - Generates 30-minute slots, automatically marks busy slots.
  - Shows all future appointments directly from Google Calendar.

- **Buyer Dashboard**
  - Search and select Sellers.
  - Pick a date → fetch Seller availability.
  - Displays only free 30-minute slots.
  - Book an appointment → creates Google Calendar event for both participants with title, description, attendees, and Google Meet link.
  - Displays all future appointments from Google Calendar.

- **Middleware Protection**
  - Protects `/buyer` and `/seller` routes.
  - Redirects users without a role to `/auth/role`.

## Project Structure

```
components/
  ui/
hooks/
  use-toast.ts
lib/
  encryption.ts
  googleCalendar.ts
  mongodb.ts
  utils.ts
pages/
  api/
  auth/
  buyer/
  seller/
  _app.tsx
  index.tsx
styles/
  globals.css
types/
  next-auth.d.ts
middleware.ts
next.config.js
tailwind.config.ts
tsconfig.json
```

## Environment Variables

Create a `.env` file in the project root:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
REFRESH_TOKEN_SECRET=your_refresh_token_secret
MONGODB_URI=your_mongodb_uri
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

- Deploy easily on **Vercel**.
- Add all environment variables to Vercel project settings.

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [NextAuth.js](https://next-auth.js.org/)
- [MongoDB](https://www.mongodb.com/)
- [Google Calendar API](https://developers.google.com/calendar)
- [Tailwind CSS](https://tailwindcss.com/)