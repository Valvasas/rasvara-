#!/bin/bash
# Reset DB demo ke kondisi bersih (seed + data contoh + voucher HEMAT10)
cd /home/user/rasvara-/Citarasa_Catering
fuser -k 3000/tcp >/dev/null 2>&1; sleep 2
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS citarasa WITH (FORCE)' -c 'CREATE DATABASE citarasa OWNER citarasa'" >/dev/null
npm run db:deploy >/dev/null 2>&1 && SEED_DEMO=1 npm run db:seed >/dev/null 2>&1
(nohup npm start > /tmp/claude-0/prod.log 2>&1 &); sleep 6
curl -s -o /dev/null -w "server: %{http_code}\n" localhost:3000/
cd ../tour && node setup.js
