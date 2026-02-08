import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Save, CheckCircle, AlertTriangle } from "lucide-react";

interface EmailSettings {
  provider: string | null;
  hasApiKey?: boolean;
  hasSmtpPass?: boolean;
  smtpUser?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  fromAddress: string | null;
  configured: boolean;
}

export default function AdminEmailSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/admin/email-settings"],
  });

  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || "");
      setFromAddress(settings.fromAddress || "");
      setSmtpUser(settings.smtpUser || "");
      setSmtpHost(settings.smtpHost || "");
      setSmtpPort(settings.smtpPort ? String(settings.smtpPort) : "");
      setApiKey("");
      setSmtpPass("");
    }
  }, [settings]);

  const isSmtpProvider = provider === "gmail" || provider === "smtp";

  const canSave = (() => {
    if (!provider) return false;
    if (provider === "gmail") {
      return !!(smtpUser && (smtpPass || settings?.hasSmtpPass));
    }
    if (provider === "smtp") {
      return !!(smtpHost && smtpUser && (smtpPass || settings?.hasSmtpPass));
    }
    return !!((apiKey || settings?.hasApiKey) && fromAddress);
  })();

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/email-settings", {
        provider,
        apiKey: isSmtpProvider ? undefined : apiKey,
        fromAddress: isSmtpProvider ? (fromAddress || smtpUser) : fromAddress,
        smtpUser: isSmtpProvider ? smtpUser : undefined,
        smtpPass: isSmtpProvider ? smtpPass : undefined,
        smtpHost: provider === "smtp" ? smtpHost : undefined,
        smtpPort: provider === "smtp" ? smtpPort : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-settings"] });
      toast({ title: "Email settings saved", description: "Email configuration has been updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card><CardContent className="p-6"><Skeleton className="h-48" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-email-settings-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-email-settings-title">Email Configuration</h1>
        <p className="text-muted-foreground mt-1">Configure the email provider used for sending verification emails and notifications</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Email Provider Settings</h3>
            </div>
            {settings?.configured ? (
              <Badge variant="secondary" className="text-xs" data-testid="badge-email-configured">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs" data-testid="badge-email-not-configured">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Email Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider" data-testid="select-email-provider">
                <SelectValue placeholder="Select a provider..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail (SMTP)</SelectItem>
                <SelectItem value="sendgrid">SendGrid (API)</SelectItem>
                <SelectItem value="resend">Resend (API)</SelectItem>
                <SelectItem value="smtp">Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "gmail" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Gmail Address</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  data-testid="input-smtp-user"
                />
                <p className="text-xs text-muted-foreground">
                  The Gmail account that will be used to send emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPass">App Password</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  placeholder={settings?.hasSmtpPass ? "Leave blank to keep existing password" : "Enter your Gmail App Password..."}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  data-testid="input-smtp-pass"
                />
                <p className="text-xs text-muted-foreground">
                  You must use a Gmail App Password, not your regular Google password. Go to Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App passwords to generate one.
                  {settings?.hasSmtpPass && " (existing password is stored securely)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromAddress">From Name Display (optional)</Label>
                <Input
                  id="fromAddress"
                  type="text"
                  placeholder="NIS2 Platform"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  data-testid="input-from-address"
                />
                <p className="text-xs text-muted-foreground">
                  Optional display name shown in the "From" field. The sender address will be your Gmail address.
                </p>
              </div>
            </>
          )}

          {provider === "smtp" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  type="text"
                  placeholder="smtp.example.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  data-testid="input-smtp-host"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  data-testid="input-smtp-port"
                />
                <p className="text-xs text-muted-foreground">
                  Common ports: 587 (TLS/STARTTLS), 465 (SSL), 25 (unencrypted)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  type="text"
                  placeholder="user@example.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  data-testid="input-smtp-user"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  placeholder={settings?.hasSmtpPass ? "Leave blank to keep existing password" : "Enter SMTP password..."}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  data-testid="input-smtp-pass"
                />
                {settings?.hasSmtpPass && (
                  <p className="text-xs text-muted-foreground">(existing password is stored securely)</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromAddress">From Email Address</Label>
                <Input
                  id="fromAddress"
                  type="email"
                  placeholder="noreply@yourdomain.com"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  data-testid="input-from-address"
                />
              </div>
            </>
          )}

          {(provider === "sendgrid" || provider === "resend") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={settings?.hasApiKey ? "Leave blank to keep existing key" : "Enter your API key..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  {provider === "sendgrid" && "Get your API key from SendGrid Dashboard > Settings > API Keys"}
                  {provider === "resend" && "Get your API key from resend.com/api-keys"}
                  {settings?.hasApiKey && " (existing key is stored securely)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromAddress">From Email Address</Label>
                <Input
                  id="fromAddress"
                  type="email"
                  placeholder="noreply@yourdomain.com"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  data-testid="input-from-address"
                />
                <p className="text-xs text-muted-foreground">
                  The sender email address for outgoing emails. Must be verified with your email provider.
                </p>
              </div>
            </>
          )}

          {!provider && (
            <p className="text-sm text-muted-foreground py-4">Select an email provider above to configure settings.</p>
          )}

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              data-testid="button-save-email-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold">How it works</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>When email is configured, the platform will automatically send:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Email verification links when new users register</li>
              <li>Password reset emails (coming soon)</li>
              <li>Incident notification alerts (coming soon)</li>
            </ul>
            <p>If no email provider is configured, verification links will be logged to the server console for development purposes.</p>
            {provider === "gmail" && (
              <div className="mt-4 p-3 rounded-md bg-muted">
                <p className="font-medium text-foreground mb-1">Gmail Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Enable 2-Step Verification on your Google Account</li>
                  <li>Go to Google Account &rarr; Security &rarr; 2-Step Verification</li>
                  <li>Scroll to "App passwords" at the bottom</li>
                  <li>Create a new app password (select "Mail" and your device)</li>
                  <li>Copy the 16-character password and paste it above</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
