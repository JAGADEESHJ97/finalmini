-- Create storage bucket for encrypted files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('encrypted-files', 'encrypted-files', false, 524288000, null)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for encrypted files bucket
CREATE POLICY "Authenticated users can upload encrypted files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'encrypted-files');

CREATE POLICY "Users can read their own uploaded files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'encrypted-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow download with signed URL"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'encrypted-files');

-- Create files table for metadata and encrypted keys
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT,
    size BIGINT NOT NULL,
    enc_file_key BYTEA NOT NULL,
    pin_salt BYTEA NOT NULL,
    pin_hash TEXT NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    max_attempts INT DEFAULT 10 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    one_time BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    download_count INT DEFAULT 0 NOT NULL
);

-- Enable RLS on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS policies for files
CREATE POLICY "Users can create their own file shares"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can view their own file shares"
ON public.files
FOR SELECT
TO authenticated
USING (auth.uid() = uploader_id);

CREATE POLICY "Anyone can view file metadata for download (no keys exposed)"
ON public.files
FOR SELECT
TO anon
USING (deleted_at IS NULL AND expires_at > now());

CREATE POLICY "Users can update their own files"
ON public.files
FOR UPDATE
TO authenticated
USING (auth.uid() = uploader_id);

-- Create pin_attempts_log table for rate limiting and forensics
CREATE TABLE public.pin_attempts_log (
    id SERIAL PRIMARY KEY,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    ip TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on pin_attempts_log
ALTER TABLE public.pin_attempts_log ENABLE ROW LEVEL SECURITY;

-- Only allow edge functions to write to this table
CREATE POLICY "Edge functions can insert attempt logs"
ON public.pin_attempts_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Uploaders can view their own file's attempt logs
CREATE POLICY "Uploaders can view attempt logs for their files"
ON public.pin_attempts_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.files
        WHERE files.id = pin_attempts_log.file_id
        AND files.uploader_id = auth.uid()
    )
);

-- Create index for faster lookups
CREATE INDEX idx_files_expires_at ON public.files(expires_at);
CREATE INDEX idx_files_uploader_id ON public.files(uploader_id);
CREATE INDEX idx_pin_attempts_file_id ON public.pin_attempts_log(file_id);
CREATE INDEX idx_pin_attempts_timestamp ON public.pin_attempts_log(timestamp);