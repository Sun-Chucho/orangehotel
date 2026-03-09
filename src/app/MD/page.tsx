import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Managing Director",
  description: "Managing director login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/director",
};

export default function ManagingDirectorEntryPage() {
  return <RoleLoginPage role="director" />;
}
