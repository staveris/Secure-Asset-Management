import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle, UserPlus, ShieldCheck } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InviteInfo {
  email: string;
  role: string;
  tenantName: string;
  expiresAt: string;
}

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "valid" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/invite\/([A-Za-z0-9]+)/);
    const rawToken = match?.[1] || "";
    if (!rawToken) {
      setStatus("error");
      setErrorMessage("Invalid invitation link.");
      return;
    }
    setToken(rawToken);

    fetch(`/api/auth/invite/${rawToken}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setInvite(data);
          setStatus("valid");
        } else {
          setStatus("error");
          setErrorMessage(data.message || "This invitation is not valid.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Could not load the invitation. Please try again.");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, fullName, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not accept invitation", description: data.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      toast({ title: "Welcome!", description: `Your account has been created in ${invite?.tenantName}.` });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/dashboard");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="accept-invite-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === "valid" && <UserPlus className="w-12 h-12 text-primary" />}
            {status === "error" && <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />}
          </div>
          <h1 className="text-xl font-bold" data-testid="text-invite-title">
            {status === "loading" && "Loading invitation..."}
            {status === "valid" && `Join ${invite?.tenantName}`}
            {status === "error" && "Invitation Not Valid"}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "error" && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground" data-testid="text-invite-error">{errorMessage}</p>
              <Button variant="outline" onClick={() => navigate("/login")} data-testid="button-go-to-login">
                Go to Login
              </Button>
            </div>
          )}
          {status === "valid" && invite && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center" data-testid="text-invite-details">
                You've been invited as <strong>{invite.role.replace(/_/g, " ")}</strong>. Create your account for{" "}
                <strong>{invite.email}</strong> to get started.
              </p>
              <div className="space-y-2">
                <Label htmlFor="invite-fullname">Full Name</Label>
                <Input
                  id="invite-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  minLength={2}
                  data-testid="input-invite-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  data-testid="input-invite-password"
                />
                <p className="text-xs text-muted-foreground">
                  Must include uppercase, lowercase, a number, and a special character.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm-password">Confirm Password</Label>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  data-testid="input-invite-confirm-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting} data-testid="button-accept-invite">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
