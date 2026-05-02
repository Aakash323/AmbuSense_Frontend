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
    <aside className="border-b border-emerald-100 bg-[#fbfefc] lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col bg-[linear-gradient(180deg,#f0fdf7_0%,#fbfefc_36%,#ffffff_100%)]">
        <div className="p-5">
          <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
                {config.badge}
              </div>
              <div className="min-w-0">
                <p className="font-semibold tracking-tight text-slate-900">
                  AmbuSense
                </p>
                <p className="text-xs text-slate-500">{config.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
        <Separator className="bg-emerald-100" />
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
                  "group flex min-w-fit items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-800",
                  isActive &&
                    "border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-white",
                )}
                href={item.href}
                key={item.href}
                onClick={() => {
                  setCurrentHash(itemHash ? `#${itemHash}` : "");
                }}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-500 transition group-hover:border-emerald-200 group-hover:bg-white group-hover:text-emerald-700",
                    isActive &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-3">
          <Separator className="mb-3 hidden bg-emerald-100 lg:block" />
          <div className="mb-3 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-sm">
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
            className="w-full justify-start border-rose-100 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
