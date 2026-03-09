import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Inventory Manager",
  description: "Inventory manager login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/inventory",
  themeColor: "#111827",
};

export default function InventoryManagerEntryPage() {
  return <RoleLoginPage role="inventory" />;
}
