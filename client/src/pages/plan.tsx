import { usePlan, PLAN_LABELS, type TenantPlan } from "@/hooks/use-plan";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Check, X, Mail, Sparkles, CreditCard } from "lucide-react";

const TIER_ORDER: TenantPlan["tier"][] = ["FREE", "STARTER", "PROFESSIONAL"];

const TIER_DESCRIPTIONS: Record<TenantPlan["tier"], string> = {
  FREE: "Get started with NIS2 scoping and up to 25 answered NIS2 controls.",
  STARTER: "Unlimited NIS2 answers, evidence vault uploads, and the Art.21 risk register.",
  PROFESSIONAL: "Everything in Starter plus cross-framework propagation and the DORA module.",
};

const TIER_FEATURES: { label: string; has: (t: TenantPlan["tier"]) => boolean | string }[] = [
  { label: "NIS2 scope check & scoped assessments", has: () => true },
  { label: "NIS2 control answers", has: (t) => (t === "FREE" ? "Up to 25" : "Unlimited") },
  { label: "Evidence vault uploads", has: (t) => t !== "FREE" },
  { label: "NIS2 Art.21 risk register", has: (t) => t !== "FREE" },
  { label: "Cross-framework suggestion acceptance", has: (t) => t === "PROFESSIONAL" },
  { label: "DORA module (financial entities)", has: (t) => t === "PROFESSIONAL" },
];

export default function PlanPage() {
  const { data: plan, isLoading } = usePlan();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground" data-testid="text-plan-unavailable">
          Plan information is not available for this account.
        </p>
      </div>
    );
  }

  const trialDaysLeft = plan.trialActive && plan.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const capUsedPct = plan.limits.nis2ResponseCap
    ? Math.min(100, Math.round(((plan.nis2ResponseCount ?? 0) / plan.limits.nis2ResponseCap) * 100))
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl" data-testid="plan-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Plan &amp; Billing
        </h1>
        <p className="text-muted-foreground mt-1">Your current plan and what it includes.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle data-testid="text-current-plan">{PLAN_LABELS[plan.effectiveTier]} plan</CardTitle>
              {plan.trialActive && plan.effectiveTier !== plan.tier && (
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0" data-testid="badge-trial">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Trial — {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
                </Badge>
              )}
            </div>
            <Button asChild data-testid="button-contact-upgrade">
              <a href={`mailto:info@toolsoftech.eu?subject=${encodeURIComponent("Plan upgrade request")}`}>
                <Mail className="w-4 h-4 mr-2" />
                Contact us to upgrade
              </a>
            </Button>
          </div>
          <CardDescription>{TIER_DESCRIPTIONS[plan.effectiveTier]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.trialActive && plan.effectiveTier !== plan.tier && (
            <p className="text-sm text-muted-foreground" data-testid="text-trial-note">
              When your trial ends you will move to the {PLAN_LABELS[plan.tier]} plan.
            </p>
          )}
          {plan.limits.nis2ResponseCap != null && (
            <div className="space-y-1.5" data-testid="section-cap-usage">
              <div className="flex items-center justify-between text-sm">
                <span>NIS2 control answers used</span>
                <span className="font-medium" data-testid="text-cap-usage">
                  {plan.nis2ResponseCount ?? 0} / {plan.limits.nis2ResponseCap}
                </span>
              </div>
              <Progress value={capUsedPct} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const isCurrent = tier === plan.effectiveTier;
          return (
            <Card key={tier} className={isCurrent ? "border-primary" : undefined} data-testid={`card-tier-${tier}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{PLAN_LABELS[tier]}</CardTitle>
                  {isCurrent && <Badge variant="secondary" data-testid={`badge-current-${tier}`}>Current</Badge>}
                </div>
                <CardDescription className="text-xs">{TIER_DESCRIPTIONS[tier]}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {TIER_FEATURES.map((f) => {
                    const v = f.has(tier);
                    return (
                      <li key={f.label} className="flex items-start gap-2">
                        {v === false ? (
                          <X className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                        )}
                        <span className={v === false ? "text-muted-foreground" : undefined}>
                          {f.label}
                          {typeof v === "string" && <span className="text-muted-foreground"> — {v}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Upgrades are handled by our team — no self-service checkout yet. Email us and we will set your
        organisation up on the right plan.
      </p>
    </div>
  );
}
