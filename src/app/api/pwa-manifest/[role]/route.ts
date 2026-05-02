import { NextRequest, NextResponse } from "next/server";

const ROLE_MANIFESTS = {
  manager: {
    name: "Orange Hotel Manager",
    short_name: "OH Manager",
    start_url: "/MANAGER",
    id: "/MANAGER",
    description: "Orange Hotel manager login and dashboard entry point.",
    theme_color: "#d97706",
    background_color: "#fff7ed",
  },
  director: {
    name: "Orange Hotel MD Dashboard",
    short_name: "Orange MD",
    start_url: "/MD?source=pwa",
    scope: "/",
    id: "/orange-hotel-md-dashboard",
    description: "Orange Hotel managing director mobile dashboard.",
    theme_color: "#065f46",
    background_color: "#f4f7f2",
  },
  inventory: {
    name: "Orange Hotel Inventory",
    short_name: "OH Inventory",
    start_url: "/IM",
    id: "/IM",
    description: "Orange Hotel inventory login and stock control entry point.",
    theme_color: "#111827",
    background_color: "#f9fafb",
  },
  cashier: {
    name: "Orange Hotel Reception",
    short_name: "OH Reception",
    start_url: "/RB",
    id: "/RB",
    description: "Orange Hotel reception booking login and dashboard entry point.",
    theme_color: "#ea580c",
    background_color: "#fff7ed",
  },
  kitchen: {
    name: "Orange Hotel Kitchen POS",
    short_name: "OH Kitchen",
    start_url: "/KP",
    id: "/KP",
    description: "Orange Hotel kitchen POS login and dashboard entry point.",
    theme_color: "#c2410c",
    background_color: "#fff7ed",
  },
  barista: {
    name: "Orange Hotel Barista POS",
    short_name: "OH Barista",
    start_url: "/BP",
    id: "/BP",
    description: "Orange Hotel barista POS login and dashboard entry point.",
    theme_color: "#fb923c",
    background_color: "#fff7ed",
  },
} as const;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ role: string }> },
) {
  const { role } = await context.params;
  const manifest = ROLE_MANIFESTS[role as keyof typeof ROLE_MANIFESTS];

  if (!manifest) {
    return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
  }

  return new NextResponse(
    JSON.stringify({
      ...manifest,
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      start_url: manifest.start_url,
      scope: "scope" in manifest ? manifest.scope : manifest.start_url,
      background_color: manifest.background_color,
      theme_color: manifest.theme_color,
      categories: ["business", "productivity"],
      prefer_related_applications: false,
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
