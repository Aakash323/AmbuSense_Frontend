import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-sidebar";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="driver">
      <RoleDashboardShell role="driver">{children}</RoleDashboardShell>
    </ProtectedRoleLayout>
  );
}
