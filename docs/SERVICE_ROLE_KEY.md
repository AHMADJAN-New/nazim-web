# Service Role Key

**IMPORTANT: Keep this key secure and never commit it to version control!**

## Service Role Key (for reference)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w
```

## Usage

This key should be used for:
- Creating storage buckets via API
- Server-side operations that require elevated permissions
- Administrative tasks

## Security Notes

- ⚠️ **NEVER** expose this key in client-side code
- ⚠️ **NEVER** commit this key to Git
- ⚠️ Store in environment variables on the server only
- ⚠️ Rotate the key if it's ever exposed

## Environment Variable

Add to your `.env` file (server-side only, not in client):

```
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXpmY2Jzem9qemhhYXphZmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODc2NywiZXhwIjoyMDc4Nzk0NzY3fQ.AOP6MvSchNoEiz3GZUxRJODGiNCuBH8hYIoTLg2mb6w
```

**Note:** This file should be in `.gitignore` and never committed to version control.

