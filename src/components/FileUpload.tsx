import { useState, useRef } from "react";
import { Upload, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateFileKey,
  encryptFile,
  generatePIN,
  generateSalt,
  derivePINKey,
  encryptFileKey,
  hashPIN,
  exportKey,
  arrayBufferToBase64,
} from "@/lib/crypto";

interface FileUploadProps {
  onShareCreated: (shareData: {
    fileId: string;
    pin: string;
    filename: string;
    expiresAt: Date;
  }) => void;
}

export default function FileUpload({ onShareCreated }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ttl, setTtl] = useState("10"); // minutes
  const [oneTime, setOneTime] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState("10");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      // Step 1: Generate random file encryption key (AES-256)
      console.log("[Upload] Generating file encryption key...");
      const fileKey = await generateFileKey();
      setProgress(20);

      // Step 2: Encrypt file with fileKey (client-side)
      console.log("[Upload] Encrypting file client-side...");
      const { encryptedData, iv } = await encryptFile(file, fileKey);
      setProgress(40);

      // Step 3: Generate 6-digit PIN and salt
      console.log("[Upload] Generating PIN...");
      const pin = generatePIN();
      const pinSalt = generateSalt();
      setProgress(50);

      // Step 4: Derive key from PIN
      console.log("[Upload] Deriving PIN key with PBKDF2...");
      const pinDerivedKey = await derivePINKey(pin, pinSalt);
      setProgress(60);

      // Step 5: Encrypt fileKey with PIN-derived key
      console.log("[Upload] Encrypting file key with PIN...");
      const { encryptedFileKey, iv: keyIv } = await encryptFileKey(
        fileKey,
        pinDerivedKey
      );
      setProgress(70);

      // Step 6: Hash PIN for server verification
      const pinHash = await hashPIN(pin, pinSalt);

      // Step 7: Combine encrypted data with IV for storage
      const encryptedBlob = new Blob([
        new Uint8Array(iv.buffer) as any,
        new Uint8Array(encryptedData) as any
      ]);

      // Step 8: Upload encrypted file to Supabase Storage
      console.log("[Upload] Uploading encrypted file to storage...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Must be authenticated to upload files");
      }

      const storagePath = `${user.id}/${crypto.randomUUID()}`;
      const { error: uploadError } = await supabase.storage
        .from("encrypted-files")
        .upload(storagePath, encryptedBlob);

      if (uploadError) throw uploadError;
      setProgress(85);

      // Step 9: Calculate expiry
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(ttl));

      // Step 10: Store metadata in database (with encrypted fileKey)
      console.log("[Upload] Saving metadata to database...");
      
      // Combine encrypted key with its IV
      const encFileKeyWithIv = new Uint8Array(keyIv.length + encryptedFileKey.byteLength);
      encFileKeyWithIv.set(keyIv, 0);
      encFileKeyWithIv.set(new Uint8Array(encryptedFileKey), keyIv.length);

      // Convert Uint8Arrays to regular arrays for Supabase
      const encFileKeyArray = Array.from(encFileKeyWithIv);
      const pinSaltArray = Array.from(pinSalt);

      const { data: fileRecord, error: dbError } = await supabase
        .from("files")
        .insert([{
          uploader_id: user.id,
          storage_path: storagePath,
          filename: file.name,
          mime: file.type,
          size: file.size,
          enc_file_key: encFileKeyArray as any,
          pin_salt: pinSaltArray as any,
          pin_hash: pinHash,
          max_attempts: parseInt(maxAttempts),
          expires_at: expiresAt.toISOString(),
          one_time: oneTime,
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      console.log("[Upload] Upload complete! File ID:", fileRecord.id);

      toast.success("File encrypted and uploaded successfully!", {
        description: "Your 6-digit PIN is ready",
      });

      // Pass share data to parent
      onShareCreated({
        fileId: fileRecord.id,
        pin,
        filename: file.name,
        expiresAt,
      });

      // Reset
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("[Upload] Error:", error);
      toast.error("Upload failed", {
        description: error.message,
      });
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-8 bg-card/50 backdrop-blur border-primary/20">
      <div className="space-y-6">
        {/* Security badges */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Lock className="w-4 h-4" />
            <span>Server never sees plaintext</span>
          </div>
        </div>

        {/* Drag & drop area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-300
            ${file
              ? "border-secondary bg-secondary/10"
              : "border-border hover:border-primary bg-muted/30"
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${file ? "text-secondary" : "text-muted-foreground"}`} />
          {file ? (
            <div>
              <p className="text-lg font-medium text-secondary mb-1">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium mb-2">Drop file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Maximum file size: 500 MB</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Expires in</Label>
            <Select value={ttl} onValueChange={setTtl}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max PIN attempts</Label>
            <Select value={maxAttempts} onValueChange={setMaxAttempts}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 attempts</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
                <SelectItem value="10">10 attempts</SelectItem>
                <SelectItem value="20">20 attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="one-time">Delete after first download</Label>
          <Switch id="one-time" checked={oneTime} onCheckedChange={setOneTime} />
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {progress < 40 ? "Encrypting file..." : progress < 85 ? "Uploading..." : "Finalizing..."}
            </p>
          </div>
        )}

        {/* Upload button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-gradient-primary hover:shadow-glow transition-all"
          size="lg"
        >
          {uploading ? "Encrypting & Uploading..." : "Encrypt & Upload"}
        </Button>
      </div>
    </Card>
  );
}
