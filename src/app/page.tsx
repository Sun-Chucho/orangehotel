"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, Star, Sparkles, Car, UtensilsCrossed, Wifi, Waves } from "lucide-react";

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

const gallery = [
  {
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
    alt: "Luxury hotel lounge",
  },
  {
    src: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
    alt: "Modern hotel suite",
  },
  {
    src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    alt: "Premium bedroom interior",
  },
];

const amenityCards = [
  {
    icon: Wifi,
    title: "Ultra-Fast Wi-Fi",
    description: "Reliable high-speed connection throughout rooms and public spaces.",
  },
  {
    icon: UtensilsCrossed,
    title: "Chef Curated Dining",
    description: "Fresh local and international menu options available all day.",
  },
  {
    icon: Car,
    title: "Airport Transfers",
    description: "Planned pickup and drop-off support for stress-free arrivals.",
  },
  {
    icon: Waves,
    title: "Wellness Comfort",
    description: "Quiet atmosphere and recovery-focused spaces for deep relaxation.",
  },
];

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_45%,#ffffff_100%)] text-black">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.jpeg" alt="Orange Hotel logo" width={42} height={42} className="rounded-lg border border-black/15" priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Orange Hotel</p>
              <p className="text-sm font-black uppercase">Luxury Booking</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#book" className="hidden rounded-xl border border-black/20 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur sm:inline-block">
              Book Now
            </a>
            <Link href="/staff" className="rounded-xl border border-black/20 bg-black/75 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur transition hover:bg-orange-500/90">
              StaffLogin
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.24),transparent_42%)]">
        <div className="absolute -left-10 top-16 h-48 w-48 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute right-2 top-24 h-56 w-56 rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-orange-500" /> Secure Online Booking
            </p>
            <h1 className="text-4xl font-black uppercase leading-tight tracking-tight md:text-6xl">
              Orange Hotel
              <span className="block text-orange-500">World-Class Comfort In Tanzania</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-black/70 md:text-base">
              A polished sanctuary for business and leisure travelers. Enjoy serene architecture, elevated room comfort, personalized service,
              and a seamless reservation journey from your first click to your final checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#book" className="rounded-xl bg-black/80 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-white backdrop-blur transition hover:bg-orange-500/90">
                Reserve Your Stay
              </a>
              <span className="rounded-xl border border-black/15 bg-white/65 px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] backdrop-blur">53 Premium Rooms</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="col-span-2 overflow-hidden rounded-2xl border border-black/10 bg-white/50 shadow-xl backdrop-blur-sm">
              <Image src={gallery[0].src} alt={gallery[0].alt} width={800} height={450} className="h-56 w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/50 shadow-lg backdrop-blur-sm">
              <Image src={gallery[1].src} alt={gallery[1].alt} width={500} height={380} className="h-44 w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/50 shadow-lg backdrop-blur-sm">
              <Image src={gallery[2].src} alt={gallery[2].alt} width={500} height={380} className="h-44 w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-black/15 bg-white/70 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Total Rooms</p>
            <p className="mt-2 text-3xl font-black">{INVENTORY.total}</p>
          </article>
          <article className="rounded-2xl border border-orange-500/40 bg-orange-500/85 p-5 text-white shadow-lg backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Standard</p>
            <p className="mt-2 text-3xl font-black">{INVENTORY.standard.count}</p>
            <p className="mt-2 text-xs font-semibold">{formatTzs(INVENTORY.standard.price)} / night</p>
          </article>
          <article className="rounded-2xl border border-black/20 bg-black/75 p-5 text-white shadow-lg backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Platinum</p>
            <p className="mt-2 text-3xl font-black">{INVENTORY.platinum.count}</p>
            <p className="mt-2 text-xs font-semibold">{formatTzs(INVENTORY.platinum.price)} / night</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-4">
        <div className="grid gap-4 md:grid-cols-4">
          {amenityCards.map((item) => (
            <article key={item.title} className="rounded-2xl border border-black/10 bg-white/65 p-5 shadow-md backdrop-blur-md">
              <item.icon className="h-5 w-5 text-orange-500" />
              <h3 className="mt-3 text-lg font-black uppercase">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/65">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-black/10 bg-black/70 p-8 text-white shadow-xl backdrop-blur-lg md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Guest Favorites</p>
          <h2 className="mt-2 text-3xl font-black uppercase">Why Travelers Choose Orange Hotel</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-2 flex gap-1 text-orange-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-sm text-white/90">"Elegant rooms, smooth booking, and excellent service. Exactly what I needed."</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-2 flex gap-1 text-orange-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-sm text-white/90">"Quiet, clean, and professional. Platinum room quality was outstanding."</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-2 flex gap-1 text-orange-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-sm text-white/90">"Fast reservation confirmation and friendly reception team throughout my stay."</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-2">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Experience</p>
            <h3 className="mt-2 text-xl font-black uppercase">Designed For Calm</h3>
            <p className="mt-2 text-sm leading-relaxed text-black/65">From your arrival welcome to evening turndown, every moment is tailored for ease and comfort.</p>
          </article>
          <article className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Location</p>
            <h3 className="mt-2 text-xl font-black uppercase">Connected Yet Quiet</h3>
            <p className="mt-2 text-sm leading-relaxed text-black/65">Access business hubs, transport links, and key city attractions while staying in peaceful surroundings.</p>
          </article>
          <article className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Promise</p>
            <h3 className="mt-2 text-xl font-black uppercase">Trust Every Detail</h3>
            <p className="mt-2 text-sm leading-relaxed text-black/65">Secure payments, validated reservations, transparent pricing, and attentive service standards.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-orange-300/60 bg-orange-50/80 p-8 backdrop-blur-md md:p-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
            <Sparkles className="h-4 w-4" /> Signature Service
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-tight">A Premium Stay That Feels Personal</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/70 md:text-base">
            Whether you choose Standard or Platinum, your booking includes professional support, high hygiene standards, and an atmosphere crafted
            for productivity and renewal. Our concierge can assist with transport, special room arrangements, and local recommendations.
          </p>
        </div>
      </section>

      <section id="book" className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 md:grid-cols-[1fr_1.1fr]">
        <aside className="rounded-3xl border border-black/15 bg-black/70 p-7 text-white shadow-xl backdrop-blur-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Booking Preview</p>
          <h2 className="mt-3 text-2xl font-black uppercase">Your Stay</h2>
          <div className="mt-8 space-y-5 text-sm">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-white/70">Room type</span>
              <strong className="uppercase">{roomType}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-white/70">Rate / night</span>
              <strong>{formatTzs(pricePerNight)}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-white/70">Nights</span>
              <strong>{nights || 0}</strong>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold text-white/80">Estimated Total</span>
              <strong className="text-orange-300">{formatTzs(total)}</strong>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-black/10 bg-white/80 p-7 shadow-[0_20px_45px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <h2 className="text-2xl font-black uppercase">Book Your Room</h2>
          <p className="mt-2 text-sm text-black/60">Secure reservation form. Instant submission to hotel booking backend.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Full name
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Phone number
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..." className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Guests
              <select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2">
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Room type
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRoomType("standard")} className={`rounded-xl border px-4 py-3 text-sm font-bold uppercase transition ${roomType === "standard" ? "border-orange-500 bg-orange-500 text-white" : "border-black/20 bg-white/70 text-black hover:border-black"}`}>
                  Standard
                </button>
                <button type="button" onClick={() => setRoomType("platinum")} className={`rounded-xl border px-4 py-3 text-sm font-bold uppercase transition ${roomType === "platinum" ? "border-orange-500 bg-orange-500 text-white" : "border-black/20 bg-white/70 text-black hover:border-black"}`}>
                  Platinum
                </button>
              </div>
            </label>
            <label className="text-sm font-semibold">
              Check-in
              <input required type="date" min={minDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Check-out
              <input required type="date" min={checkIn || minDate} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Special request (optional)
              <textarea rows={3} maxLength={400} value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} className="mt-2 w-full resize-none rounded-xl border border-black/20 bg-white/70 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="hidden" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {successRef ? (
            <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Booking received. Reference: <strong>{successRef}</strong>
            </p>
          ) : null}

          <button disabled={loading} type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black/80 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white backdrop-blur transition hover:bg-orange-500/95 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Submitting..." : "Securely Book Now"}
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-md backdrop-blur-md">
          <h3 className="text-2xl font-black uppercase">Frequently Asked Questions</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article>
              <p className="font-bold uppercase">What time is check-in/check-out?</p>
              <p className="mt-1 text-sm text-black/65">Check-in starts at 2:00 PM and check-out is at 11:00 AM. Early check-in is based on availability.</p>
            </article>
            <article>
              <p className="font-bold uppercase">How is my booking secured?</p>
              <p className="mt-1 text-sm text-black/65">All submissions pass server-side validation and are forwarded directly to our booking backend.</p>
            </article>
            <article>
              <p className="font-bold uppercase">Can I request special arrangements?</p>
              <p className="mt-1 text-sm text-black/65">Yes. Use the special request field and our team will review it before confirmation.</p>
            </article>
            <article>
              <p className="font-bold uppercase">Need assistance now?</p>
              <p className="mt-1 text-sm text-black/65">Submit your booking and our front desk follows up quickly with confirmation details.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
