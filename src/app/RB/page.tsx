import type { Metadata } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel Reception Booking",
  description: "Reception booking login page for Orange Hotel.",
  manifest: "/api/pwa-manifest/cashier",
};

export default function ReceptionBookingEntryPage() {
  return <RoleLoginPage role="cashier" />;
}
