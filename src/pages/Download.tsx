import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Shield, Download as DownloadIcon, Lock, Clock, AlertCircle, FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  derivePINKey,
  decryptFileKey,
  decryptFile,
  formatBytes,
  base64ToArrayBuffer,
} from "@/lib/crypto";

interface FileMetadata {
  id: string;
  filename: string;
  mime: string | null;
  size: number;
  expires_at: string;
  max_attempts: number;
  attempts: number;
  one_time: boolean;
}

export default function Download() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileId) {
      fetchMetadata();
    }
  }, [fileId]);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("files")
        .select("id, filename, mime, size, expires_at, max_attempts, attempts, one_time")
        .eq("id", fileId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("This file has expired and is no longer available.");
        return;
      }

      // Check if attempts exhausted
      if (data.attempts >= data.max_attempts) {
        setError("Maximum download attempts exceeded for this file.");
        return;
      }

      setMetadata(data);
    } catch (err: any) {
      console.error("[Download] Error fetching metadata:", err);
      setError("File not found or has been deleted.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pin || pin.length !== 6) {
      toast.error("Please enter a valid 6-digit PIN");
      return;
    }

    if (!metadata) return;

    try {
      setDownloading(true);
      setProgress(10);

      console.log("[Download] Validating PIN with edge function...");
      
      // Call edge function to validate PIN
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-pin",
        {
          body: { fileId: metadata.id, pin },
        }
      );

      if (validationError) {
        console.error('[Download] Edge function returned error:', validationError);
        // Include status if available for better debugging
        const statusInfo = (validationError as any).status ? ` (status ${ (validationError as any).status })` : '';
        throw new Error(`${validationError.message || 'Edge function error'}${statusInfo}`);
      }

      if (!validationData.success) {
        throw new Error(validationData.error || "Invalid PIN");
      }

      setProgress(30);

      console.log("[Download] PIN validated! Decrypting file key...");

      // Convert arrays back to Uint8Array
      const encFileKeyArray = new Uint8Array(validationData.encFileKey);
      const pinSaltArray = new Uint8Array(validationData.pinSalt);

      // Extract IV and encrypted key (IV is first 12 bytes)
      const keyIv = encFileKeyArray.slice(0, 12);
      const encryptedKeyData = encFileKeyArray.slice(12);

      // Derive PIN key
      const pinDerivedKey = await derivePINKey(pin, pinSaltArray);
      setProgress(40);

      // Decrypt file key
      const fileKey = await decryptFileKey(
        encryptedKeyData.buffer,
        pinDerivedKey,
        keyIv
      );
      setProgress(50);

      console.log("[Download] Downloading encrypted file...");

      // Download encrypted file from signed URL
      const response = await fetch(validationData.downloadUrl);
      if (!response.ok) throw new Error("Failed to download file");

      const encryptedBlob = await response.arrayBuffer();
      setProgress(70);

      console.log("[Download] Decrypting file...");

      // Extract IV and encrypted data (IV is first 12 bytes)
      const fileIv = new Uint8Array(encryptedBlob.slice(0, 12));
      const encryptedFileData = encryptedBlob.slice(12);

      // Decrypt file
      const decryptedData = await decryptFile(encryptedFileData, fileKey, fileIv);
      setProgress(90);

      console.log("[Download] File decrypted! Initiating download...");

      // Create blob and download
      const blob = new Blob([decryptedData], { type: validationData.mime || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = validationData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);

      toast.success("File downloaded successfully!", {
        description: validationData.oneTime ? "This was a one-time download." : undefined,
      });

      if (validationData.oneTime) {
        setTimeout(() => {
          setError("This file has been deleted after download.");
        }, 2000);
      }
    } catch (err: any) {
      console.error("[Download] Error:", err);
      
      // Handle specific errors
      if (err.message.includes("Invalid PIN")) {
        const remaining = metadata.max_attempts - metadata.attempts - 1;
        toast.error("Invalid PIN", {
          description: remaining > 0 ? `${remaining} attempts remaining` : "No attempts remaining",
        });
        if (remaining <= 0) {
          setError("Maximum download attempts exceeded.");
        }
      } else if (err.message.includes("expired")) {
        setError("This file has expired.");
      } else if (err.message.includes("Too many attempts")) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Download failed", { description: err.message });
      }

      setProgress(0);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading file information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card/50 backdrop-blur border-destructive/30">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">File Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  const expiryText = metadata
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(metadata.expires_at))
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SecureShare</h1>
              <p className="text-xs text-muted-foreground">End-to-end encrypted file sharing</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Download File</h2>
            <p className="text-muted-foreground">Enter the PIN to decrypt and download</p>
          </div>

          {/* File info card */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-encrypted flex items-center justify-center flex-shrink-0 shadow-encrypted">
                <FileIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{metadata?.filename}</h3>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <DownloadIcon className="w-4 h-4" />
                    <span>{metadata ? formatBytes(metadata.size) : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Expires: {expiryText}</span>
                  </div>
                  {metadata?.one_time && (
                    <div className="flex items-center gap-2 text-secondary">
                      <Lock className="w-4 h-4" />
                      <span>One-time download</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* PIN input */}
          <Card className="p-6 bg-card/50 backdrop-blur">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  6-Digit PIN
                </Label>
                <Input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  disabled={downloading}
                  className="text-center text-2xl font-mono tracking-widest"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pin.length === 6) {
                      handleDownload();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {metadata && metadata.attempts > 0 && (
                    <span className="text-destructive">
                      {metadata.max_attempts - metadata.attempts} attempts remaining
                    </span>
                  )}
                </p>
              </div>

              {downloading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {progress < 40
                      ? "Validating PIN..."
                      : progress < 70
                      ? "Downloading..."
                      : "Decrypting..."}
                  </p>
                </div>
              )}

              <Button
                onClick={handleDownload}
                disabled={pin.length !== 6 || downloading}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
                size="lg"
              >
                <Lock className="w-4 h-4 mr-2" />
                {downloading ? "Decrypting..." : "Decrypt & Download"}
              </Button>
            </div>
          </Card>

          {/* Security info */}
          <div className="bg-card/30 border border-border/50 rounded-lg p-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p>
                This file is encrypted end-to-end. Your PIN decrypts the file key in your browser.
                The server never sees your PIN or decrypted content.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
