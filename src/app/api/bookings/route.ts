import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendWebsiteBookingServer } from "@/app/lib/website-bookings-server";
import { type WebsiteBookingBackendSyncStatus, type WebsiteBookingRecord } from "@/app/lib/website-bookings";

export const runtime = "nodejs";

const ROOM_PRICES = {
  standard: 70000,
  platinum: 100000,
} as const;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const MIN_FORM_FILL_TIME_MS = 4_000;
const ipRequestStore = new Map<string, { count: number; resetAt: number }>();
const BLOCKED_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /wget/i,
  /curl/i,
  /python/i,
  /axios/i,
  /httpclient/i,
  /headless/i,
  /postman/i,
  /insomnia/i,
] as const;

const bookingSchema = z.object({
  fullName: z.string().trim().min(2).max(80).regex(/^[a-zA-Z\s.'-]+$/, "Name contains invalid characters"),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().min(7).max(24).regex(/^[+0-9\s-]+$/, "Phone number format is invalid"),
  roomType: z.enum(["standard", "platinum"]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(4),
  specialRequest: z.string().trim().max(400).optional().default(""),
  website: z.string().optional(),
  formStartedAt: z.number().int().nonnegative().optional(),
});

const getClientIp = (request: NextRequest) => {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const [first] = xff.split(",");
    return first.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
};

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const current = ipRequestStore.get(ip);

  if (!current || now > current.resetAt) {
    ipRequestStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  current.count += 1;
  return false;
};

const asUtcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const createBookingReference = () => `OH-${Date.now()}`;

function getHost(request: NextRequest) {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
}

function hasTrustedNavigationSource(request: NextRequest) {
  const host = getHost(request);
  if (!host) return false;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const matchesHost = (value: string) => {
    try {
      return new URL(value).host === host;
    } catch {
      return false;
    }
  };

  return (origin ? matchesHost(origin) : false) || (referer ? matchesHost(referer) : false);
}

function isBlockedUserAgent(userAgent: string) {
  return BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

async function readUpstreamBody(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Unsupported request format." }, { status: 415 });
    }

    if (!hasTrustedNavigationSource(request)) {
      console.warn("Blocked booking request with untrusted source", { ip, userAgent });
      return NextResponse.json({ error: "Invalid booking source." }, { status: 403 });
    }

    if (isBlockedUserAgent(userAgent)) {
      console.warn("Blocked booking bot request", { ip, userAgent });
      return NextResponse.json({ error: "Invalid booking source." }, { status: 403 });
    }

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many booking attempts. Please wait and try again." }, { status: 429 });
    }

    const json = await request.json();
    const parsed = bookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid booking data." }, { status: 400 });
    }

    const data = parsed.data;

    if ((data.website ?? "").trim().length > 0) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    if (!data.formStartedAt || Date.now() - data.formStartedAt < MIN_FORM_FILL_TIME_MS) {
      return NextResponse.json({ error: "Booking request could not be verified." }, { status: 400 });
    }

    const checkInDate = asUtcDate(data.checkIn);
    const checkOutDate = asUtcDate(data.checkOut);
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: "Invalid dates provided." }, { status: 400 });
    }

    if (checkInDate < todayUtc) {
      return NextResponse.json({ error: "Check-in date cannot be in the past." }, { status: 400 });
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);
    if (nights < 1 || nights > 30) {
      return NextResponse.json({ error: "Stay must be between 1 and 30 nights." }, { status: 400 });
    }

    const pricePerNight = ROOM_PRICES[data.roomType];
    const totalAmount = nights * pricePerNight;
    const createdAt = new Date().toISOString();
    const backendUrl = process.env.BOOKING_BACKEND_URL?.trim();
    let backendSyncStatus: WebsiteBookingBackendSyncStatus = backendUrl ? "pending" : "failed";
    let backendSyncError: string | null = backendUrl ? null : "Booking backend is not configured.";
    let bookingReference = createBookingReference();
    let warning: string | null = backendUrl ? null : "Booking saved for reception follow-up, but backend sync is not configured.";

    const payload = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      roomType: data.roomType,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      nights,
      pricePerNight,
      totalAmount,
      currency: "TZS",
      specialRequest: data.specialRequest,
      source: "orange-hotel-web",
      createdAt,
    };
    if (backendUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (process.env.BOOKING_BACKEND_API_KEY) {
        headers.Authorization = `Bearer ${process.env.BOOKING_BACKEND_API_KEY}`;
      }

      try {
        const upstream = await fetch(backendUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: controller.signal,
        });
        const upstreamJson = await readUpstreamBody(upstream);

        if (upstream.ok) {
          bookingReference =
            typeof upstreamJson.bookingReference === "string" && upstreamJson.bookingReference.trim().length > 0
              ? upstreamJson.bookingReference
              : bookingReference;
          backendSyncStatus = "synced";
          backendSyncError = null;
        } else {
          backendSyncStatus = "failed";
          backendSyncError =
            typeof upstreamJson.error === "string" && upstreamJson.error.trim().length > 0
              ? upstreamJson.error
              : "Booking service rejected the request.";
          warning = "Booking saved for reception follow-up, but backend sync failed.";
        }
      } catch {
        backendSyncStatus = "failed";
        backendSyncError = "Could not reach booking service.";
        warning = "Booking saved for reception follow-up, but backend sync failed.";
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const websiteBooking: WebsiteBookingRecord = {
      id: `web-${Date.now()}`,
      bookingReference,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      roomType: data.roomType,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      nights,
      pricePerNight,
      totalAmount,
      currency: "TZS",
      specialRequest: data.specialRequest,
      source: "website",
      status: "new",
      backendSyncStatus,
      backendSyncError,
      createdAt,
      receptionistSeenAt: null,
    };

    await appendWebsiteBookingServer(websiteBooking);

    return NextResponse.json(
      {
        ok: true,
        bookingReference,
        backendSyncStatus,
        warning,
        createdAt,
        nights,
        pricePerNight,
        totalAmount,
      },
      { status: backendSyncStatus === "synced" ? 200 : 202, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
