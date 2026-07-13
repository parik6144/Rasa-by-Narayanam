#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"
COOKIE=/tmp/rasa_test_cookies.txt
rm -f "$COOKIE"

pass=0
fail=0
check() {
  local name="$1" ok="$2" detail="${3:-}"
  if [ "$ok" = "1" ]; then
    echo "PASS  $name ${detail}"
    pass=$((pass+1))
  else
    echo "FAIL  $name ${detail}"
    fail=$((fail+1))
  fi
}

code=$(curl -s -o /tmp/t_home.html -w '%{http_code}' "$BASE/")
check "home" "$([[ $code == 200 ]] && echo 1 || echo 0)" "HTTP $code"

code=$(curl -s -o /tmp/t_cat.json -w '%{http_code}' "$BASE/api/catalog")
pkgs=$(python3 -c "import json;d=json.load(open('/tmp/t_cat.json'));print(len(d.get('packages',[])))" 2>/dev/null || echo 0)
check "catalog" "$([[ $code == 200 && $pkgs -ge 5 ]] && echo 1 || echo 0)" "HTTP $code pkgs=$pkgs"

# guest chat (no prior login)
code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_chat1.json -w '%{http_code}' \
  -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"text":"Hi, I am Test Guest (guest@test.com).","guestName":"Test Guest","guestEmail":"guest@test.com"}')
convid=$(python3 -c "import json;d=json.load(open('/tmp/t_chat1.json'));print(d.get('conversationId') or '')" 2>/dev/null || true)
check "guest-chat-start" "$([[ $code == 200 && -n $convid ]] && echo 1 || echo 0)" "HTTP $code conv=$convid"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_chat2.json -w '%{http_code}' \
  -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d "{\"conversationId\":\"$convid\",\"text\":\"What is the price?\"}")
has_bot=$(python3 -c "import json;d=json.load(open('/tmp/t_chat2.json'));print('1' if d.get('conversationId') else '0')" 2>/dev/null || echo 0)
check "guest-chat-reply" "$([[ $code == 200 && $has_bot == 1 ]] && echo 1 || echo 0)" "HTTP $code"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_msgs.json -w '%{http_code}' \
  "$BASE/api/chat?conversationId=$convid")
msgcount=$(python3 -c "import json;d=json.load(open('/tmp/t_msgs.json'));print(len(d.get('messages',[])))" 2>/dev/null || echo 0)
check "guest-chat-messages" "$([[ $code == 200 && $msgcount -ge 2 ]] && echo 1 || echo 0)" "HTTP $code msgs=$msgcount"

# admin login
code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_login.json -w '%{http_code}' \
  -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@rasakitchen.co","password":"admin123"}')
role=$(python3 -c "import json;d=json.load(open('/tmp/t_login.json'));print((d.get('user') or {}).get('role') or '')" 2>/dev/null || true)
check "admin-login" "$([[ $code == 200 && $role == admin ]] && echo 1 || echo 0)" "HTTP $code role=$role"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_me.json -w '%{http_code}' "$BASE/api/auth/me")
me_role=$(python3 -c "import json;d=json.load(open('/tmp/t_me.json'));print((d.get('user') or {}).get('role') or '')" 2>/dev/null || true)
check "session-cookie" "$([[ $code == 200 && $me_role == admin ]] && echo 1 || echo 0)" "HTTP $code role=$me_role"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_dash.json -w '%{http_code}' "$BASE/api/admin/dashboard")
check "admin-dashboard" "$([[ $code == 200 ]] && echo 1 || echo 0)" "HTTP $code"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_leads.json -w '%{http_code}' "$BASE/api/admin/leads")
check "admin-leads" "$([[ $code == 200 ]] && echo 1 || echo 0)" "HTTP $code"

code=$(curl -s -c "$COOKIE" -b "$COOKIE" -o /tmp/t_book.json -w '%{http_code}' "$BASE/api/admin/bookings")
check "admin-bookings" "$([[ $code == 200 ]] && echo 1 || echo 0)" "HTTP $code"

code=$(curl -s -o /tmp/t_lead.json -w '%{http_code}' -X POST "$BASE/api/leads" \
  -H 'Content-Type: application/json' \
  -d '{"name":"EC2 Tester","phone":"9876543210","email":"ec2test@example.com","city":"Jamshedpur","message":"Server feature test"}')
check "public-lead" "$([[ $code == 200 || $code == 201 ]] && echo 1 || echo 0)" "HTTP $code"

echo "----"
echo "RESULT pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
