#!/usr/bin/env python3
"""Certbot manual-cleanup-hook: remove CERTBOT_VALIDATION from Hostinger DNS."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import (  # noqa: E402
    DEFAULT_TTL,
    domain_from_env,
    load_state,
    log,
    save_state,
    set_acme_txt,
)


def main() -> None:
    validation = (os.environ.get("CERTBOT_VALIDATION") or "").strip()
    domain = domain_from_env()
    if not domain:
        log("WARN: no domain; skipping cleanup")
        return

    ttl = int(os.environ.get("ACME_TXT_TTL", str(DEFAULT_TTL)))
    tokens = [t for t in load_state() if t != validation]
    save_state(tokens)

    log(f"Cleanup hook removing validation for {os.environ.get('CERTBOT_DOMAIN')}")
    if tokens:
        set_acme_txt(domain, tokens, ttl=ttl)
    else:
        # overwrite with empty list triggers delete path in set_acme_txt
        set_acme_txt(domain, [], ttl=ttl)
        try:
            os.remove("/tmp/certbot-hostinger-acme-tokens.json")
        except OSError:
            pass
    log("Cleanup hook complete.")


if __name__ == "__main__":
    main()
