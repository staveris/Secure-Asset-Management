import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export default function VerificationPending() {
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.message || "Failed to resend verification email");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="verification-pending-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold" data-testid="text-verification-title">
            Verify Your Email
          </h1>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm" data-testid="text-verification-message">
            We've sent a verification link to <span className="font-medium text-foreground">{user?.email}</span>.
            Please check your inbox and click the link to activate your account.
          </p>
          <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Email verification is required before you can use the platform.</span>
            </div>
          </div>

          {sent && (
            <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-resend-success">
              Verification email sent. Please check your inbox.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-resend-error">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleResend}
              disabled={resending}
              variant="outline"
              data-testid="button-resend-verification"
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Resend Verification Email
            </Button>
            <Button
              variant="ghost"
              onClick={() => logout()}
              data-testid="button-logout-verification"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or click resend above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
