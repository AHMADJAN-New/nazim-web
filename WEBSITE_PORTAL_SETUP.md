# Public Website Portal Setup (Subdomains + Custom Domains)

## Permissions and feature (production-safe)

Website portal permissions and the **public_website** feature are seeded by a migration so you do **not** need to run `php artisan db:seed` in production.

- **Migration:** `2026_02_02_120000_seed_website_portal_permissions_and_feature.php`
- **What it does:** Inserts only if missing:
  - Feature definition `public_website` (Public Website Portal)
  - Global permissions for `website_*` and `subscription.admin` / `subscription.read`
  - Per-organization: website permissions, roles (`website_admin`, `website_editor`, `website_media`), and role–permission links
- **When:** Run `php artisan migrate` on deploy (or as part of your normal migration step). The migration is idempotent; safe to run on every deploy.

---

## Subdomain (default)

The public website resolver expects the school slug to be served as a subdomain.

**Example:**
- School slug: `al-huda`
- Public base domain: `nazim.cloud`
- Public URL: `https://al-huda.nazim.cloud`

### Configure the base domain
Set the base domain in your backend `.env`:

```
NAZIM_PUBLIC_SITE_DOMAIN=nazim.cloud
```

For host-based routing (subdomains = public website only, main domain = app + login), the frontend build needs the same base and the main app URL. In production Docker these are taken from `DOMAIN` and `APP_URL` in `docker/env/compose.prod.env` and passed as `VITE_PUBLIC_SITE_DOMAIN` and `VITE_APP_URL` at build time. If you build the frontend separately, set:

- `VITE_PUBLIC_SITE_DOMAIN=nazim.cloud` – base domain (subdomains of this show the public school site only).
- `VITE_APP_URL=https://nazim.cloud` – main app origin (login and dashboard; “Login” on school sites redirects here).

### Reverse proxy requirement (important)
If you run behind Nginx/Cloudflare/ALB, make sure the proxy forwards the original host to Laravel (via `Host` and/or `X-Forwarded-Host`). Public website resolution depends on the visitor hostname (subdomain/custom domain).

### DNS setup (required for subdomains)

**If you see "This site can’t be reached" or "DNS_PROBE_FINISHED_NXDOMAIN" when visiting a school subdomain (e.g. `school-a6e87682.nazim.cloud`), the wildcard DNS record is missing.**

Create a **wildcard** DNS record at your domain registrar (where `nazim.cloud` is managed):

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| **A** | `*` (or `*.nazim.cloud` depending on provider) | Your server IP (same as `nazim.cloud`) | 300 or default |

**Examples by provider:**
- **Cloudflare**: Add record Type `A`, Name `*`, IPv4 address = your server IP, Proxy status optional.
- **Hostinger / Namecheap / GoDaddy**: Add an A record with host `*` (wildcard) pointing to your server IP.

After saving, wait a few minutes (up to 48 hours in rare cases) for DNS to propagate. Then `https://school-a6e87682.nazim.cloud` (and any other `{slug}.nazim.cloud`) will resolve to your server.

```
*.nazim.cloud  ->  your-load-balancer-ip   (conceptual)
```

This allows any school slug to resolve to the public website portal.

### SSL for subdomains (required for HTTPS)

**If you see "Your connection is not private" or "ERR_CERT_COMMON_NAME_INVALID" on subdomains (e.g. `demo.nazim.cloud`, `gd.nazim.cloud`), the server’s certificate does not cover those hostnames.**

The default Let’s Encrypt setup in this project issues a certificate **only for the root domain** (e.g. `nazim.cloud`). Subdomains need either:

1. **Wildcard certificate (recommended)** – One cert for `*.nazim.cloud` and `nazim.cloud`, so all current and future school subdomains are covered.
2. **List every subdomain** – Re-issue the cert with `-d nazim.cloud -d demo.nazim.cloud -d gd.nazim.cloud -d school-a6e87682.nazim.cloud` etc. (not scalable).

**Option 1: Wildcard cert with Let’s Encrypt (DNS-01)**  
Wildcards require the **DNS-01** challenge (not HTTP). You add a TXT record at your DNS provider (e.g. Hostinger), then run certbot.

1. From the project root (with Docker Compose and `docker/env/compose.prod.env` in place), run:
   ```bash
   bash docker/scripts/prod/https_init_wildcard.sh
   ```
2. When the script pauses, it will show something like:
   ```
   Please add a TXT record with the following name and value:
   _acme-challenge.nazim.cloud  →  <long-string>
   ```
3. In **Hostinger** (or your DNS provider): add a **TXT** record:
   - **Name:** `_acme-challenge` (or `_acme-challenge.nazim.cloud` if the provider wants the full name)
   - **Value:** the string certbot printed
   - **TTL:** 300 or default
4. Wait 1–2 minutes for DNS to propagate, then press Enter in the terminal to continue. Certbot will verify and issue `*.nazim.cloud` + `nazim.cloud`.
5. Reload Nginx (the script does this if using the project’s wildcard flow). After that, `https://demo.nazim.cloud`, `https://gd.nazim.cloud`, and any other `https://<slug>.nazim.cloud` will use the same cert and show as secure.

**Option 2: Hostinger / panel SSL**  
If your app is behind Hostinger’s proxy or you manage SSL in the Hostinger panel, request or enable a **wildcard SSL** for `*.nazim.cloud` there and attach it to the same server/proxy that serves Nazim.

**Wildcard cert renewal (manual)**  
The wildcard cert **does not auto-renew**. Cron/`update.sh` and `https_renew.sh` only renew certs that were issued with HTTP-01 (webroot); manual DNS-01 certs are skipped so deploys don’t fail.

- **Before expiry** (e.g. your cert says “expires on 2026-05-03” → renew by late April 2026), run again from the project root:
  ```bash
  bash docker/scripts/prod/https_init_wildcard.sh
  ```
- When certbot pauses, add the **TXT** record it shows at Hostinger (same as first time), wait 1–2 minutes, then press Enter. After that, Nginx is reloaded and the new cert is used.
- Set a calendar or reminder (e.g. every 60 days or 2–3 weeks before the printed expiry) so you don’t forget.

To fully automate renewal you’d need a certbot DNS plugin (e.g. Cloudflare) and `--manual-auth-hook`; for Hostinger DNS, manual renewal with the script above is the supported approach.

### Configure the school slug
Each school must have a `school_slug` (subdomain slug). You can set it from:
- Platform Admin → Website Management → Settings (recommended for platform admins)
- Website Manager → Settings (school admins)

## Custom Domains (Enterprise)

Custom domains can be attached per school using **Website Manager → Domains**.

### Required DNS records
- A record (root): `schooldomain.com` → your load balancer IP
- CNAME (www): `www.schooldomain.com` → `schooldomain.com`

### Verification flow (current)
- Add the domain in Website Manager (status defaults to `pending`).
- Mark as `verified` once DNS is confirmed (future automation can be added).
- SSL status is tracked for operational visibility (e.g., `pending`, `active`).

## Cache & performance
- Public responses are cached server-side for 10 minutes per school.
- Consider a CDN in front of `/api/public/website/*` for static caching.
- Public SEO endpoints are available at `/api/public/website/sitemap.xml` and `/api/public/website/robots.txt`.

## Notes
- Public website access is enabled only for **Complete** and **Enterprise** plans.
- If the feature is not enabled, public endpoints return a clear upgrade-required response.
