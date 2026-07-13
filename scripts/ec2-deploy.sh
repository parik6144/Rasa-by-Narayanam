#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/rasa-by-narayanam"
REPO="https://github.com/parik6144/Rasa-by-Narayanam.git"
DB_NAME="rasa_platform"
DB_USER="rasa"
DB_PASS="Rasa@2026Secure"
PORT=3000

echo "== Backup old Sports Foundry =="
if [ -d /var/www/sportsphere-frontend ]; then
  sudo mv /var/www/sportsphere-frontend "/var/www/sportsphere-frontend.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "== Clone / update Rasa =="
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch --all
  git reset --hard origin/main
else
  sudo rm -rf "$APP_DIR"
  sudo git clone "$REPO" "$APP_DIR"
  sudo chown -R ubuntu:ubuntu "$APP_DIR"
fi
cd "$APP_DIR"

echo "== MySQL database =="
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

TABLE_COUNT=$(sudo mysql -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")
if [ "$TABLE_COUNT" = "0" ]; then
  echo "Importing SQL dump..."
  SQL_FILE=""
  if [ -f sql/rasa_platform.sql ]; then SQL_FILE="sql/rasa_platform.sql"; fi
  if [ -f rasa_platform.sql ]; then SQL_FILE="rasa_platform.sql"; fi
  if [ -z "$SQL_FILE" ]; then
    echo "ERROR: SQL dump not found"
    exit 1
  fi
  sudo mysql "$DB_NAME" < "$SQL_FILE"
else
  echo "DB already has $TABLE_COUNT tables — skip import"
fi

echo "== .env =="
cat > .env <<EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@127.0.0.1:3306/${DB_NAME}"
SESSION_SECRET="rasa-ec2-session-secret-change-me-32b!"
EOF

echo "== Free RAM for build (pause SelfAlgo temporarily) =="
pm2 stop selftradealgo || true
sleep 2
free -h

echo "== npm install =="
npm install

echo "== Prisma generate =="
npx prisma generate

echo "== Next.js build =="
export NODE_OPTIONS="--max-old-space-size=700"
npx next build

echo "== PM2 start Rasa (next start — no bun) =="
pm2 delete rasa-by-narayanam || true
pm2 start ./node_modules/next/dist/bin/next --name rasa-by-narayanam --cwd "$APP_DIR" -- start -p "$PORT"
pm2 save

echo "== Restart SelfAlgo =="
pm2 restart selftradealgo || true
pm2 save
pm2 list

echo "== Health check =="
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${PORT}/" || true
echo DEPLOY_DONE
