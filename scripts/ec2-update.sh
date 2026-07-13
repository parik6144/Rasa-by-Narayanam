#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/var/www/rasa-by-narayanam"
cd "$APP_DIR"

echo "== git pull (preserve .env) =="
cp -a .env /tmp/rasa.env.bak 2>/dev/null || true
git fetch origin
git reset --hard origin/main
if [ -f /tmp/rasa.env.bak ]; then cp -a /tmp/rasa.env.bak .env; fi
# Ensure password @ is URL-encoded in DATABASE_URL if present
if [ -f .env ] && grep -q 'Rasa@2026Secure' .env; then
  sed -i 's/Rasa@2026Secure/Rasa%402026Secure/g' .env
fi
# Plain HTTP EC2 — cookies must not be Secure-only
if [ -f .env ]; then
  grep -q '^COOKIE_SECURE=' .env || echo 'COOKIE_SECURE=false' >> .env
  sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=false/' .env
fi
git log -1 --oneline

echo "== MySQL schema patches (idempotent-ish) =="
# Chat typing columns
sudo mysql rasa_platform -e "ALTER TABLE conversation ADD COLUMN typingBy VARCHAR(191) NULL;" 2>/dev/null || true
sudo mysql rasa_platform -e "ALTER TABLE conversation ADD COLUMN typingUntil DATETIME(3) NULL;" 2>/dev/null || true
# Booking snapshots must fit large menu JSON
sudo mysql rasa_platform -e "ALTER TABLE booking MODIFY COLUMN menuSnapshot LONGTEXT NULL;" 2>/dev/null || true
sudo mysql rasa_platform -e "ALTER TABLE booking MODIFY COLUMN addonsSnapshot LONGTEXT NULL;" 2>/dev/null || true
sudo mysql rasa_platform -e "ALTER TABLE booking MODIFY COLUMN customDishes LONGTEXT NULL;" 2>/dev/null || true
sudo mysql rasa_platform -e "ALTER TABLE booking MODIFY COLUMN notes TEXT NULL;" 2>/dev/null || true

echo "== pause SelfAlgo for build RAM =="
pm2 stop selftradealgo || true
pm2 stop rasa-by-narayanam || true
sleep 2

echo "== install + prisma =="
npm install
npx prisma generate

echo "== build =="
export NODE_OPTIONS="--max-old-space-size=700"
npx next build

echo "== prepare standalone =="
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -a .next/static .next/standalone/.next/
rm -rf .next/standalone/public
cp -a public .next/standalone/
cp -a .env .next/standalone/.env

echo "== restart Rasa (standalone) =="
pm2 delete rasa-by-narayanam || true
cd .next/standalone
PORT=3000 HOSTNAME=0.0.0.0 pm2 start server.js --name rasa-by-narayanam
cd "$APP_DIR"
pm2 restart selftradealgo || true
pm2 save
pm2 list

sleep 4
curl -s -o /dev/null -w "home:%{http_code} " http://127.0.0.1:3000/
curl -s -o /dev/null -w "catalog:%{http_code} " http://127.0.0.1:3000/api/catalog
curl -s -X POST http://127.0.0.1:3000/api/seed | head -c 120
echo
echo EC2_UPDATE_DONE
