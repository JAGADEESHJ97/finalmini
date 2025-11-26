import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidatePINRequest {
  fileId: string;
  pin: string;
}

// Simple rate limiting in memory (for single instance)
const attemptCache = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 attempts per minute

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate required env vars and provide a helpful error if not present
    if (!supabaseUrl || !supabaseKey) {
      console.error('[validate-pin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileId, pin }: ValidatePINRequest = await req.json();
    
    console.log(`[validate-pin] Processing request for file: ${fileId}`);

    if (!fileId || !pin) {
      console.error('[validate-pin] Missing fileId or pin');
      return new Response(
        JSON.stringify({ error: 'Missing fileId or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting by IP and file_id
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}:${fileId}`;
    const now = Date.now();
    
    const cached = attemptCache.get(rateLimitKey);
    if (cached) {
      if (now - cached.timestamp < RATE_LIMIT_WINDOW) {
        if (cached.count >= RATE_LIMIT_MAX) {
          console.warn(`[validate-pin] Rate limit exceeded for ${rateLimitKey}`);
          return new Response(
            JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        cached.count++;
      } else {
        // Reset window
        cached.count = 1;
        cached.timestamp = now;
      }
    } else {
      attemptCache.set(rateLimitKey, { count: 1, timestamp: now });
    }

    // Fetch file metadata
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !file) {
      // Distinguish not found vs DB errors in the logs and response
      console.error('[validate-pin] File not found or DB error:', fetchError);
      const status = fetchError?.status || 404;
      return new Response(
        JSON.stringify({ error: 'File not found or has been deleted' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (new Date(file.expires_at) < new Date()) {
      console.warn('[validate-pin] File expired:', fileId);
      return new Response(
        JSON.stringify({ error: 'File has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts
    if (file.attempts >= file.max_attempts) {
      console.warn('[validate-pin] Max attempts exceeded:', fileId);
      return new Response(
        JSON.stringify({ error: 'Maximum attempts exceeded' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN hash
    // Convert pin_salt from database - could be array or bytea
    let pinSaltArray: Uint8Array;
    
    if (Array.isArray(file.pin_salt)) {
      pinSaltArray = new Uint8Array(file.pin_salt);
    } else if (typeof file.pin_salt === 'string') {
      // If it's a hex string, convert it
      const matches = file.pin_salt.match(/.{1,2}/g) || [];
      pinSaltArray = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
    } else {
      // Assume it's already a Uint8Array or buffer
      pinSaltArray = new Uint8Array(file.pin_salt);
    }
    
    const combined = new Uint8Array([
      ...new TextEncoder().encode(pin),
      ...pinSaltArray,
    ]);
    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    
    const pinValid = computedHash === file.pin_hash;

    // Log attempt
    await supabase.from('pin_attempts_log').insert({
      file_id: fileId,
      ip: clientIP,
      user_agent: req.headers.get('user-agent') || 'unknown',
      success: pinValid,
    });

    if (!pinValid) {
      // Increment attempts
      await supabase
        .from('files')
        .update({ attempts: file.attempts + 1 })
        .eq('id', fileId);

      console.warn('[validate-pin] Invalid PIN for file:', fileId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid PIN',
          attemptsRemaining: file.max_attempts - file.attempts - 1
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PIN valid! Generate signed URL for download
    const { data: signedUrlData, error: signedError } = await supabase
      .storage
      .from('encrypted-files')
      .createSignedUrl(file.storage_path, 120); // 2 minute expiry

    if (signedError || !signedUrlData) {
      console.error('[validate-pin] Error creating signed URL:', signedError, signedUrlData);
      const message = signedError?.message || 'Failed to generate download URL';
      return new Response(
        JSON.stringify({ error: message }),
        { status: signedError?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment download count
    await supabase
      .from('files')
      .update({ 
        download_count: file.download_count + 1,
        // If one-time download, mark as deleted
        ...(file.one_time ? { deleted_at: new Date().toISOString() } : {})
      })
      .eq('id', fileId);

    console.log(`[validate-pin] PIN validated successfully for file: ${fileId}`);

    // Return encrypted file key, salt, and signed URL
    // Convert enc_file_key to array if needed
    let encFileKeyArray: number[];
    if (Array.isArray(file.enc_file_key)) {
      encFileKeyArray = file.enc_file_key;
    } else if (typeof file.enc_file_key === 'string') {
      const matches = file.enc_file_key.match(/.{1,2}/g) || [];
      encFileKeyArray = matches.map(byte => parseInt(byte, 16));
    } else {
      encFileKeyArray = Array.from(new Uint8Array(file.enc_file_key));
    }

    return new Response(
      JSON.stringify({
        success: true,
        encFileKey: encFileKeyArray,
        pinSalt: Array.from(pinSaltArray),
        downloadUrl: signedUrlData.signedUrl,
        filename: file.filename,
        mime: file.mime,
        oneTime: file.one_time,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Avoid leaking sensitive details to the client in production, but log the original error
    console.error('[validate-pin] Unexpected error:', error);
    const errMsg = (error && (error as Error).message) || 'Internal server error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
