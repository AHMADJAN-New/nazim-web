# Local HTTPS certificates for dev server (including LAN access)

The Vite dev server uses `cert.pem` and `key.pem` in this folder when present, so you can run over HTTPS (e.g. for camera/geolocation on mobile).

## Why you see "Your connection is not private"

- The certificate is **only valid for the hostname in its Subject / SAN**. If the cert was created for `localhost` only, opening `https://192.168.0.109:5173` will fail because the hostname (the LAN IP) does not match.
- Browsers also require the certificate to be **trusted**. Self-signed certs are not trusted unless you install the CA that signed them.

So you need a certificate that:

1. Includes **Subject Alternative Names (SANs)** for: `localhost`, `127.0.0.1`, and your **LAN IP** (e.g. `192.168.0.109`).
2. Is signed by a CA that your device trusts (e.g. mkcert’s local CA on your machine, and optionally on phones/tablets).

---

## Option 1: mkcert (recommended)

[mkcert](https://github.com/FiloSottile/mkcert) creates a local Certificate Authority and issues certs that your OS/browser will trust.

### 1. Install mkcert

**Windows (Chocolatey):**

```powershell
choco install mkcert
```

**Windows (Scoop):**

```powershell
scoop install mkcert
```

**Or:** download the [latest release](https://github.com/FiloSottile/mkcert/releases) and put `mkcert.exe` on your PATH.

### 2. Install the local CA (once per machine)

```powershell
mkcert -install
```

This adds mkcert’s root CA to your system trust store so browsers accept certs signed by it.

### 3. Create the certificate with LAN IP

From the **project root** (or from `frontend`), create the cert in `frontend/certs` with the names Vite expects. Replace `192.168.0.109` with your actual LAN IP:

**From repo root:**

```powershell
cd "e:\Nazim Production\nazim-web-1\frontend"
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 ::1 192.168.0.109
```

**From `frontend` folder:**

```powershell
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 ::1 192.168.0.109
```

This creates:

- `certs/key.pem` – private key  
- `certs/cert.pem` – certificate valid for `localhost`, `127.0.0.1`, `::1`, and `192.168.0.109`

### 4. Restart the Vite dev server

Restart `npm run dev` (or your dev script). Vite will use the new cert and HTTPS will work for:

- `https://localhost:5173`
- `https://127.0.0.1:5173`
- `https://192.168.0.109:5173`

On the **same PC** where you ran `mkcert -install`, the connection will be trusted (no "Your connection is not private").

---

## Using the app on other devices (phone/tablet on the same LAN)

Browsers on other devices do not have mkcert’s CA installed, so they will still show a warning unless you trust the CA there too.

### Option A: Trust mkcert’s CA on the other device (recommended for testing)

1. On your **dev machine**, find the mkcert root CA:
   - Windows: `%LOCALAPPDATA%\mkcert` (e.g. `C:\Users\<You>\AppData\Local\mkcert`)
   - Files: `rootCA.pem` (cert) and `rootCA-key.pem` (key; keep private)

2. Copy **only** `rootCA.pem` to the phone/tablet (e.g. by email, cloud, or USB).

3. **Android:** Settings → Security → Encryption & credentials → Install a certificate → CA certificate → select `rootCA.pem`.

4. **iOS:** AirDrop or mail the file to the device, open it, follow “Install” and approve in Settings → General → About → Certificate Trust Settings → enable trust for the mkcert root.

After that, `https://192.168.0.109:5173` (or your current LAN IP) should open without a warning on that device.

### Option B: Use the IP in the cert and accept the warning once

- Ensure the cert was created with your LAN IP (e.g. `192.168.0.109`) as in step 3 above.
- On the phone/tablet, open `https://192.168.0.109:5173`.
- You may get “Your connection is not private” / “NET::ERR_CERT_AUTHORITY_INVALID”.
- In Chrome: “Advanced” → “Proceed to 192.168.0.109 (unsafe)”.  
  This is only for local testing; do not use for real data.

---

## Option 2: OpenSSL (no mkcert)

If you prefer not to use mkcert, you can generate a self-signed cert with OpenSSL and add SANs. Browsers will still show a warning unless you import the CA.

1. Create a config file: copy `frontend/certs/openssl-san.cnf.example` to `frontend/certs/openssl-san.cnf`, then set `IP.3` to your LAN IP (e.g. `192.168.0.109`). Or create `openssl-san.cnf` with:

```ini
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Development
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 192.168.0.109
```

(Replace `192.168.0.109` with your LAN IP.)

2. Generate key and cert:

```powershell
cd frontend
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -config certs/openssl-san.cnf -extensions v3_req
```

3. Restart the dev server. You will still need to accept the self-signed cert in the browser (or install the cert as a CA) on each device.

---

## Summary

| Goal | Action |
|------|--------|
| No warning on **this PC** | Use **mkcert**: `mkcert -install` then create cert with `localhost 127.0.0.1 ::1 <LAN_IP>`. |
| No warning on **phone/tablet** | Install mkcert’s `rootCA.pem` on that device (Option A above), or accept the warning once (Option B). |
| Cert must include LAN IP | Always pass the LAN IP (e.g. `192.168.0.109`) when creating the cert (mkcert or OpenSSL SAN). |

The files in this directory (`*.pem`) are gitignored. Regenerate the cert if your LAN IP changes (e.g. after reconnecting to another network).
