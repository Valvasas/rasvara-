# Production Checklist

1. Deploy this as a Node/Express app from the `backend/` folder. Do not deploy `public/` alone as a static-only site because the frontend depends on `/api/*`.
2. Copy `backend/.env.example` to `backend/.env` on the server and set strong values for:
   - `ADMIN_PIN`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `CUSTOMER_SESSION_SECRET`
   - `DATABASE_URL`
   - production storage provider config (`STORAGE_DRIVER` must not stay `local`)
3. Install dependencies from `backend/` with `npm ci --omit=dev`.
4. Run `npm run db:generate`, `npm run db:migrate`, then optionally `npm run db:seed`.
5. If migrating legacy data, run `npm run db:migrate:json` after taking a PostgreSQL snapshot. The script also backs up `backend/data/data.json`.
6. Start the app with `NODE_ENV=production npm start` on Linux hosting, or set `NODE_ENV=production` in the platform environment variables and run `npm start`.
7. Put the app behind HTTPS before public release. Admin and customer session cookies are marked `Secure` in production.
8. Back up PostgreSQL and object storage regularly. During transition, also back up `backend/data/data.json` and `public/uploads/`.
9. Do not expose `backend/` as a static directory from another web server. The Express app serves only `public/` and explicitly blocks `/backend/*`.
10. Run `npm run check`, `npm test`, and `npm run audit` before deploy.

## Rollback Notes

- Code rollback: redeploy the previous release.
- Database rollback: restore the PostgreSQL snapshot taken before `npm run db:migrate`.
- Legacy data rollback: restore the JSON backup generated under `backend/data/backups/`.
- Do not delete `backend/data/data.json` until every legacy route has a confirmed Prisma replacement.

## Recommended Hosting

- Good fit: VPS, Render, Railway, Fly.io, or Google Cloud Run.
- Firebase Hosting alone is not enough for production. If you want Firebase, route `/api/**` to Cloud Run/Functions and keep static assets in Hosting.
