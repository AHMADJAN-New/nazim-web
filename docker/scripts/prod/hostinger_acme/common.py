#!/usr/bin/env python3
"""Shared helpers for Hostinger DNS-01 certbot hooks."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://developers.hostinger.com/api/dns/v1/zones"
STATE_PATH = "/tmp/certbot-hostinger-acme-tokens.json"
DEFAULT_TTL = 60
PUBLIC_DNS_CHECKERS = (
    "https://dns.google/resolve?name={name}&type=TXT",
    "https://cloudflare-dns.com/dns-query?name={name}&type=TXT",
)


def log(msg: str) -> None:
    print(f"[hostinger-acme] {msg}", flush=True)


def require_token() -> str:
    token = (
        os.environ.get("HOSTINGER_API_TOKEN")
        or os.environ.get("hostinger_api_key")
        or ""
    ).strip()
    if not token:
        log("ERROR: HOSTINGER_API_TOKEN is not set (add it to docker/env/compose.prod.env)")
        sys.exit(1)
    return token


def domain_from_env() -> str:
    # CERTBOT_DOMAIN may be "*.nazim.cloud" — zone is the apex DOMAIN env / parent.
    apex = (os.environ.get("DOMAIN") or "").strip().lstrip(".")
    certbot_domain = (os.environ.get("CERTBOT_DOMAIN") or "").strip()
    if apex:
        return apex
    if certbot_domain.startswith("*."):
        return certbot_domain[2:]
    return certbot_domain


def http_json(
    method: str,
    url: str,
    token: str | None = None,
    body: dict | None = None,
    accept: str = "application/json",
) -> tuple[int, object]:
    data = None
    headers = {"Accept": accept, "User-Agent": "nazim-hostinger-acme/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8") or "null"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return e.code, parsed


def load_state() -> list[str]:
    if not os.path.exists(STATE_PATH):
        return []
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("tokens") or [])
    except (OSError, json.JSONDecodeError):
        return []


def save_state(tokens: list[str]) -> None:
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump({"tokens": tokens}, f)


def delete_acme_txt(domain: str) -> None:
    token = require_token()
    code, resp = http_json(
        "DELETE",
        f"{API_BASE}/{urllib.parse.quote(domain)}",
        token=token,
        body={"filters": [{"name": "_acme-challenge", "type": "TXT"}]},
    )
    if code >= 400:
        log(f"WARN: delete _acme-challenge failed ({code}): {resp}")
    else:
        log(f"Cleared _acme-challenge TXT for {domain}")


def set_acme_txt(domain: str, tokens: list[str], ttl: int = DEFAULT_TTL) -> None:
    token = require_token()
    unique = []
    for t in tokens:
        t = t.strip()
        if t and t not in unique:
            unique.append(t)
    if not unique:
        delete_acme_txt(domain)
        return

    body = {
        "overwrite": True,
        "zone": [
            {
                "name": "_acme-challenge",
                "type": "TXT",
                "ttl": ttl,
                "records": [{"content": t} for t in unique],
            }
        ],
    }
    code, resp = http_json(
        "PUT",
        f"{API_BASE}/{urllib.parse.quote(domain)}",
        token=token,
        body=body,
    )
    if code >= 400:
        log(f"ERROR updating DNS ({code}): {resp}")
        sys.exit(1)
    log(f"Set _acme-challenge TXT on {domain} ttl={ttl} tokens={unique}")


def normalize_txt(value: str) -> str:
    v = value.strip()
    if v.startswith('"') and v.endswith('"'):
        v = v[1:-1]
    return v


def fetch_txt_via_doh(url_template: str, name: str) -> set[str]:
    url = url_template.format(name=urllib.parse.quote(name, safe="."))
    # Cloudflare DoH requires application/dns-json
    accept = "application/dns-json" if "cloudflare" in url else "application/json"
    code, data = http_json("GET", url, accept=accept)
    if code >= 400 or not isinstance(data, dict):
        return set()
    out: set[str] = set()
    for ans in data.get("Answer") or []:
        if ans.get("type") != 16:
            continue
        out.add(normalize_txt(str(ans.get("data") or "")))
    return out


def wait_for_txt(domain: str, expected: list[str], timeout_sec: int = 300) -> None:
    name = f"_acme-challenge.{domain}"
    want = {normalize_txt(t) for t in expected}
    log(f"Waiting for public DNS to show exactly: {sorted(want)} (timeout {timeout_sec}s)")
    deadline = time.time() + timeout_sec
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        seen: set[str] = set()
        ok_all = True
        for checker in PUBLIC_DNS_CHECKERS:
            got = fetch_txt_via_doh(checker, name)
            seen |= got
            if got != want:
                ok_all = False
        if ok_all and want:
            # Short extra settle for LE secondary vantage points
            cooldown = int(os.environ.get("ACME_TXT_POST_OK_COOLDOWN_SEC", "90"))
            log(f"Public resolvers match. Cooldown {cooldown}s for LE secondary validation...")
            time.sleep(max(0, cooldown))
            # Re-check once
            still_ok = True
            for checker in PUBLIC_DNS_CHECKERS:
                if fetch_txt_via_doh(checker, name) != want:
                    still_ok = False
                    break
            if still_ok:
                log("DNS propagation confirmed.")
                return
            log("Post-cooldown mismatch; continuing to wait...")
        else:
            log(f"try {attempt}: seen={sorted(seen) or ['(none)']} want={sorted(want)}")
        time.sleep(10)
    log("ERROR: timed out waiting for TXT propagation")
    sys.exit(1)
