import { readJson, writeJson } from "@/app/lib/storage";

export const STORAGE_WEBSITE_BOOKINGS = "orange-hotel-website-bookings";

export type WebsiteBookingStatus = "new" | "seen";
export type WebsiteRoomType = "standard" | "platinum";

export interface WebsiteBookingRecord {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  roomType: WebsiteRoomType;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  currency: "TZS";
  specialRequest: string;
  source: "website";
  status: WebsiteBookingStatus;
  createdAt: string;
  receptionistSeenAt: string | null;
}

export function readWebsiteBookings() {
  const value = readJson<WebsiteBookingRecord[]>(STORAGE_WEBSITE_BOOKINGS);
  return Array.isArray(value) ? value : [];
}

export function writeWebsiteBookings(bookings: WebsiteBookingRecord[]) {
  writeJson(STORAGE_WEBSITE_BOOKINGS, bookings);
}

export function markWebsiteBookingsSeen(bookings: WebsiteBookingRecord[], bookingIds?: string[]) {
  const targetIds = bookingIds ? new Set(bookingIds) : null;
  const seenAt = new Date().toISOString();

  return bookings.map((booking) => {
    if (booking.status === "seen") {
      return booking;
    }

    if (targetIds && !targetIds.has(booking.id)) {
      return booking;
    }

    return {
      ...booking,
      status: "seen" as const,
      receptionistSeenAt: seenAt,
    };
  });
}
