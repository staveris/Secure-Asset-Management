import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, KeyRound, Mail, Save, ShieldCheck, ShieldOff, Copy, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; email?: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile Updated", description: "Your profile has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/password", data);
      return await res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password Changed", description: "Your password has been changed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setupTotpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/totp-setup");
      return await res.json();
    },
    onSuccess: (data: any) => {
      setSetupData({ secret: data.secret, qrCode: data.qrCode });
      setShowSetup2FA(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enableTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/totp-enable", { code });
      return await res.json();
    },
    onSuccess: () => {
      setShowSetup2FA(false);
      setSetupData(null);
      setTotpCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now active on your account." });
    },
    onError: (error: Error) => {
      toast({ title: "Invalid Code", description: error.message, variant: "destructive" });
    },
  });

  const disableTotpMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/totp-disable", { password });
      return await res.json();
    },
    onSuccess: () => {
      setShowDisable2FA(false);
      setDisablePassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed from your account." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    const updates: { fullName?: string; email?: string } = {};
    if (fullName.trim() && fullName !== user?.fullName) updates.fullName = fullName.trim();
    if (email.trim() && email !== user?.email) updates.email = email.trim();
    if (Object.keys(updates).length === 0) {
      toast({ title: "No Changes", description: "No changes detected.", variant: "destructive" });
      return;
    }
    profileMutation.mutate(updates);
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast({ title: "Required", description: "Please enter your current password.", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Validation", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const is2FAEnabled = (user as any)?.totpEnabled === true;

  return (
    <div className="p-6 space-y-6 max-w-2xl" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and security credentials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              data-testid="input-fullname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              data-testid="input-email"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Badge variant="secondary" data-testid="badge-role">{user?.role}</Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Organization</Label>
              <Badge variant="outline" data-testid="badge-org">{(user as any)?.tenantName || "N/A"}</Badge>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={profileMutation.isPending}
            data-testid="button-save-profile"
          >
            <Save className="h-4 w-4 mr-2" />
            {profileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              data-testid="input-current-password"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              data-testid="input-new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              data-testid="input-confirm-password"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={passwordMutation.isPending}
            data-testid="button-change-password"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {passwordMutation.isPending ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account by requiring a verification code from an authenticator app when signing in.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={is2FAEnabled ? "default" : "secondary"} data-testid="badge-2fa-status">
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {is2FAEnabled ? (
              <Button
                variant="destructive"
                onClick={() => setShowDisable2FA(true)}
                data-testid="button-disable-2fa"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            ) : (
              <Button
                onClick={() => setupTotpMutation.mutate()}
                disabled={setupTotpMutation.isPending}
                data-testid="button-setup-2fa"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {setupTotpMutation.isPending ? "Setting up..." : "Enable 2FA"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSetup2FA} onOpenChange={setShowSetup2FA}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-setup-2fa">
          <DialogHeader>
            <DialogTitle data-testid="text-setup-2fa-title">Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>
          {setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={setupData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                  data-testid="img-2fa-qr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Manual entry key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md font-mono break-all" data-testid="text-2fa-secret">
                    {setupData.secret}
                  </code>
                  <Button size="icon" variant="ghost" onClick={handleCopySecret} data-testid="button-copy-secret">
                    {copiedSecret ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="totpCode">Verification Code</Label>
                <Input
                  id="totpCode"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  data-testid="input-totp-setup-code"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowSetup2FA(false); setSetupData(null); setTotpCode(""); }} data-testid="button-cancel-2fa-setup">
              Cancel
            </Button>
            <Button
              onClick={() => enableTotpMutation.mutate(totpCode)}
              disabled={totpCode.length !== 6 || enableTotpMutation.isPending}
              data-testid="button-verify-2fa-setup"
            >
              {enableTotpMutation.isPending ? "Verifying..." : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisable2FA} onOpenChange={setShowDisable2FA}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-disable-2fa">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disablePassword">Password</Label>
            <Input
              id="disablePassword"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter your password"
              data-testid="input-disable-2fa-password"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDisable2FA(false); setDisablePassword(""); }} data-testid="button-cancel-disable-2fa">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableTotpMutation.mutate(disablePassword)}
              disabled={!disablePassword || disableTotpMutation.isPending}
              data-testid="button-confirm-disable-2fa"
            >
              {disableTotpMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
