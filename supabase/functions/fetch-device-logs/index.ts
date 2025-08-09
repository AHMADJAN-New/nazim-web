import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { ip, port } = await req.json();
    if (!ip || !port) {
      return new Response(
        JSON.stringify({ error: "Missing ip or port" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = `http://${ip}:${port}/logs`;
    const deviceResponse = await fetch(url);
    if (!deviceResponse.ok) {
      throw new Error(`Device request failed: ${deviceResponse.statusText}`);
    }
    const logs = await deviceResponse.json();

    return new Response(
      JSON.stringify({ logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
