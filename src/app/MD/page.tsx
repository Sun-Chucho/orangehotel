import type { Metadata, Viewport } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel MD Dashboard",
  description: "Managing director mobile dashboard login for Orange Hotel.",
  manifest: "/api/pwa-manifest/director",
  appleWebApp: {
    capable: true,
    title: "Orange MD",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "Orange MD",
  },
};

export const viewport: Viewport = {
  themeColor: "#065f46",
};

export default function ManagingDirectorEntryPage() {
  return <RoleLoginPage role="director" />;
}
