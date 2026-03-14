import { ROOMS, Room } from "@/app/lib/mock-data";
import { readJson, writeJson } from "@/app/lib/storage";

interface ActiveBookingRoom {
  roomNumber: string;
  status?: "completed" | "credit" | "checked-out";
  checkOutDate?: string;
  checkOutTime?: string;
}

export const STORAGE_ROOMS = "orange-hotel-rooms-state";

export function getDefaultRooms(): Room[] {
  return ROOMS.map((room) => ({ ...room }));
}

export function readRoomsState(): Room[] {
  const saved = readJson<Room[]>(STORAGE_ROOMS);
  if (!Array.isArray(saved) || saved.length === 0) {
    return getDefaultRooms();
  }
  return saved;
}

function hasSavedRoomsState(): boolean {
  const saved = readJson<Room[]>(STORAGE_ROOMS);
  return Array.isArray(saved) && saved.length > 0;
}

export function writeRoomsState(rooms: Room[]) {
  writeJson(STORAGE_ROOMS, rooms);
}

export function updateRoomStatusByNumber(roomNumber: string, status: Room["status"]): Room[] {
  const nextRooms = readRoomsState().map((room) =>
    room.number === roomNumber ? { ...room, status } : room,
  );
  writeRoomsState(nextRooms);
  return nextRooms;
}

export function updateRoomStatusById(roomId: string, status: Room["status"]): Room[] {
  const nextRooms = readRoomsState().map((room) =>
    room.id === roomId ? { ...room, status } : room,
  );
  writeRoomsState(nextRooms);
  return nextRooms;
}

export function isBookingStillActive(booking: ActiveBookingRoom) {
  if (booking.status === "checked-out") return false;
  if (!booking.checkOutDate) return true;

  const checkoutAt = new Date(`${booking.checkOutDate}T${booking.checkOutTime || "00:00"}:00`);
  if (!Number.isFinite(checkoutAt.getTime())) return true;
  return Date.now() <= checkoutAt.getTime();
}

export function syncRoomsWithActiveBookings(bookings: ActiveBookingRoom[], baseRooms?: Room[]): Room[] {
  const occupiedRooms = new Set(
    bookings
      .filter((booking) => isBookingStillActive(booking))
      .map((booking) => booking.roomNumber),
  );

  const currentRooms =
    Array.isArray(baseRooms) && baseRooms.length > 0
      ? baseRooms
      : hasSavedRoomsState()
        ? readRoomsState()
        : getDefaultRooms();

  const nextRooms: Room[] = currentRooms.map((room) =>
    occupiedRooms.has(room.number)
      ? { ...room, status: "occupied" as Room["status"] }
      : room.status === "occupied"
        ? { ...room, status: "available" as Room["status"] }
        : room,
  );

  if (JSON.stringify(currentRooms) !== JSON.stringify(nextRooms)) {
    writeRoomsState(nextRooms);
  }
  return nextRooms;
}
