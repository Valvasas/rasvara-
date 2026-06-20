# Production Checklist

1. Deploy this as a Node/Express app from the `backend/` folder. Do not deploy `public/` alone as a static-only site because the frontend depends on `/api/*`.
2. Copy `backend/.env.example` to `backend/.env` on the server and set strong values for:
   - `ADMIN_PIN`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
3. Install dependencies from `backend/` with `npm ci --omit=dev`.
4. Start the app with `NODE_ENV=production npm start` on Linux hosting, or set `NODE_ENV=production` in the platform environment variables and run `npm start`.
5. Put the app behind HTTPS before public release. The admin session cookie is marked `Secure` in production.
6. Back up `backend/data/data.json` and `public/uploads/` regularly. They are the current data store.
7. Do not expose `backend/` as a static directory from another web server. The Express app serves only `public/` and explicitly blocks `/backend/*`.
8. Run `npm run check` and `npm run audit` before deploy.

## Recommended Hosting

- Good fit: VPS, Render, Railway, Fly.io, or Google Cloud Run.
- Firebase Hosting alone is not enough for production. If you want Firebase, route `/api/**` to Cloud Run/Functions and keep static assets in Hosting.
