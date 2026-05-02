import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-sidebar";

export default function DispatcherLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="dispatcher">
      <RoleDashboardShell role="dispatcher">{children}</RoleDashboardShell>
    </ProtectedRoleLayout>
  );
}
