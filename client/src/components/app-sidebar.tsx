import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import companyLogo from "@assets/Color_logo_with_background_1770546085701.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  ClipboardCheck,
  ListTodo,
  FileBox,
  Truck,
  Shield,
  FileText,
  BarChart3,
  Building2,
  BookOpen,
  ScrollText,
  LogOut,
  ChevronDown,
  Users,
  Settings,
  Mail,
  HardDrive,
  Lock,
  Atom,
  ArrowDownToLine,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tenantMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, requiresFullAccess: false },
  { title: "Assessments", url: "/assessments", icon: ClipboardCheck, requiresFullAccess: false },
  { title: "Tasks", url: "/tasks", icon: ListTodo, requiresFullAccess: true },
  { title: "Evidence", url: "/evidence", icon: FileBox, requiresFullAccess: true },
  { title: "Suppliers", url: "/suppliers", icon: Truck, requiresFullAccess: true },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle, requiresFullAccess: true },
  { title: "Risks", url: "/risks", icon: Shield, requiresFullAccess: true },
  { title: "Reports", url: "/reports", icon: FileText, requiresFullAccess: true },
  { title: "Users", url: "/users", icon: Users, requiresFullAccess: false },
  { title: "Settings", url: "/settings", icon: Settings, requiresFullAccess: false },
];

const adminMenuItems = [
  { title: "Global Analytics", url: "/admin", icon: BarChart3 },
  { title: "Tenants", url: "/admin/tenants", icon: Building2 },
  { title: "Storage & Quotas", url: "/admin/storage", icon: HardDrive },
  { title: "Requirements", url: "/admin/requirements", icon: BookOpen },
  { title: "Atomic Library", url: "/admin/atomic-library", icon: Atom },
  { title: "Atomic Import", url: "/admin/atomic-import", icon: ArrowDownToLine },
  { title: "Audit Log", url: "/admin/audit-log", icon: ScrollText },
  { title: "Email Settings", url: "/admin/email-settings", icon: Mail },
  { title: "Account Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isPlatformAdmin, hasFullAccess } = useAuth();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [clickedFeature, setClickedFeature] = useState("");

  const { data: doraModule } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/dora/module-enabled"],
    enabled: !!user && !isPlatformAdmin,
  });
  const doraEnabled = !!doraModule?.enabled;

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleLockedClick = (featureName: string) => {
    setClickedFeature(featureName);
    setContactDialogOpen(true);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="Tools of Tech" className="h-9 w-9 rounded-md object-cover" data-testid="img-company-logo" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" data-testid="text-app-name">CyberResilience360</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-tenant-name">
              {user?.tenantName || "Compliance"}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {!isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Compliance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  ...tenantMenuItems.slice(0, 2),
                  ...(doraEnabled
                    ? [{ title: "DORA", url: "/dora", icon: Banknote, requiresFullAccess: false }]
                    : []),
                  ...tenantMenuItems.slice(2),
                ].map((item) => {
                  const isLocked = item.requiresFullAccess && !hasFullAccess;
                  return (
                    <SidebarMenuItem key={item.title}>
                      {isLocked ? (
                        <SidebarMenuButton
                          className="opacity-50 cursor-pointer"
                          data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                          tooltip={`${item.title} - requires full access`}
                          onClick={() => handleLockedClick(item.title)}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                          <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={location.startsWith(item.url)}
                        >
                          <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md hover-elevate" data-testid="button-user-menu">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-user-name">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent data-testid="dialog-contact-upgrade">
          <DialogHeader>
            <DialogTitle data-testid="text-contact-dialog-title">
              Upgrade to Full Access
            </DialogTitle>
            <DialogDescription data-testid="text-contact-dialog-description">
              The <span className="font-medium text-foreground">{clickedFeature}</span> module is not available in the demo version.
              To unlock the full CyberResilience360 platform, please contact us.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm font-semibold" data-testid="text-contact-company">Tools of Tech P.C.</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <a href="mailto:info@toolsoftech.eu" className="underline" data-testid="link-contact-email">info@toolsoftech.eu</a>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)} data-testid="button-contact-close">
              Close
            </Button>
            <Button asChild data-testid="button-contact-email-link">
              <a href="mailto:info@toolsoftech.eu">Contact Us</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
