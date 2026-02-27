"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

const INVENTORY = {
  total: 53,
  standard: { count: 20, price: 70000 },
  platinum: { count: 33, price: 100000 },
} as const;

type RoomType = "standard" | "platinum";

const formatTzs = (value: number) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(value);

const dayDiff = (checkIn: string, checkOut: string) => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const ms = outDate.getTime() - inDate.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export default function Home() {
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState("1");
  const [specialRequest, setSpecialRequest] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successRef, setSuccessRef] = useState("");

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = dayDiff(checkIn, checkOut);
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const pricePerNight = roomType === "standard" ? INVENTORY.standard.price : INVENTORY.platinum.price;
  const total = nights * pricePerNight;

  const minDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessRef("");

    if (nights < 1) {
      setError("Please select a valid check-in and check-out date.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          roomType,
          checkIn,
          checkOut,
          guests: Number(guests),
          specialRequest,
          website,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result?.error ?? "Booking request failed. Please try again.");
        return;
      }

      setSuccessRef(result.bookingReference ?? "REQUEST-RECEIVED");
      setFullName("");
      setEmail("");
      setPhone("");
      setGuests("1");
      setSpecialRequest("");
      setCheckIn("");
      setCheckOut("");
      setWebsite("");
      setRoomType("standard");
    } catch {
      setError("We could not reach the booking server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="absolute left-0 top-0 h-[360px] w-[360px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-[340px] w-[340px] rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
            <ShieldCheck className="h-4 w-4 text-orange-500" /> Secure Online Booking
          </p>
          <h1 className="max-w-4xl text-4xl font-black uppercase leading-tight tracking-tight md:text-6xl">
            Orange Hotel
            <span className="block text-orange-500">Stay In Style</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-black/70 md:text-base">
            Sleek comfort in Tanzania with fast and secure online reservations. Choose your room and confirm in minutes.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-black p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Total Rooms</p>
              <p className="mt-2 text-3xl font-black">{INVENTORY.total}</p>
            </article>
            <article className="rounded-2xl border border-black/20 bg-orange-500 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Standard</p>
              <p className="mt-2 text-3xl font-black">{INVENTORY.standard.count}</p>
              <p className="mt-2 text-xs font-semibold">{formatTzs(INVENTORY.standard.price)} / night</p>
            </article>
            <article className="rounded-2xl border border-black bg-black p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Platinum</p>
              <p className="mt-2 text-3xl font-black">{INVENTORY.platinum.count}</p>
              <p className="mt-2 text-xs font-semibold">{formatTzs(INVENTORY.platinum.price)} / night</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1fr_1.1fr]">
        <aside className="rounded-3xl border border-black/15 bg-black p-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Booking Preview</p>
          <h2 className="mt-3 text-2xl font-black uppercase">Your Stay</h2>

          <div className="mt-8 space-y-5 text-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white/70">Room type</span>
              <strong className="uppercase">{roomType}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white/70">Rate / night</span>
              <strong>{formatTzs(pricePerNight)}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white/70">Nights</span>
              <strong>{nights || 0}</strong>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold text-white/80">Estimated Total</span>
              <strong className="text-orange-300">{formatTzs(total)}</strong>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-black/15 bg-white p-7 shadow-[0_20px_45px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-black uppercase">Book Your Room</h2>
          <p className="mt-2 text-sm text-black/60">All booking requests are securely sent to our backend reservation system.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Full name
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Phone number
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255..."
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Guests
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 bg-white px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Room type
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRoomType("standard")}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold uppercase transition ${
                    roomType === "standard"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-black/20 bg-white text-black hover:border-black"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setRoomType("platinum")}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold uppercase transition ${
                    roomType === "platinum"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-black/20 bg-white text-black hover:border-black"
                  }`}
                >
                  Platinum
                </button>
              </div>
            </label>
            <label className="text-sm font-semibold">
              Check-in
              <input
                required
                type="date"
                min={minDate}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Check-out
              <input
                required
                type="date"
                min={checkIn || minDate}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Special request (optional)
              <textarea
                rows={3}
                maxLength={400}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                className="mt-2 w-full resize-none rounded-xl border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2"
              />
            </label>

            <label className="hidden" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {successRef ? (
            <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Booking received. Reference: <strong>{successRef}</strong>
            </p>
          ) : null}

          <button
            disabled={loading}
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Submitting..." : "Securely Book Now"}
          </button>
        </form>
      </section>
    </main>
  );
}
