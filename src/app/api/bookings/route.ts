import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ROOM_PRICES = {
  standard: 70000,
  platinum: 100000,
} as const;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const ipRequestStore = new Map<string, { count: number; resetAt: number }>();

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

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
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

    const backendUrl = process.env.BOOKING_BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: "Booking backend is not configured." }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

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
      createdAt: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.BOOKING_BACKEND_API_KEY) {
      headers.Authorization = `Bearer ${process.env.BOOKING_BACKEND_API_KEY}`;
    }

    let upstream: Response;
    try {
      upstream = await fetch(backendUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      return NextResponse.json({ error: "Could not reach booking service." }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }

    const upstreamJson = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: upstreamJson?.error ?? "Booking service rejected the request.",
        },
        { status: 502 }
      );
    }

    const bookingReference = upstreamJson?.bookingReference ?? `OH-${Date.now()}`;

    return NextResponse.json(
      {
        ok: true,
        bookingReference,
        createdAt: payload.createdAt,
        nights,
        pricePerNight,
        totalAmount,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
