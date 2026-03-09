import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Inventory Manager",
  description: "Inventory manager login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/inventory",
};

export default function InventoryManagerEntryPage() {
  return <RoleLoginPage role="inventory" />;
}
