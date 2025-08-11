import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const getCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
});

type ImportJob = {
  status: 'processing' | 'completed';
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
};

const jobs = new Map<string, ImportJob>();

const requiredFields = [
  'student_id',
  'full_name',
  'date_of_birth',
  'gender',
  'email',
  'phone',
  'guardian_name',
  'guardian_phone',
  'address',
  'class_name',
  'admission_date',
  'blood_group'
];

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });
}

  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authenticated caller has required role (admin or staff)
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('authorization') || '' } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const allowedRoles = new Set(['super_admin', 'admin', 'staff']);
    if (!profile || !allowedRoles.has((profile as any).role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return new Response(
          JSON.stringify({ error: 'File is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Basic file size guard (5MB)
      // @ts-ignore - Deno File has size
      const fileSize = (file as any).size ?? 0;
      if (fileSize > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'File too large (max 5MB)' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const buffer = await file.arrayBuffer();
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const jobId = crypto.randomUUID();
      const job: ImportJob = {
        status: 'processing',
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };
      jobs.set(jobId, job);

      // Audit start
      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'import_students_start',
        entity_type: 'students',
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        new_values: { file_name: file.name }
      } as any);

      (async () => {
        let rows: any[] = [];
        try {
          if (fileExt === 'xlsx') {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { raw: false });
          } else {
            const text = new TextDecoder().decode(buffer);
            rows = parseCsv(text);
          }
        } catch (e) {
          job.status = 'completed';
          job.errors.push('Failed to parse file');
          jobs.set(jobId, job);
          return;
        }

        // Limit rows
        const MAX_ROWS = 2000;
        if (rows.length > MAX_ROWS) {
          job.status = 'completed';
          job.total = rows.length;
          job.errors.push(`Too many rows: ${rows.length} (max ${MAX_ROWS})`);
          jobs.set(jobId, job);
          return;
        }

        job.total = rows.length;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const missing = requiredFields.filter(f => !row[f]);
          if (missing.length > 0) {
            job.failed++;
            job.errors.push(`Row ${i + 2}: Missing fields: ${missing.join(', ')}`);
          } else {
            const { error } = await supabase.from('students').insert({
              student_id: row.student_id,
              full_name: row.full_name,
              date_of_birth: row.date_of_birth,
              gender: row.gender,
              email: row.email,
              phone: row.phone,
              guardian_name: row.guardian_name,
              guardian_phone: row.guardian_phone,
              address: row.address,
              class_name: row.class_name,
              admission_date: row.admission_date,
              blood_group: row.blood_group
            });
            if (error) {
              job.failed++;
              job.errors.push(`Row ${i + 2}: ${error.message}`);
            } else {
              job.successful++;
            }
          }
          job.processed = i + 1;
          jobs.set(jobId, job);
        }
        job.status = 'completed';
        jobs.set(jobId, job);

        // Audit end
        await supabase.from('audit_logs').insert({
          user_id: authData.user.id,
          action: 'import_students_complete',
          entity_type: 'students',
          ip_address: req.headers.get('x-forwarded-for'),
          user_agent: req.headers.get('user-agent'),
          new_values: { jobId, successful: job.successful, failed: job.failed }
        } as any);
      })();

      return new Response(
        JSON.stringify({ jobId }),
        { status: 202, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const jobId = url.searchParams.get('jobId') || '';
      if (!jobs.has(jobId)) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      return new Response(
        JSON.stringify(jobs.get(jobId)),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
