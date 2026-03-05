"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, ShieldCheck, Star } from "lucide-react";

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

const destinationCards = [
  {
    title: "Luxury Rooms",
    description: "Elegant Standard and Platinum stays designed for rest, privacy, and comfort.",
    image:
      "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Signature Restaurant",
    description: "Fresh breakfast, lunch, and dinner menus prepared by our in-house culinary team.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Cocktail Bar",
    description: "A refined evening bar experience with classic pours, mocktails, and lounge service.",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Events & Private Dining",
    description: "Host business dinners, celebrations, and group bookings with curated service options.",
    image:
      "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?auto=format&fit=crop&w=900&q=80",
  },
];

const stories = [
  {
    title: "Chef Specials This Week",
    tag: "Restaurant",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Platinum Room Experience",
    tag: "Hotel",
    image:
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=700&q=80",
  },
  {
    title: "Friday Bar Nights",
    tag: "Bar & Lounge",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=700&q=80",
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
    <main className="bg-[#f8f6f3] text-black">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3 text-white">
            <Image src="/logo.jpeg" alt="Orange Hotel logo" width={42} height={42} className="rounded-lg border border-white/40" priority />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">Orange Hotel</p>
              <p className="font-headline text-lg leading-none">Signature Stay</p>
            </div>
          </Link>
          <nav className="flex items-center gap-3">
            <a href="#book" className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Reserve
            </a>
          </nav>
        </div>
      </header>

      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1800&q=80"
          alt="Orange Hotel exterior and surroundings"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(0,0,0,0.58)_15%,rgba(0,0,0,0.25)_55%,rgba(245,124,0,0.32)_100%)]" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl items-end px-6 pb-16 pt-28">
          <div className="max-w-2xl text-white animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/45 px-4 py-2 text-xs uppercase tracking-[0.16em]">
              <ShieldCheck className="h-4 w-4 text-orange-300" /> Verified Secure Reservations
            </p>
            <h1 className="font-headline text-5xl leading-tight md:text-7xl">Orange Hotel</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              Elevated stays for business and leisure travelers in Tanzania, with quiet luxury interiors and seamless digital booking.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em]">
              <span className="rounded-full bg-white/20 px-4 py-2 backdrop-blur">53 Premium Rooms</span>
              <span className="rounded-full bg-orange-500/90 px-4 py-2">Standard + Platinum</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-headline text-4xl">What We Offer</h2>
          <p className="mt-2 text-sm text-black/65">Premium hotel accommodation, restaurant dining, and bar experiences in one destination.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destinationCards.map((card) => (
            <article key={card.title} className="group overflow-hidden rounded-sm bg-white shadow-[0_18px_35px_rgba(0,0,0,0.08)]">
              <div className="relative h-64">
                <Image src={card.image} alt={card.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-headline text-2xl leading-tight">{card.title}</h3>
                  <p className="mt-2 text-xs text-white/80">{card.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="relative h-[360px] overflow-hidden rounded-sm">
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80"
            alt="Signature interior"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.5),rgba(0,0,0,0.2))]" />
          <div className="relative flex h-full max-w-xl flex-col justify-center px-8 text-white md:px-12">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-200">Featured Experience</p>
            <h2 className="mt-3 font-headline text-4xl">Stay Well, Dine Better, Unwind At The Bar</h2>
            <p className="mt-4 text-sm text-white/85">From check-in to last call, Orange Hotel delivers a complete hospitality experience under one roof.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="font-headline text-4xl">Latest Highlights</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.9fr]">
          {stories.map((story) => (
            <article key={story.title} className="group relative min-h-[280px] overflow-hidden rounded-sm">
              <Image src={story.image} alt={story.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.18em] text-orange-200">{story.tag}</p>
                <h3 className="mt-2 font-headline text-2xl leading-tight">{story.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-sm bg-[#1c1c1c] px-6 py-16 text-center text-white md:px-10">
          <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Orange Experience</p>
          <h2 className="mt-3 font-headline text-5xl">Rooms, Restaurant, And Bar</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80">Book your stay, enjoy chef-crafted meals, and relax with signature drinks in our lounge bar.</p>
          <a href="#book" className="mt-8 inline-block border-b border-orange-300 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
            Discover More
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="grid rounded-sm bg-[#3a3a3a] text-white md:grid-cols-3">
          <div className="px-8 py-12 text-center">
            <h3 className="font-headline text-3xl">Comfortable Stays</h3>
          </div>
          <div className="border-y border-white/20 px-8 py-12 text-center md:border-x md:border-y-0">
            <h3 className="font-headline text-3xl">Great Dining</h3>
          </div>
          <div className="px-8 py-12 text-center">
            <h3 className="font-headline text-3xl">Evening Bar Vibes</h3>
          </div>
        </div>
      </section>

      <section id="book" className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 md:grid-cols-[0.95fr_1.05fr]">
        <aside className="rounded-sm border border-black/15 bg-black p-8 text-white shadow-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-orange-300">Booking Preview</p>
          <h2 className="mt-3 font-headline text-4xl">Your Stay</h2>
          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-white/70">Room Type</span>
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

          <div className="mt-8 space-y-3 rounded-sm border border-white/10 bg-white/5 p-4 text-sm">
            <p className="inline-flex items-center gap-2 text-orange-200"><MapPin className="h-4 w-4" /> Prime City Access</p>
            <div className="flex items-center gap-1 text-orange-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-white/75">Guests highlight quiet spaces, smooth arrival process, and excellent room standards.</p>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-sm border border-black/10 bg-white p-7 shadow-[0_16px_32px_rgba(0,0,0,0.08)] md:p-8">
          <h2 className="font-headline text-4xl">Reserve Your Room</h2>
          <p className="mt-2 text-sm text-black/60">Secure reservation form with instant submission to Orange Hotel booking backend.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Full name
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Phone number
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..." className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Guests
              <select value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2">
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
                  className={`rounded-sm border px-4 py-3 text-sm font-bold uppercase transition ${roomType === "standard" ? "border-orange-500 bg-orange-500 text-white" : "border-black/20 bg-white text-black hover:border-black"}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setRoomType("platinum")}
                  className={`rounded-sm border px-4 py-3 text-sm font-bold uppercase transition ${roomType === "platinum" ? "border-orange-500 bg-orange-500 text-white" : "border-black/20 bg-white text-black hover:border-black"}`}
                >
                  Platinum
                </button>
              </div>
            </label>
            <label className="text-sm font-semibold">
              Check-in
              <input required type="date" min={minDate} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold">
              Check-out
              <input required type="date" min={checkIn || minDate} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="mt-2 w-full rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Special request (optional)
              <textarea rows={3} maxLength={400} value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} className="mt-2 w-full resize-none rounded-sm border border-black/20 px-3 py-3 outline-none ring-orange-500 transition focus:ring-2" />
            </label>
            <label className="hidden" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error ? <p className="mt-5 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {successRef ? (
            <p className="mt-5 flex items-center gap-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Booking received. Reference: <strong>{successRef}</strong>
            </p>
          ) : null}

          <button
            disabled={loading}
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-black px-5 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Submitting..." : "Securely Book Now"}
          </button>
        </form>
      </section>

      <footer className="bg-[#0f0f0f] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <h3 className="font-headline text-3xl">Orange Hotel</h3>
            <p className="mt-3 text-sm text-white/70">A modern luxury stay shaped around comfort, precision service, and secure online booking.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-orange-300">Contact</p>
            <p className="mt-3 text-sm text-white/80">frontdesk@orangehotel.co.tz</p>
            <p className="text-sm text-white/80">+255 700 000 000</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-orange-300">Quick Links</p>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <a href="#book" className="block hover:text-orange-300">Book Now</a>
              <Link href="/staff" className="block hover:text-orange-300">Staff Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
