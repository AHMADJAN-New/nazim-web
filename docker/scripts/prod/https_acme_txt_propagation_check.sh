#!/usr/bin/env bash
# Verify _acme-challenge TXT is visible from authoritative NS + many public resolvers.
# Let's Encrypt "secondary validation" uses vantage points we cannot enumerate; stale
# TXT can still appear after our first "all green" — we add cooldown + re-checks.
#
# Usage:
#   bash docker/scripts/prod/https_acme_txt_propagation_check.sh nazim.cloud <token>
#   bash docker/scripts/prod/https_acme_txt_propagation_check.sh nazim.cloud <t1> <t2>
#   bash docker/scripts/prod/https_acme_txt_propagation_check.sh --wait nazim.cloud <token> [t2...]
#
# Env (optional):
#   ACME_TXT_WAIT_LOOPS / ACME_TXT_WAIT_SLEEP_SEC — outer retry loop
#   ACME_TXT_POST_OK_COOLDOWN_SEC — wait after first full pass (default 180); set 0 to skip
#   ACME_TXT_POST_OK_EXTRA_ROUNDS — extra full checks after cooldown (default 2), 30s apart
#
# Run from the host (uses `dig`); no Docker required.

set -euo pipefail

WAIT=0
if [[ "${1:-}" == "--wait" ]]; then
  WAIT=1
  shift
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 [--wait] <domain> <expected-txt-token> [second-token-if-certbot-showed-two]"
  echo "Example: $0 --wait nazim.cloud dB4EOOxBbjMYNuscPkDc11JQzOQ977Ry3IohOpCNTEg"
  exit 1
fi

DOMAIN="$1"
shift
EXPECTED=("$@")

NAME="_acme-challenge.${DOMAIN}"

# Public recursive resolvers (wide geographic / vendor spread; not identical to LE's set).
PUBLIC_RESOLVERS=(
  8.8.8.8 8.8.4.4
  1.1.1.1 1.0.0.1
  208.67.222.222 208.67.220.220
  9.9.9.9 149.112.112.112
  77.88.8.8 77.88.8.1
  94.140.14.14 94.140.15.15
  114.114.114.114 223.5.5.5
  64.6.64.6 64.6.65.6
  193.17.47.1 185.228.168.9
)

sort_join() {
  printf '%s\n' "$@" | sort -u | tr '\n' '|'
}

expected_key="$(sort_join "${EXPECTED[@]}")"

get_auth_nameservers() {
  dig NS "${DOMAIN}." +short +time=3 +tries=2 2>/dev/null | sed 's/\.$//' | grep -v '^$' || true
}

dig_txt_at() {
  local ns="$1"
  dig TXT "$NAME" @"$ns" +short +time=3 +tries=2 2>/dev/null || true
}

parse_txt_lines() {
  local line t
  while IFS= read -r line || [[ -n "${line:-}" ]]; do
    [[ -z "${line// }" ]] && continue
    t="${line#\"}"
    t="${t%\"}"
    [[ -n "$t" ]] && echo "$t"
  done
}

# Returns 0 if this nameserver's TXT set matches expected exactly; 1 otherwise.
check_one_ns() {
  local label="$1"
  local ns="$2"
  local raw got_key
  raw="$(dig_txt_at "$ns")"
  mapfile -t got < <(echo "$raw" | parse_txt_lines)
  if [[ ${#got[@]} -eq 0 ]]; then
    echo "[acme-check] FAIL  ${label} @$ns  → no TXT"
    return 1
  fi
  got_key="$(sort_join "${got[@]}")"
  if [[ "$got_key" != "$expected_key" ]]; then
    echo "[acme-check] FAIL  ${label} @$ns  → got: $(printf '%s ' "${got[@]}") (want exactly: ${EXPECTED[*]})"
    return 1
  fi
  echo "[acme-check] OK    ${label} @$ns  → ${EXPECTED[*]}"
  return 0
}

check_once() {
  local all_ok=1
  local ns
  mapfile -t AUTH_NS < <(get_auth_nameservers)

  if [[ ${#AUTH_NS[@]} -eq 0 ]]; then
    echo "[acme-check] WARN  could not resolve NS for ${DOMAIN}.; only checking public resolvers"
  else
    echo "[acme-check] Authoritative nameservers for ${DOMAIN}. (${#AUTH_NS[@]}): ${AUTH_NS[*]}"
    for ns in "${AUTH_NS[@]}"; do
      if ! check_one_ns "auth" "$ns"; then
        all_ok=0
      fi
    done
  fi

  for ns in "${PUBLIC_RESOLVERS[@]}"; do
    if ! check_one_ns "recursive" "$ns"; then
      all_ok=0
    fi
  done

  return $((1 - all_ok))
}

post_ok_cooldown() {
  local cd_sec="${ACME_TXT_POST_OK_COOLDOWN_SEC:-180}"
  local extra="${ACME_TXT_POST_OK_EXTRA_ROUNDS:-2}"
  local r
  if [[ "$cd_sec" -gt 0 ]]; then
    echo "[acme-check] All targets matched once. Cooldown ${cd_sec}s (LE uses other paths; stale TXT can lag)..."
    sleep "$cd_sec"
  else
    echo "[acme-check] Post-match cooldown disabled (ACME_TXT_POST_OK_COOLDOWN_SEC=0)."
  fi
  for ((r = 1; r <= extra; r++)); do
    echo "[acme-check] Post-cooldown verification round $r/${extra}..."
    if ! check_once; then
      echo "[acme-check] Post-cooldown check failed — do not press Enter in Certbot yet."
      return 1
    fi
    if [[ "$r" -lt "$extra" ]]; then
      sleep 30
    fi
  done
  return 0
}

if [[ $WAIT -eq 1 ]]; then
  local_loops="${ACME_TXT_WAIT_LOOPS:-40}"
  local_sleep="${ACME_TXT_WAIT_SLEEP_SEC:-15}"
  echo "[acme-check] Waiting until authoritative NS + public resolvers return ONLY the expected token(s)..."
  echo "[acme-check] (outer loops=$local_loops sleep=${local_sleep}s; cooldown=${ACME_TXT_POST_OK_COOLDOWN_SEC:-180}s; override env vars in script header)"
  for ((i = 1; i <= local_loops; i++)); do
    echo "[acme-check] --- outer try $i/$local_loops ---"
    if check_once; then
      if post_ok_cooldown; then
        echo "[acme-check] All checks passed (incl. cooldown). Safer to press Enter in Certbot — LE may still use unseen paths; if it fails, increase cooldown and retry."
        exit 0
      fi
    else
      echo "[acme-check] Not all targets match yet; sleeping ${local_sleep}s."
    fi
    sleep "$local_sleep"
  done
  echo "[acme-check] TIMEOUT after $local_loops attempts."
  exit 1
fi

if check_once; then
  echo "[acme-check] All targets match (no cooldown; use --wait before Certbot for stricter checks + cooldown)."
  exit 0
fi
echo "[acme-check] Mismatch on at least one target. Do NOT press Enter in Certbot yet."
exit 1
