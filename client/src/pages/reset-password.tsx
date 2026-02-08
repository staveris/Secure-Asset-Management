import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { KeyRound, CheckCircle, ArrowLeft } from "lucide-react";

function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = rules.filter(r => r.met).length;
  const strengthPct = (metCount / rules.length) * 100;
  const strengthColor = metCount <= 2 ? "bg-red-500" : metCount <= 3 ? "bg-yellow-500" : metCount <= 4 ? "bg-blue-500" : "bg-green-500";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2" data-testid="password-strength">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strengthPct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map((rule) => (
          <p key={rule.label} className={`text-xs ${rule.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {rule.met ? "\u2713" : "\u2022"} {rule.label}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const isPasswordValid = password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast({ title: "Weak password", description: "Please meet all password requirements", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are identical", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      const data = await res.json();
      setSuccess(true);
      toast({ title: "Password Reset", description: data.message });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground" data-testid="text-no-token">
              Invalid reset link. Please request a new password reset from the login page.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold" data-testid="text-reset-success-title">Password Reset Successfully</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-reset-success-message">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-go-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle data-testid="text-reset-title">Set New Password</CardTitle>
          <CardDescription data-testid="text-reset-description">
            Enter your new password below. Make sure it meets the security requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-reset-password">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                data-testid="input-reset-password"
              />
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                data-testid="input-reset-confirm-password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 dark:text-green-400">Passwords match</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isPasswordValid || !passwordsMatch} data-testid="button-reset-submit">
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm text-primary hover:underline"
                data-testid="link-back-to-login"
              >
                Back to Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
