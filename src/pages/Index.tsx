import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap, Clock, Eye, FileCheck } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10"></div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mx-auto">
              <Shield className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Share Files Securely
              <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                End-to-End Encrypted
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Military-grade encryption happens in your browser. Server never sees your files or
              keys. Protected by 6-digit PIN with PBKDF2 key derivation.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="bg-gradient-primary hover:shadow-glow transition-all text-lg px-8"
              >
                <Lock className="w-5 h-5 mr-2" />
                Get Started
              </Button>
              <Button onClick={() => navigate("/auth")} size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex gap-6 justify-center flex-wrap text-sm">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="w-4 h-4" />
                <span>AES-256-GCM</span>
              </div>
              <div className="flex items-center gap-2 text-secondary">
                <Lock className="w-4 h-4" />
                <span>PBKDF2 200k iterations</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>Zero-knowledge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why SecureShare?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built from the ground up with security and privacy as the foundation
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Client-Side Encryption</h3>
              <p className="text-muted-foreground">
                Files are encrypted in your browser before upload. Server only stores encrypted
                blobs—no plaintext access.
              </p>
            </div>

            <div className="bg-card border border-secondary/20 rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-encrypted flex items-center justify-center shadow-encrypted">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold">PIN Protection</h3>
              <p className="text-muted-foreground">
                6-digit PIN with PBKDF2 key derivation (200k iterations). File keys are encrypted
                with PIN-derived keys.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Auto-Expiry</h3>
              <p className="text-muted-foreground">
                Set custom expiration times (5m to 24h). Files auto-delete after expiry or optional
                one-time download.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Attempt Limiting</h3>
              <p className="text-muted-foreground">
                Configurable max PIN attempts (3-20). Rate limiting and attempt logging prevents
                brute force attacks.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">One-Time Downloads</h3>
              <p className="text-muted-foreground">
                Optional one-time download mode. Files are automatically deleted from storage after
                first successful download.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Zero Knowledge</h3>
              <p className="text-muted-foreground">
                Server architecture ensures we never have access to decryption keys, PINs, or
                plaintext file content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Military-grade cryptography, simplified
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                <span className="text-primary-foreground font-bold">1</span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Upload & Encrypt</h3>
                <p className="text-muted-foreground">
                  Select your file. It's encrypted client-side with AES-256-GCM using a random
                  256-bit key. A 6-digit PIN is generated and used to encrypt the file key via
                  PBKDF2 (200k iterations).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-encrypted flex items-center justify-center flex-shrink-0 shadow-encrypted">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Share Securely</h3>
                <p className="text-muted-foreground">
                  You receive a share link and the 6-digit PIN. Send the link via email/chat and
                  the PIN separately (SMS/phone). Never share them together.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-muted-foreground font-bold">3</span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg mb-2">Download & Decrypt</h3>
                <p className="text-muted-foreground">
                  Recipient enters the PIN. Server validates attempt count and returns encrypted
                  file key. File key is decrypted client-side with PIN, then used to decrypt the
                  file—all in the browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to share securely?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create an account and start sharing files with military-grade encryption
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="bg-gradient-primary hover:shadow-glow transition-all text-lg px-8"
          >
            <Shield className="w-5 h-5 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>SecureShare - End-to-end encrypted file sharing</p>
          <p className="mt-2">Built with security and privacy first</p>
        </div>
      </footer>
    </div>
  );
}
