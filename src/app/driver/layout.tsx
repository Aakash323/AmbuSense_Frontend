import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="driver">{children}</ProtectedRoleLayout>
  );
}
