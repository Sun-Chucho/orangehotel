import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Barista POS",
  description: "Barista POS login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/barista",
  themeColor: "#fb923c",
};

export default function BaristaPosEntryPage() {
  return <RoleLoginPage role="barista" />;
}
