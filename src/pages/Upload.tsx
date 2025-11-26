import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
import ShareModal from "@/components/ShareModal";

export default function Upload() {
  const navigate = useNavigate();
  const [shareData, setShareData] = useState<{
    fileId: string;
    pin: string;
    filename: string;
    expiresAt: Date;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  const handleShareCreated = (data: {
    fileId: string;
    pin: string;
    filename: string;
    expiresAt: Date;
  }) => {
    setShareData(data);
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SecureShare</h1>
              <p className="text-xs text-muted-foreground">End-to-end encrypted file sharing</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Upload & Encrypt File</h2>
            <p className="text-muted-foreground">
              Files are encrypted client-side before upload. Server never sees your data.
            </p>
          </div>

          <FileUpload onShareCreated={handleShareCreated} />

          {/* How it works */}
          <div className="bg-card/30 border border-border/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              How it works
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-mono font-bold text-primary">1.</span>
                <span>
                  Your file is encrypted in your browser with AES-256-GCM using a random key
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono font-bold text-primary">2.</span>
                <span>
                  A 6-digit PIN is generated and used to encrypt the file key via PBKDF2 (200k iterations)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono font-bold text-primary">3.</span>
                <span>
                  Only the encrypted file and encrypted key are uploaded. Server cannot decrypt anything.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono font-bold text-primary">4.</span>
                <span>
                  Recipients must enter the PIN to decrypt the key client-side and download the file
                </span>
              </li>
            </ol>
          </div>
        </div>
      </main>

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        shareData={shareData}
      />
    </div>
  );
}
