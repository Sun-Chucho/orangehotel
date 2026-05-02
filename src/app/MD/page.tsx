import type { Metadata, Viewport } from "next";
import { RoleLoginPage } from "@/components/auth/role-login-page";

export const metadata: Metadata = {
  title: "Orange Hotel MD Dashboard",
  description: "Managing director mobile dashboard login for Orange Hotel.",
  manifest: "/md-manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Orange MD",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Orange MD",
    "application-name": "Orange MD",
  },
};

export const viewport: Viewport = {
  themeColor: "#065f46",
};

export default function ManagingDirectorEntryPage() {
  return <RoleLoginPage role="director" />;
}
