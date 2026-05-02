"use client";

import {
  Ambulance,
  ClipboardList,
  Gauge,
  LogOut,
  Route,
  ShieldCheck,
  Siren,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useLogout, useMe } from "@/hooks/use-auth";
import { getFriendlyApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
};

const roleConfig: Record<
  Exclude<UserRole, "admin">,
  {
    title: string;
    subtitle: string;
    badge: string;
    navItems: NavItem[];
  }
> = {
  dispatcher: {
    title: "Dispatcher",
    subtitle: "Operations Dashboard",
    badge: "DS",
    navItems: [
      { href: "/dispatcher", label: "Dashboard", icon: Gauge },
      { href: "/dispatcher#queue", label: "Request Queue", icon: ClipboardList },
      { href: "/dispatcher#resources", label: "Resources", icon: Ambulance },
    ],
  },
  patient: {
    title: "Patient",
    subtitle: "Self-Service Dashboard",
    badge: "PT",
    navItems: [
      { href: "/patient", label: "Dashboard", icon: Gauge },
      { href: "/patient/new-request", label: "New Request", icon: Siren },
      { href: "/patient/requests", label: "My Requests", icon: ClipboardList },
    ],
  },
  driver: {
    title: "Driver",
    subtitle: "Driver Workspace",
    badge: "DR",
    navItems: [
      { href: "/driver", label: "Dashboard", icon: Gauge },
      { href: "/driver/verification", label: "Verification", icon: ShieldCheck },
      { href: "/driver/trip", label: "Trip Controls", icon: Route },
    ],
  },
};

type RoleDashboardSidebarProps = {
  role: Exclude<UserRole, "admin">;
};

export function RoleDashboardSidebar({ role }: RoleDashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const { data } = useMe();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const config = roleConfig[role];

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      toast.success("Logged out successfully");
      setIsLogoutOpen(false);
      router.replace("/login");
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error));
    }
  }

  return (
    <aside className="border-b border-emerald-100 bg-white/95 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 font-semibold text-white">
              {config.badge}
            </div>
            <div>
              <p className="font-semibold tracking-tight">AmbuSense</p>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
        </div>
        <Separator />
        <nav className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
          {config.navItems.map((item) => {
            const Icon = item.icon;
            const [itemPath, itemHash] = item.href.split("#");
            const isActive = itemHash
              ? pathname === itemPath && currentHash === `#${itemHash}`
              : pathname === itemPath &&
                (!currentHash || !item.href.includes("#"));

            return (
              <Link
                className={cn(
                  "flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-emerald-50 hover:text-emerald-700",
                  isActive && "bg-emerald-50 text-emerald-700",
                )}
                href={item.href}
                key={item.href}
                onClick={() => {
                  setCurrentHash(itemHash ? `#${itemHash}` : "");
                }}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <Separator className="mb-3 hidden lg:block" />
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-emerald-700" />
              <p className="truncate text-sm font-medium text-slate-900">
                {data?.user.fullName ?? config.title}
              </p>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {data?.user.email ?? `${role} account`}
            </p>
          </div>
          <Button
            className="w-full justify-start border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => setIsLogoutOpen(true)}
            type="button"
            variant="outline"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>
      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogClose onClick={() => setIsLogoutOpen(false)} />
        <DialogHeader>
          <div className="flex items-start gap-3 pr-10">
            <div className="flex size-20 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <LogOut className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Logout?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Are you sure you want to logout?
              </p>
            </div>
          </div>
        </DialogHeader>
        <DialogContent>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={logout.isPending}
              onClick={() => setIsLogoutOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={logout.isPending}
              onClick={handleLogout}
              type="button"
              variant="destructive"
            >
              {logout.isPending ? "Logging out..." : "Yes, logout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

type RoleDashboardShellProps = {
  role: Exclude<UserRole, "admin">;
  children: ReactNode;
};

export function RoleDashboardShell({ role, children }: RoleDashboardShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),linear-gradient(135deg,#f8fffc_0%,#f1fdf8_42%,#f8fafc_100%)] lg:flex lg:h-screen lg:overflow-hidden">
      <RoleDashboardSidebar role={role} />
      <div className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto lg:overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
