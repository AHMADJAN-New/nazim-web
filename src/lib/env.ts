import { z } from 'zod';

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const raw = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
    VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined,
  };

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Flatten messages for easier debugging in development
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}

export const env = loadEnv();


