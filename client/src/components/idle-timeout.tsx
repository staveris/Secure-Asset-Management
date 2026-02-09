import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const IDLE_TIMEOUT_MS = 14 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;

export function IdleTimeoutWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    try { await logout(); } catch {}
  }, [logout, clearAllTimers]);

  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setShowWarning(false);
    setCountdown(60);

    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, WARNING_BEFORE_MS);
    }, WARNING_AT_MS);
  }, [user, clearAllTimers, handleLogout]);

  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    let lastReset = 0;
    let lastPing = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 10000) {
        lastReset = now;
        resetIdleTimer();
        if (now - lastPing > 5 * 60 * 1000) {
          lastPing = now;
          fetch("/api/auth/me", { credentials: "include" }).catch(() => {});
        }
      }
    };

    events.forEach(e => document.addEventListener(e, throttledReset, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, throttledReset));
      clearAllTimers();
    };
  }, [user, resetIdleTimer, clearAllTimers]);

  if (!user) return null;

  const handleStaySignedIn = () => {
    resetIdleTimer();
  };

  return (
    <Dialog open={showWarning} onOpenChange={(open) => { if (!open) handleStaySignedIn(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-idle-timeout">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-idle-title">
            <Clock className="h-5 w-5" />
            Session Expiring
          </DialogTitle>
          <DialogDescription data-testid="text-idle-description">
            Your session will expire in <strong>{countdown} second{countdown !== 1 ? "s" : ""}</strong> due to inactivity. Click below to stay signed in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleLogout} data-testid="button-idle-logout">
            Sign Out
          </Button>
          <Button onClick={handleStaySignedIn} data-testid="button-idle-stay">
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
