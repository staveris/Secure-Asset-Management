import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CreditCard, Mail } from "lucide-react";

type Listener = (message: string) => void;

let listener: Listener | null = null;
let pending: string | null = null;

/** Open the global upgrade dialog with the server-provided reason. */
export function showUpgradeDialog(message: string) {
  if (listener) {
    listener(message);
  } else {
    pending = message;
  }
}

/**
 * Mounted once in App.tsx. Renders an elegant upgrade prompt whenever a
 * 402 plan wall is hit anywhere in the app.
 */
export function UpgradeDialogHost() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    listener = (msg: string) => {
      setMessage(msg);
      setOpen(true);
    };
    if (pending) {
      listener(pending);
      pending = null;
    }
    return () => {
      listener = null;
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-upgrade">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center" data-testid="text-upgrade-title">
            Unlock this feature
          </DialogTitle>
          <DialogDescription className="text-center" data-testid="text-upgrade-message">
            {message || "This feature requires a plan upgrade."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">
          Compare plans to see what's included, or contact us and we'll take
          care of the upgrade for you.
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate("/settings/plan");
            }}
            data-testid="button-upgrade-view-plans"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            View Plans & Billing
          </Button>
          <Button variant="outline" className="w-full" asChild data-testid="button-upgrade-email">
            <a href={`mailto:info@toolsoftech.eu?subject=${encodeURIComponent("Plan upgrade request")}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email us to upgrade
            </a>
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setOpen(false)}
            data-testid="button-upgrade-dismiss"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
