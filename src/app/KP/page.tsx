import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Kitchen POS",
  description: "Kitchen POS login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/kitchen",
};

export default function KitchenPosEntryPage() {
  return <RoleLoginPage role="kitchen" />;
}
