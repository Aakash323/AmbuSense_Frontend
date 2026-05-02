import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-sidebar";

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="patient">
      <RoleDashboardShell role="patient">{children}</RoleDashboardShell>
    </ProtectedRoleLayout>
  );
}
