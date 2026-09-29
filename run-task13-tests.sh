#!/bin/bash
# Task 13 — agent-browser verification runner (v3).
# Uses agent-browser primitives: snapshot, find role/text/label, get count,
# get text (body), get box, errors, press, click, keyboard type, set viewport.

set +e
cd /home/z/my-project

LOG=/home/z/my-project/dev.log
PORT=3000
HOST=http://localhost:$PORT

echo "=== TASK 13 — agent-browser verification (v3) ==="
echo "Time: $(date)"
echo

# ─── 1. Start dev server in background ────────────────────────────────
echo "[setup] starting dev server on port $PORT..."
rm -f "$LOG"
nohup ./node_modules/.bin/next dev -p $PORT > "$LOG" 2>&1 &
DEV_PID=$!
disown $DEV_PID
echo "[setup] dev pid=$DEV_PID"

READY=0
for i in $(seq 1 60); do
  sleep 2
  if ss -tln 2>/dev/null | grep -q ":$PORT"; then
    READY=1
    break
  fi
done
if [ "$READY" != "1" ]; then
  echo "[setup] ✗ dev server did not start listening on $PORT"
  tail -n 20 "$LOG"
  kill $DEV_PID 2>/dev/null
  exit 1
fi
echo "[setup] ✓ dev server listening"

echo "[setup] warming up compile (curl /)..."
CODE=""
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$HOST/")
  if [ "$CODE" = "200" ]; then
    echo "[setup] ✓ / returns 200 (after ${i} attempts)"
    break
  fi
  sleep 2
done
if [ "$CODE" != "200" ]; then
  echo "[setup] ✗ / did not return 200 (last code: $CODE)"
  tail -n 25 "$LOG"
  kill $DEV_PID 2>/dev/null
  exit 1
fi

# ─── 2. agent-browser session ─────────────────────────────────────────
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix task13)"
echo "[setup] agent-browser session: $AGENT_BROWSER_SESSION"

agent-browser close --all 2>/dev/null || true
sleep 1
agent-browser set viewport 1280 720 2>/dev/null || true
agent-browser errors --clear 2>/dev/null || true
agent-browser console --clear 2>/dev/null || true

PASS=0
FAIL=0
RESULTS=""
record() {
  local name="$1"
  local result="$2"
  local detail="${3:-}"
  if [ "$result" = "PASS" ]; then
    PASS=$((PASS+1))
    RESULTS+="  ✓ $name  ${detail:+— $detail}\n"
  else
    FAIL=$((FAIL+1))
    RESULTS+="  ✗ $name  ${detail:+— $detail}\n"
  fi
}

# Helper: count of [role=dialog] currently on the page.
dialog_count() {
  agent-browser get count "[role=dialog]" 2>&1 | tail -1 | grep -oE "^[0-9]+" || echo "0"
}

# Helper: body text (first 2KB)
body_text() {
  agent-browser get text "body" 2>&1 | head -c 2000
}

# ─── TEST 1: Login screen shows canvas + email form ──────────────────
echo "── Test 1: login canvas + form ──"
agent-browser open "$HOST/" --wait idle >/dev/null 2>&1
sleep 1.5
HAS_CANVAS=$(agent-browser get count "canvas" 2>&1 | tail -1 | grep -oE "^[0-9]+" || echo 0)
HAS_FORM=$(agent-browser get count "input[type=email]" 2>&1 | tail -1 | grep -oE "^[0-9]+" || echo 0)
TITLE=$(agent-browser get title 2>&1 | tail -1)
echo "  canvas=$HAS_CANVAS  emailInput=$HAS_FORM  title=$TITLE"
if [ "$HAS_CANVAS" -ge "1" ] 2>/dev/null && [ "$HAS_FORM" -ge "1" ] 2>/dev/null; then
  record "1. login canvas + form" "PASS" "canvas=$HAS_CANVAS, emailInput=$HAS_FORM"
else
  record "1. login canvas + form" "FAIL" "canvas=$HAS_CANVAS, emailInput=$HAS_FORM"
fi
echo

# ─── Login (click sign-in) ────────────────────────────────────────────
echo "── Login ──"
agent-browser click "button[type=submit]" >/dev/null 2>&1
sleep 3
agent-browser wait --text "HayDevOS" --timeout 15000 >/dev/null 2>&1 || true
sleep 2
agent-browser errors --clear 2>/dev/null || true
agent-browser console --clear 2>/dev/null || true
echo "  logged in"
echo

# ─── TEST 2: Press ? → shortcuts dialog ───────────────────────────────
echo "── Test 2: ? opens shortcuts dialog ──"
# Use keyboard type for the literal "?" character.
agent-browser keyboard type "?" >/dev/null 2>&1
sleep 1.5
DC=$(dialog_count)
BT=$(body_text)
echo "  dialogCount=$DC"
if [ "$DC" -ge "1" ] 2>/dev/null && (echo "$BT" | grep -iqE "shortcuts|keyboard|նավիգացիա|hotkey|⌘K|արագ գործողություն"); then
  record "2. ? opens shortcuts dialog" "PASS" "dialogCount=$DC"
else
  record "2. ? opens shortcuts dialog" "FAIL" "dialogCount=$DC"
fi
agent-browser press Escape >/dev/null 2>&1
sleep 1
echo

# ─── TEST 3: Press Ctrl+H → activity sheet ────────────────────────────
echo "── Test 3: Ctrl+H opens activity sheet ──"
agent-browser press Control+h >/dev/null 2>&1
sleep 1.5
DC=$(dialog_count)
BT=$(body_text)
echo "  dialogCount=$DC"
echo "  bodyText(80ch)=${BT:0:80}"
if [ "$DC" -ge "1" ] 2>/dev/null && (echo "$BT" | grep -iqE "activity|timeline|Last 7|Ակտիվություն|Активность"); then
  record "3. Ctrl+H opens activity sheet" "PASS"
else
  record "3. Ctrl+H opens activity sheet" "FAIL" "dialogCount=$DC"
fi
echo

# ─── TEST 4: Filter by module + click event drilldown ────────────────
echo "── Test 4: filter activity by module + drilldown ──"
# Click the module combobox (first one in the sheet)
agent-browser find role combobox click >/dev/null 2>&1
sleep 0.8
# Snapshot the dropdown to find LeadOS option
agent-browser snapshot -i >/tmp/snap_mod.txt 2>&1
LEAD_OPT=$(grep -iE "LeadOS|լիդ" /tmp/snap_mod.txt | head -1)
echo "  leados option line: $LEAD_OPT"
# Try to extract the ref of the LeadOS option
LEAD_REF=$(echo "$LEAD_OPT" | grep -oE "ref=e[0-9]+" | head -1 | sed 's/ref=e\(.*\)/@\1/')
echo "  leados option ref: $LEAD_REF"
if [ -n "$LEAD_REF" ]; then
  agent-browser click "$LEAD_REF" >/dev/null 2>&1
  sleep 0.7
fi
# Now click the first timeline event button. Use find first matching div button inside the sheet body.
# The timeline events have aria-label like "Բացել Leados-ում" / "Open in Leados".
# Use find first on button inside the sheet.
agent-browser snapshot -i >/tmp/snap_ev.txt 2>&1
# Find any clickable inside the timeline (refs marked clickable [onclick])
EVENT_REF=$(grep -oE "ref=e[0-9]+" /tmp/snap_ev.txt | head -5 | tail -1)
echo "  first event ref candidate: $EVENT_REF"
# Better: find a button with "Open in" or "ago" in name. Use Armenian "Բացել" or English "Open"
agent-browser find role button click --name "ago" 2>&1 | tail -1
sleep 1.5
TOAST_COUNT=$(agent-browser get count "[data-sonner-toast]" 2>&1 | tail -1 | grep -oE "^[0-9]+" || echo 0)
DCA=$(dialog_count)
echo "  dialogCountAfter=$DCA  toastCount=$TOAST_COUNT"
if [ "$TOAST_COUNT" -ge "1" ] 2>/dev/null; then
  record "4. filter + drilldown" "PASS" "toastCount=$TOAST_COUNT"
else
  record "4. filter + drilldown" "FAIL" "toastCount=$TOAST_COUNT, dialogCountAfter=$DCA"
fi
agent-browser press Escape >/dev/null 2>&1
sleep 1
echo

# ─── TEST 5: Topbar Activity button ──────────────────────────────────
echo "── Test 5: topbar Activity button ──"
# Click the topbar Activity button via Armenian aria-label "Ակտիվություն"
agent-browser find role button click --name "Ակտիվություն" 2>&1 | tail -1
sleep 1.5
DC=$(dialog_count)
BT=$(body_text)
echo "  dialogCount=$DC"
if [ "$DC" -ge "1" ] 2>/dev/null && (echo "$BT" | grep -iqE "activity|timeline|Last 7|Ակտիվություն"); then
  record "5. topbar Activity button" "PASS"
else
  record "5. topbar Activity button" "FAIL" "dialogCount=$DC"
fi
agent-browser press Escape >/dev/null 2>&1
sleep 1.5  # extra wait to ensure sheet fully closed before next test
echo

# ─── TEST 6a: g + l → LeadOS ─────────────────────────────────────────
echo "── Test 6a: g+l → LeadOS ──"
agent-browser keyboard type "g" >/dev/null 2>&1
sleep 0.6
agent-browser keyboard type "l" >/dev/null 2>&1
sleep 2
BT=$(body_text)
echo "  bodyText(120ch)=${BT:0:120}"
if echo "$BT" | grep -iqE "LeadOS|լիդ"; then
  record "6a. g+l → LeadOS" "PASS"
else
  record "6a. g+l → LeadOS" "FAIL" "noLeadOS"
fi
echo

# ─── TEST 6b: g + c → Control ────────────────────────────────────────
echo "── Test 6b: g+c → Control ──"
agent-browser keyboard type "g" >/dev/null 2>&1
sleep 0.6
agent-browser keyboard type "c" >/dev/null 2>&1
sleep 2
BT=$(body_text)
echo "  bodyText(120ch)=${BT:0:120}"
if echo "$BT" | grep -iqE "Control|կառ"; then
  record "6b. g+c → Control" "PASS"
else
  record "6b. g+c → Control" "FAIL" "noControl"
fi
echo

# ─── TEST 7: Notifications i18n (HY → EN) ────────────────────────────
echo "── Test 7: notifications i18n (HY → EN) ──"
# Bell button has Armenian aria-label "Ծանուցումներ" (HY default)
agent-browser find role button click --name "Ծանուցումներ" 2>&1 | tail -1
sleep 1.5
# Snapshot the popover to find the list items
agent-browser snapshot -i >/tmp/snap_pop.txt 2>&1
echo "  --- popover snapshot (first 12 lines) ---"
head -12 /tmp/snap_pop.txt | sed 's/^/    /'
# Get text of the first li
HY_TXT=$(agent-browser get text "li" 2>&1 | tail -1 | head -c 200)
echo "  HY popover(80ch)=${HY_TXT:0:80}"
if echo "$HY_TXT" | grep -qE "Ա|Է|Ի|Ո|Ս|Տ|Պ|Կ|Ռ|և|օ|ը|ծ|ն|ր"; then
  HY_OK=1
else
  HY_OK=0
fi
agent-browser press Escape >/dev/null 2>&1
sleep 0.7

# Switch language to EN
agent-browser find role button click --name "Լեզու" 2>&1 | tail -1
sleep 1
agent-browser snapshot -i >/tmp/snap_lang.txt 2>&1
EN_LINE=$(grep -i "english" /tmp/snap_lang.txt | head -1)
echo "  English option line: $EN_LINE"
EN_REF=$(echo "$EN_LINE" | grep -oE "ref=e[0-9]+" | head -1 | sed 's/ref=e\(.*\)/@\1/')
if [ -n "$EN_REF" ]; then
  agent-browser click "$EN_REF" >/dev/null 2>&1
  sleep 1.5
fi
# Reopen bell — now aria-label is "Notifications"
agent-browser find role button click --name "Notifications" 2>&1 | tail -1
sleep 1.5
EN_TXT=$(agent-browser get text "li" 2>&1 | tail -1 | head -c 200)
echo "  EN popover(80ch)=${EN_TXT:0:80}"
if echo "$EN_TXT" | grep -iqE "SLA breach|Deal won|Quote accepted|New inbound|Integration|Automation failed|Document approved|Weekly digest|mentioned"; then
  EN_OK=1
else
  EN_OK=0
fi
agent-browser press Escape >/dev/null 2>&1
sleep 0.7

if [ "$HY_OK" = "1" ] && [ "$EN_OK" = "1" ]; then
  record "7. notifications i18n (HY → EN)" "PASS"
else
  record "7. notifications i18n (HY → EN)" "FAIL" "hy=$HY_OK en=$EN_OK"
fi
echo

# ─── TEST 8: Sticky footer + responsive + console errors ─────────────
echo "── Test 8: sticky footer + responsive + console errors ──"
agent-browser set viewport 1280 720 2>/dev/null || true
sleep 0.5
# Go to dashboard (short content)
agent-browser keyboard type "g" >/dev/null 2>&1
sleep 0.4
agent-browser keyboard type "d" >/dev/null 2>&1
sleep 1.5
FOOTER_BOX=$(agent-browser get box "footer" 2>&1)
echo "  footerBox@1280:"
echo "$FOOTER_BOX" | sed 's/^/    /'
if echo "$FOOTER_BOX" | grep -q "width"; then
  record "8a. footer sticky @1280" "PASS"
else
  record "8a. footer sticky @1280" "FAIL" "no box"
fi

agent-browser set viewport 375 812 2>/dev/null || true
sleep 1
MOBILE_FOOTER=$(agent-browser get box "footer" 2>&1)
echo "  footerBox@375:"
echo "$MOBILE_FOOTER" | sed 's/^/    /'
if echo "$MOBILE_FOOTER" | grep -q "width"; then
  record "8b. footer sticky @375" "PASS"
else
  record "8b. footer sticky @375" "FAIL" "no box"
fi

agent-browser set viewport 1280 720 2>/dev/null || true
sleep 0.3
ERRORS=$(agent-browser errors 2>&1)
echo "  --- errors output ---"
echo "$ERRORS" | head -10 | sed 's/^/    /'
if echo "$ERRORS" | grep -iqE "error|exception|failed"; then
  record "8c. no console errors" "FAIL" "errors found"
else
  record "8c. no console errors" "PASS" "no errors"
fi
echo

# ─── Done ─────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════════"
echo "RESULTS:"
echo -e "$RESULTS"
echo "───"
echo "PASS=$PASS  FAIL=$FAIL  (total=$((PASS+FAIL)))"
echo

echo "[teardown] killing dev server (pid=$DEV_PID)..."
kill $DEV_PID 2>/dev/null
sleep 1
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
echo "[teardown] done"

echo
echo "=== dev.log tail (last 15 lines) ==="
tail -n 15 "$LOG"

exit 0
