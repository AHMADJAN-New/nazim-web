# Troubleshooting Guide

## "Failed to fetch" Error

If you're getting "Failed to fetch" errors when trying to use the application, follow these steps:

### 1. Verify Supabase is Running

```bash
supabase status
```

You should see:
```
supabase local development setup is running.
```

If not, start Supabase:
```bash
supabase start
```

### 2. Check Environment Variables

Verify your `.env` file has the correct values:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
```

**Important:** After changing `.env` file, you **must restart the Vite dev server**:

```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 3. Test Supabase Connection

Open your browser's developer console (F12) and check:

1. **Console logs** - Look for:
   - `✅ Supabase client initialized:` - Should show the URL
   - Any error messages with details

2. **Network tab** - Check if requests to `http://127.0.0.1:54321` are:
   - Being made
   - Returning errors
   - Being blocked by CORS

### 4. Common Issues and Solutions

#### Issue: "Failed to fetch" on all requests

**Solution:**
- Restart Supabase: `supabase stop && supabase start`
- Restart Vite dev server: Stop (Ctrl+C) and run `npm run dev` again
- Clear browser cache and localStorage

#### Issue: CORS errors in browser console

**Solution:**
- Supabase local setup should handle CORS automatically
- If you see CORS errors, try accessing via `http://localhost:8080` instead of `127.0.0.1:8080`
- Or update `.env` to use `http://localhost:54321` instead of `http://127.0.0.1:54321`

#### Issue: Environment variables not loading

**Solution:**
1. Make sure `.env` file is in the project root (same directory as `package.json`)
2. Restart the Vite dev server after changing `.env`
3. Check browser console for: `❌ Supabase configuration error:` - this means env vars aren't loading

#### Issue: Port conflicts

**Solution:**
- Supabase uses ports: 54321 (API), 54322 (DB), 54323 (Studio)
- Vite uses port: 8080
- If ports are in use, stop other services or change ports in config

### 5. Verify Database Connection

Test if you can connect to the database:

```bash
# Check if user exists
docker exec supabase_db_wkrzoelctjwpiwdswmdj psql -U postgres -d postgres -c "SELECT email, role FROM auth.users u JOIN public.profiles p ON u.id = p.id WHERE email = 'admin@nazim.local';"
```

### 6. Reset Everything

If nothing works, reset Supabase:

```bash
# Stop and remove all containers
supabase stop --no-backup

# Start fresh
supabase start

# Re-seed admin user
Get-Content supabase\migrations\20250128000000_seed_super_admin.sql | docker exec -i supabase_db_wkrzoelctjwpiwdswmdj psql -U postgres -d postgres
```

### 7. Check Browser Console

The enhanced error handling will show detailed error messages. Look for:
- `❌ Supabase fetch error:` - Shows the exact URL and error
- Network error details
- Connection timeout messages

### Still Having Issues?

1. Check Supabase logs: `supabase logs`
2. Check Docker containers: `docker ps`
3. Verify firewall isn't blocking localhost connections
4. Try accessing Supabase Studio: http://127.0.0.1:54323

