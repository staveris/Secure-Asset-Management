import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred during verification.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="verify-email-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === "success" && <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />}
            {status === "error" && <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />}
          </div>
          <h1 className="text-xl font-bold" data-testid="text-verify-title">
            {status === "loading" && "Verifying your email..."}
            {status === "success" && "Email Verified"}
            {status === "error" && "Verification Failed"}
          </h1>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground" data-testid="text-verify-message">{message}</p>
          {status === "success" && (
            <Button onClick={() => navigate("/")} data-testid="button-go-to-dashboard">
              Go to Dashboard
            </Button>
          )}
          {status === "error" && (
            <div className="space-y-2">
              <Button variant="outline" onClick={() => navigate("/")} data-testid="button-go-to-login">
                <Mail className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
