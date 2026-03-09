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
    name: "Orange Hotel Director",
    short_name: "OH Director",
    start_url: "/MD",
    id: "/MD",
    description: "Orange Hotel managing director login and dashboard entry point.",
    theme_color: "#065f46",
    background_color: "#ecfdf5",
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
      display_override: ["standalone", "window-controls-overlay"],
      display: "standalone",
      scope: manifest.start_url,
      orientation: "portrait",
      prefer_related_applications: false,
      icons: [
        {
          src: "/logo.jpeg",
          sizes: "192x192",
          type: "image/jpeg",
          purpose: "any maskable",
        },
        {
          src: "/logo.jpeg",
          sizes: "512x512",
          type: "image/jpeg",
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
