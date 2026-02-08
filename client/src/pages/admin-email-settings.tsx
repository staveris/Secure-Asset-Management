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

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || "");
      setFromAddress(settings.fromAddress || "");
      setApiKey("");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/email-settings", {
        provider,
        apiKey,
        fromAddress,
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
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              {!provider && "Select a provider first"}
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

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!provider || (!apiKey && !settings?.hasApiKey) || !fromAddress || saveMutation.isPending}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
