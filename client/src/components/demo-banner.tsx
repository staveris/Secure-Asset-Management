import { useAuth } from "@/lib/auth";
import { Info } from "lucide-react";

export function DemoBanner() {
  const { user, hasFullAccess, isPlatformAdmin } = useAuth();

  if (!user || hasFullAccess || isPlatformAdmin) return null;

  return (
    <div
      className="bg-primary text-primary-foreground px-4 py-2 text-center text-xs flex items-center justify-center gap-2 shrink-0"
      data-testid="banner-demo-mode"
    >
      <Info className="w-3.5 h-3.5 shrink-0" />
      <span>
        You are using the <span className="font-semibold">Demo Version</span> of the NIS2 Platform. Some features are restricted. Contact{" "}
        <a href="mailto:info@toolsoftech.eu" className="underline font-semibold" data-testid="link-demo-contact">
          Tools of Tech P.C.
        </a>{" "}
        for full access.
      </span>
    </div>
  );
}
