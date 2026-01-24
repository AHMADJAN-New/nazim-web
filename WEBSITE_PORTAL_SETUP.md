# Public Website Portal Setup (Subdomains + Custom Domains)

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

### DNS setup
Create a wildcard DNS record:

```
*.nazim.cloud  ->  your-load-balancer-ip
```

This allows any school slug to resolve to the public website portal.

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

## Notes
- Public website access is enabled only for **Complete** and **Enterprise** plans.
- If the feature is not enabled, public endpoints return a clear upgrade-required response.
