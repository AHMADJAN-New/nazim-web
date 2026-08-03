#!/usr/bin/env python3
"""Certbot manual-auth-hook: publish CERTBOT_VALIDATION via Hostinger DNS API."""
from __future__ import annotations

import os
import sys

# Allow `python /hooks/auth-hook.py` when mounted at /hooks
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    DEFAULT_TTL,
    domain_from_env,
    load_state,
    log,
    save_state,
    set_acme_txt,
    wait_for_txt,
)


def main() -> None:
    validation = (os.environ.get("CERTBOT_VALIDATION") or "").strip()
    if not validation:
        log("ERROR: CERTBOT_VALIDATION is empty")
        sys.exit(1)

    domain = domain_from_env()
    if not domain:
        log("ERROR: could not determine apex domain (set DOMAIN=nazim.cloud)")
        sys.exit(1)

    ttl = int(os.environ.get("ACME_TXT_TTL", str(DEFAULT_TTL)))
    tokens = load_state()
    if validation not in tokens:
        tokens.append(validation)
    save_state(tokens)

    log(f"Auth hook for CERTBOT_DOMAIN={os.environ.get('CERTBOT_DOMAIN')} → {domain}")
    set_acme_txt(domain, tokens, ttl=ttl)
    wait_for_txt(domain, tokens)
    log("Auth hook complete — certbot may continue.")


if __name__ == "__main__":
    main()
