# E2E and stress tests (Playwright)

## Attendance scan stress test

Simulates **1000 attendance scans** from the web UI to stress-test the attendance flow. Uses a shuffled mix of:

- **Valid card numbers:** 1–748 (matches students in your org)
- **Invalid card numbers:** 0, 749, 750, 999, 1000, abc, wrong, invalid, etc.

### Prerequisites

1. **Start the frontend** so the test can open the app:
   ```bash
   npm run dev
   ```
   Leave it running (default: http://localhost:5173). In another terminal, run the stress test.

2. **Backend running** (e.g. `php artisan serve`) so login and scan API work.

3. **At least one open attendance session** for the school you log in with.

4. **Credentials** for a user that has `attendance_sessions.read` and can mark attendance. Prefer a **regular org user** (with a default school) rather than platform admin; platform admin may lack school context and the app can redirect after the first request.

### Run the stress test

```bash
cd frontend

# Install Playwright (first time only)
npm install
npx playwright install chromium

# Run the stress test (set credentials)
LOGIN_EMAIL=your@email.com LOGIN_PASSWORD=yourpassword npm run test:e2e:stress

# Optional: use a specific session and base URL
BASE_URL=http://localhost:5173 \
  LOGIN_EMAIL=your@email.com \
  LOGIN_PASSWORD=yourpassword \
  ATTENDANCE_SESSION_ID=uuid-of-open-session \
  npm run test:e2e:stress

# Stress test runs in headed mode by default (browser window opens).
# For headless (no window): npm run test:e2e:stress:headless
```

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOGIN_EMAIL` | Yes | — | User email for login |
| `LOGIN_PASSWORD` | Yes | — | User password |
| `BASE_URL` | No | `https://localhost:5173` | Frontend URL (use https if your dev server uses SSL) |
| `ATTENDANCE_SESSION_ID` | No | — | Open session ID; if omitted, the first open session on the page is used |

### Troubleshooting

- **ERR_EMPTY_RESPONSE or ERR_CONNECTION_REFUSED**  
  The frontend must be running before you start the test. In a separate terminal run `npm run dev` and wait until it prints the local URL. If your app is served over **HTTPS** (e.g. `https://localhost:5173`), the test default is already `https://localhost:5173` and SSL errors are ignored. If you use HTTP or another port, set `BASE_URL` (e.g. `$env:BASE_URL="http://localhost:5174"`).

- **Browser closes immediately on failure**  
  On failure the test now runs `page.pause()` so the browser (and Playwright Inspector) stay open and you can inspect the page or try a manual refresh.

### Output

The test logs progress every 100 scans and prints a summary:

- Total scans: 1000
- Success (2xx): count of accepted scans (valid cards, duplicate scans may still return 2xx)
- Errors: count of 4xx/5xx or timeouts
- Duration and scans/sec
