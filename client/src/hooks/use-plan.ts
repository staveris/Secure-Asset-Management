import { useQuery } from "@tanstack/react-query";

export interface TenantPlan {
  tier: "FREE" | "STARTER" | "PROFESSIONAL";
  effectiveTier: "FREE" | "STARTER" | "PROFESSIONAL";
  trialEndsAt: string | null;
  trialActive: boolean;
  limits: {
    freeControlCap: number | null;
    evidenceUpload: boolean;
    crossFrameworkAccept: boolean;
  };
}

export function usePlan(enabled: boolean = true) {
  return useQuery<TenantPlan>({
    queryKey: ["/api/tenant/plan"],
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

/** apiRequest throws `Error("402: {json}")` — detect plan-upgrade walls. */
export function isUpgradeError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("402:");
}

export function upgradeMessage(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message.slice(4).trim());
      if (parsed?.message) return parsed.message;
    } catch {
      // fall through to generic message
    }
  }
  return "This feature requires a plan upgrade.";
}

export const PLAN_LABELS: Record<TenantPlan["tier"], string> = {
  FREE: "Free",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
};
