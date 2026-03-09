import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Manager",
  description: "Hotel manager login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/manager",
};

export default function ManagerEntryPage() {
  return <RoleLoginPage role="manager" />;
}
