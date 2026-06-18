# Annie Catering

Simple catering website with a static frontend and an Express backend.

## Structure

- `public/` - customer site, admin UI, styles, client scripts, and public uploads.
- `backend/` - Express API, auth/session handling, data storage, and deployment config.
- `backend/data/data.json` - current menu, order, ledger, and website settings data.
- `public/uploads/` - images uploaded from the admin panel.

## Local Testing

```powershell
cd backend
npm install
npm run check
npm run audit
$env:PORT="3000"
npm start
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/admin`
- `http://localhost:3000/api/health`

Use `backend/.env.example` as the production environment template. Static hosting alone is not enough because the frontend calls `/api/*`.
