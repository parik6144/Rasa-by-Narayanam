#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/var/www/rasa-by-narayanam"
cd "$APP_DIR"

echo "== git pull (preserve .env) =="
cp -a .env /tmp/rasa.env.bak 2>/dev/null || true
git fetch origin
git reset --hard origin/main
if [ -f /tmp/rasa.env.bak ]; then cp -a /tmp/rasa.env.bak .env; fi
git log -1 --oneline

echo "== pause SelfAlgo for build RAM =="
pm2 stop selftradealgo || true
sleep 2

echo "== install + prisma =="
npm install
npx prisma generate

echo "== build =="
export NODE_OPTIONS="--max-old-space-size=700"
npx next build

echo "== restart Rasa =="
pm2 restart rasa-by-narayanam || pm2 start ./node_modules/next/dist/bin/next --name rasa-by-narayanam --cwd "$APP_DIR" -- start -p 3000
pm2 restart selftradealgo || true
pm2 save
pm2 list

sleep 3
curl -s -o /dev/null -w "home:%{http_code} " http://127.0.0.1:3000/
curl -s -o /dev/null -w "catalog:%{http_code}\n" http://127.0.0.1:3000/api/catalog
echo EC2_UPDATE_DONE
