# Annie Catering

Marketplace-style catering website with a static frontend and an Express backend.

## Structure

- `public/` - all browser-facing pages, styles, scripts, icons, brand assets, and public uploads.
- `backend/` - Express API, auth/session handling, order/customer/vendor/admin endpoints, and server config.
- `backend/data/data.json` - local runtime data for menus, orders, ledger, reviews, vendors, and website settings.
- `public/uploads/` - images served to visitors and uploaded from admin/vendor tools.
- `firebase.json` - Firebase Hosting config; it serves the `public/` directory.

Root-level HTML/CSS/JS files are intentionally not used. Keep frontend changes inside `public/`.

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

## Maintenance Notes

- Do not commit `backend/node_modules/`, `.env`, or `backend/data/*.json`.
- Use `backend/.env.example` as the production environment template.
- Static hosting alone is not enough because the frontend calls `/api/*`.
- If dependencies are missing locally, run `npm install` from `backend/`.
