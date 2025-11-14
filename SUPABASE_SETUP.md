# Supabase Connection Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign in or create a new account
3. Create a new project or select an existing one
4. Wait for the project to finish setting up (takes 1-2 minutes)

## Step 2: Find Your API Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** - This is your `VITE_SUPABASE_URL`
   - **anon public** key - This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Create Your .env File

1. In the root directory of your project, create a file named `.env`
2. Copy the following template and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VAPID_PUBLIC_KEY=
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODU2Nzg5MCwiZXhwIjoxOTU0MTQzODkwfQ.example
VITE_VAPID_PUBLIC_KEY=
```

## Step 4: Restart Your Dev Server

After creating/updating your `.env` file:

1. Stop your current dev server (Ctrl+C)
2. Restart it with: `npm run dev`

The app will now connect to your Supabase instance!

## Step 5: Verify Connection

1. Open your app in the browser (usually http://localhost:8080)
2. Try to sign up or sign in
3. Check the browser console for any connection errors

## Troubleshooting

### Error: "Invalid environment configuration"
- Make sure your `.env` file is in the root directory (same level as `package.json`)
- Check that there are no spaces around the `=` sign
- Make sure you're using the correct keys (anon public key, not service_role key)

### Error: "Failed to fetch" or Network errors
- Verify your Supabase project URL is correct
- Check that your Supabase project is active (not paused)
- Ensure your internet connection is working

### Still having issues?
- Check the browser console for detailed error messages
- Verify your Supabase project has the required database tables set up
- Make sure Row Level Security (RLS) policies are configured correctly

## Security Notes

- ✅ The `anon` key is safe to use in client-side code (it's public)
- ❌ Never commit your `.env` file to git (it's already in `.gitignore`)
- ❌ Never share your `service_role` key (it has admin access)

