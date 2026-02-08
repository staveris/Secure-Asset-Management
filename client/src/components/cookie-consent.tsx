import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_CONSENT_KEY = "nis2_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential_only");
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-300"
      data-testid="cookie-consent-banner"
    >
      <div className="mx-auto max-w-3xl rounded-md border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold" data-testid="text-cookie-title">
                Cookie Preferences
              </h3>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-cookie-message">
                We use essential cookies to ensure the platform functions properly (authentication, session management). 
                Optional analytics cookies help us improve the service. By clicking "Accept All", you consent to all cookies. 
                You can choose "Essential Only" to limit cookies to those strictly necessary. 
                For more information, see our Privacy Policy in compliance with the GDPR (EU 2016/679).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={accept} data-testid="button-cookie-accept">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={decline} data-testid="button-cookie-essential">
                Essential Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
