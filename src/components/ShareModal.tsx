import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Lock, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: {
    fileId: string;
    pin: string;
    filename: string;
    expiresAt: Date;
  } | null;
}

export default function ShareModal({ open, onOpenChange, shareData }: ShareModalProps) {
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!shareData) return null;

  const shareLink = `${window.location.origin}/download/${shareData.fileId}`;

  const copyPin = () => {
    navigator.clipboard.writeText(shareData.pin);
    setCopiedPin(true);
    toast.success("PIN copied to clipboard");
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const expiryText = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(shareData.expiresAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-secondary" />
            File Encrypted Successfully
          </DialogTitle>
          <DialogDescription>
            Share the link and PIN separately with the recipient
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security warning */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-destructive mb-1">Critical Security Notice</p>
              <p className="text-muted-foreground">
                Send the PIN separately (SMS/chat). Never share the PIN and link together.
              </p>
            </div>
          </div>

          {/* PIN display */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              6-Digit PIN (Send separately)
            </div>
            <div className="relative">
              <div className="bg-gradient-encrypted p-6 rounded-lg border-2 border-secondary/30 shadow-encrypted">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-white tracking-[0.5em] mb-2">
                    {shareData.pin}
                  </div>
                  <div className="text-sm text-white/70">
                    File: {shareData.filename}
                  </div>
                </div>
              </div>
              <Button
                onClick={copyPin}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
              >
                {copiedPin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Share link */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Share Link</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
              <Button onClick={copyLink} variant="outline" size="sm">
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Expiry info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Clock className="w-4 h-4" />
            <span>Expires: {expiryText}</span>
          </div>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
