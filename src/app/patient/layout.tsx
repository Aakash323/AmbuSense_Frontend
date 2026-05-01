import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="patient">{children}</ProtectedRoleLayout>
  );
}
