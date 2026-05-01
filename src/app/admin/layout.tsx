import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ProtectedRoleLayout } from "@/components/auth/protected-role-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoleLayout allowedRole="admin">
      <div className="min-h-screen bg-[linear-gradient(135deg,#f8fffc_0%,#f1fdf8_44%,#f8fafc_100%)] lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ProtectedRoleLayout>
  );
}
