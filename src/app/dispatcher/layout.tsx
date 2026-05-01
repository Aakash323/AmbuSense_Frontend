import type { ReactNode } from "react";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";

export default function DispatcherLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="dispatcher">
      {children}
    </ProtectedRoleLayout>
  );
}
