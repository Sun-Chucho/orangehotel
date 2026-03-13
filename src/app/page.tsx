"use client";

import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { FormEvent, type CSSProperties, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Instagram, LoaderCircle, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck, Star } from "lucide-react";
import { appendWebsiteBooking, type WebsiteBookingRecord } from "@/app/lib/website-bookings";
import {
  appendLiveChatMessage,
  createLiveChatThread,
  getLandingChatThreadId,
  markThreadSeenByGuest,
  readLiveChatThreads,
  type LiveChatThread,
} from "@/app/lib/live-chat";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";

const INVENTORY = {
  total: 53,
  standard: { count: 20, price: 70000 },
  platinum: { count: 33, price: 100000 },
} as const;

type RoomType = "standard" | "platinum";
type HighlightStory = {
  title: string;
  tag: string;
  image: string;
  images: readonly string[];
  eyebrow: string;
  description: string;
};

function LandingImage(props: ImageProps) {
  return <Image {...props} unoptimized />;
}

function CrossfadeStoryImage({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  const [displayedSrc, setDisplayedSrc] = useState(src);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);

  useEffect(() => {
    if (src === displayedSrc) return;

    setIncomingSrc(src);
    setShowIncoming(false);

    const animationFrame = window.requestAnimationFrame(() => {
      setIsFading(true);
      setShowIncoming(true);
    });

    const timeout = window.setTimeout(() => {
      setDisplayedSrc(src);
      setIncomingSrc(null);
      setIsFading(false);
      setShowIncoming(false);
    }, 1800);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [displayedSrc, src]);

  return (
    <>
      <LandingImage
        src={displayedSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-[1800ms] ease-in-out ${isFading ? "opacity-0" : "opacity-100"}`}
      />
      {incomingSrc ? (
        <LandingImage
          src={incomingSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={`object-cover transition-opacity duration-[1800ms] ease-in-out ${showIncoming ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </>
  );
}

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

const BAR_IMAGES = [
  "/landing/bar-1.jpg",
  "/landing/bar-2.jpg",
  "/landing/bar-3.jpg",
] as const;

const BREAKFAST_IMAGES = [
  "/landing/breakfast-1.jpg",
  "/landing/breakfast-2.jpg",
] as const;

const LUNCH_IMAGES = [
  "/landing/lunch-1.jpg",
  "/landing/lunch-2.jpg",
  "/landing/lunch-3.jpg",
  "/landing/lunch-4.jpg",
  "/landing/lunch-5.jpg",
  "/landing/lunch-6.jpg",
  "/landing/lunch-7.jpg",
  "/landing/lunch-8.jpg",
] as const;

const RESTAURANT_IMAGES = [
  "/landing/restaurant-1.jpg",
  "/landing/restaurant-2.jpg",
  "/landing/restaurant-3.jpg",
  "/landing/restaurant-4.jpg",
] as const;

const FEATURED_EXPERIENCES = [
  {
    image: BREAKFAST_IMAGES[0],
    eyebrow: "Breakfast Atmosphere",
    title: "Begin The Day With Elegant Breakfast Service And A Welcoming Dining Mood",
    description: "Invite guests into a refined morning setting where fresh breakfast service, polished presentation, and calm ambience immediately position Orange Hotel as a premium stay.",
  },
  {
    image: BREAKFAST_IMAGES[1],
    eyebrow: "Morning Indulgence",
    title: "Turn Breakfast Into A Memorable Hotel Experience Guests Want To Repeat",
    description: "Beautiful breakfast visuals, comfortable seating, and attentive service create a strong first impression that lifts guest satisfaction and encourages longer stays.",
  },
  {
    image: LUNCH_IMAGES[2],
    eyebrow: "Lunch Appeal",
    title: "Serve Vibrant Lunch Plates In A Space Designed To Feel Fresh And Premium",
    description: "Colorful dishes, generous portions, and polished plating help Orange Hotel market its restaurant as a destination for both in-house guests and walk-in diners.",
  },
  {
    image: LUNCH_IMAGES[5],
    eyebrow: "Signature Dining",
    title: "Create A Food Experience That Feels Social, Photogenic, And Worth Sharing",
    description: "Each plate becomes part of the hotel's story, helping the brand attract leisure guests, business clients, and social media attention at the same time.",
  },
  {
    image: RESTAURANT_IMAGES[1],
    eyebrow: "Restaurant Presence",
    title: "Present A Real Restaurant Setting That Strengthens The Hotel Brand",
    description: "An open, inviting dining room gives guests confidence in the overall experience and makes the restaurant feel like a signature part of the property.",
  },
  {
    image: RESTAURANT_IMAGES[3],
    eyebrow: "Private Dining",
    title: "Position The Space For Guests, Business Meetings, And Celebratory Dining",
    description: "From relaxed breakfast service to private lunches and special gatherings, the restaurant is built to support revenue across multiple guest moments.",
  },
] as const;

const MAIN_ROOM_IMAGE = "/landing/room-main.jpg";

const ROOM_IMAGES = [
  MAIN_ROOM_IMAGE,
  "/landing/room-1.jpg",
  "/landing/room-2.jpg",
  "/landing/room-3.jpg",
  "/landing/room-4.jpg",
  "/landing/room-5.jpg",
] as const;

const destinationCards = [
  {
    title: "Luxury Rooms",
    description: "Elegant Standard and Platinum stays designed for rest, privacy, and comfort.",
    image: MAIN_ROOM_IMAGE,
  },
  {
    title: "Signature Restaurant",
    description: "Fresh breakfast, lunch, and dinner menus prepared by our in-house culinary team.",
    image: RESTAURANT_IMAGES[0],
  },
  {
    title: "Cocktail Bar",
    description: "A refined evening bar experience with classic pours, mocktails, and lounge service.",
    image: BAR_IMAGES[2],
  },
  {
    title: "Events & Private Dining",
    description: "Host business dinners, celebrations, and group bookings with curated service options.",
    image: RESTAURANT_IMAGES[3],
  },
];

const stories: HighlightStory[] = [
  {
    title: "Chef Specials This Week",
    tag: "Restaurant",
    image: BREAKFAST_IMAGES[0],
    images: [...BREAKFAST_IMAGES, ...LUNCH_IMAGES],
    eyebrow: "Breakfast To Lunch",
    description: "Start the morning with fresh breakfast plates, then move into colorful lunch service prepared for hotel guests, business visitors, and private diners.",
  },
  {
    title: "Platinum Room Experience",
    tag: "Hotel",
    image: ROOM_IMAGES[1],
    images: ROOM_IMAGES,
    eyebrow: "Luxury Stay",
    description: "Quiet rooms, polished interiors, and comfortable finishes shape a stay experience that feels calm, private, and consistently premium.",
  },
  {
    title: "Friday Bar Nights",
    tag: "Bar & Lounge",
    image: BAR_IMAGES[0],
    images: BAR_IMAGES,
    eyebrow: "Lounge Moments",
    description: "Signature bottles, rich ambience, and a polished evening setting make the bar one of the most memorable spaces in the hotel.",
  },
];

export default function Home() {
  const [heroVideoFade, setHeroVideoFade] = useState(0);
  const [chefStoryIndex, setChefStoryIndex] = useState(0);
  const [barStoryIndex, setBarStoryIndex] = useState(0);
  const [roomStoryIndex, setRoomStoryIndex] = useState(0);
  const [restaurantShowcaseIndex, setRestaurantShowcaseIndex] = useState(0);
  const [experienceShowcaseIndex, setExperienceShowcaseIndex] = useState(0);
  const [activeStory, setActiveStory] = useState<HighlightStory | null>(null);
  const [activeStorySlide, setActiveStorySlide] = useState(0);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [chatGuestName, setChatGuestName] = useState("");
  const [chatGuestContact, setChatGuestContact] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatThread, setChatThread] = useState<LiveChatThread | null>(null);
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
  const [highlightCycle, setHighlightCycle] = useState(0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = dayDiff(checkIn, checkOut);
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const pricePerNight = roomType === "standard" ? INVENTORY.standard.price : INVENTORY.platinum.price;
  const total = nights * pricePerNight;
  const minDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHighlightCycle((current) => current + 1);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (highlightCycle === 0) return;

    const lane = highlightCycle % 3;
    if (lane === 1) {
      setChefStoryIndex((current) => (current + 1) % (BREAKFAST_IMAGES.length + LUNCH_IMAGES.length));
      return;
    }
    if (lane === 2) {
      setRoomStoryIndex((current) => (current + 1) % (ROOM_IMAGES.length - 1));
      return;
    }
    setBarStoryIndex((current) => (current + 1) % BAR_IMAGES.length);
  }, [highlightCycle]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setExperienceShowcaseIndex((current) => (current + 1) % experienceImages.length);
    }, 6400);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeStory) return;

    const interval = window.setInterval(() => {
      setActiveStorySlide((current) => (current + 1) % activeStory.images.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, [activeStory]);

  useEffect(() => {
    const applyChatSnapshot = () => {
      const threadId = getLandingChatThreadId();
      const threads = readLiveChatThreads();
      const nextThread = threadId ? threads.find((entry) => entry.id === threadId) ?? null : null;
      setChatThread(nextThread);
      if (nextThread?.unreadByGuest) {
        markThreadSeenByGuest(nextThread.id);
      }
    };

    applyChatSnapshot();
    const unsubscribe = subscribeToSyncedStorageKey("orange-hotel-live-chat", applyChatSnapshot);
    return () => unsubscribe();
  }, []);

  const chefImages = [...BREAKFAST_IMAGES, ...LUNCH_IMAGES];
  const experienceImages = [MAIN_ROOM_IMAGE, RESTAURANT_IMAGES[1], LUNCH_IMAGES[4], BAR_IMAGES[1]];

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

      const websiteBooking: WebsiteBookingRecord = {
        id: `web-${Date.now()}`,
        bookingReference: result.bookingReference ?? `OH-${Date.now()}`,
        fullName,
        email,
        phone,
        roomType,
        checkIn,
        checkOut,
        guests: Number(guests),
        nights: result.nights ?? nights,
        pricePerNight: result.pricePerNight ?? pricePerNight,
        totalAmount: result.totalAmount ?? total,
        currency: "TZS",
        specialRequest,
        source: "website",
        status: "new",
        createdAt: result.createdAt ?? new Date().toISOString(),
        receptionistSeenAt: null,
      };

      try {
        await appendWebsiteBooking(websiteBooking);
      } catch {
        setError("Booking was received, but receptionist live sync failed. Please notify reception with your reference.");
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

  const openBookingPopup = () => {
    setShowBookingPopup(true);
  };

  const continueToBookingForm = () => {
    setShowBookingPopup(false);
    if (typeof window !== "undefined") {
      document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const sendChatMessage = () => {
    const nextMessage = chatMessage.trim();
    if (!nextMessage) return;

    if (!chatThread) {
      const nextThread = createLiveChatThread(
        chatGuestName || fullName || "Website Guest",
        chatGuestContact || phone || email,
        nextMessage,
      );
      setChatThread(nextThread);
      setChatMessage("");
      setShowChatWidget(true);
      return;
    }

    appendLiveChatMessage(chatThread.id, "guest", nextMessage);
    setChatMessage("");
  };

  return (
    <main className="bg-[#f8f6f3] text-black">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3 text-white">
            <LandingImage src="/logo.jpeg" alt="Orange Hotel logo" width={42} height={42} className="rounded-lg border border-white/40" priority />
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
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onTimeUpdate={(event) => {
            const { currentTime, duration } = event.currentTarget;
            if (!Number.isFinite(duration) || duration <= 3) {
              setHeroVideoFade(0);
              return;
            }

            const fadeWindowStart = duration - 3;
            if (currentTime <= fadeWindowStart) {
              setHeroVideoFade(0);
              return;
            }

            setHeroVideoFade(Math.min((currentTime - fadeWindowStart) / 3, 1));
          }}
        >
          <source src="/smaller.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 pointer-events-none"
          style={
            {
              opacity: heroVideoFade,
              background:
                "radial-gradient(circle at center, transparent 0%, transparent 42%, rgba(0, 0, 0, 0.18) 68%, rgba(0, 0, 0, 0.82) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.7))",
            } as CSSProperties
          }
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
                <LandingImage src={card.image} alt={card.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
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
          <LandingImage
            key={FEATURED_EXPERIENCES[restaurantShowcaseIndex].image}
            src={FEATURED_EXPERIENCES[restaurantShowcaseIndex].image}
            alt={`Orange Hotel featured experience ${restaurantShowcaseIndex + 1}`}
            fill
            sizes="100vw"
            className="object-cover transition-all duration-[2800ms] ease-in-out"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.5),rgba(0,0,0,0.2))]" />
          <div className="relative flex h-full items-center justify-between gap-4 px-4 text-white md:px-8">
            <div className="max-w-xl rounded-[28px] border border-white/10 bg-black/25 p-6 backdrop-blur-sm md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-orange-200">Featured Experience</p>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">
                {FEATURED_EXPERIENCES[restaurantShowcaseIndex].eyebrow}
              </p>
              <h2 className="mt-3 font-headline text-4xl">
                {FEATURED_EXPERIENCES[restaurantShowcaseIndex].title}
              </h2>
              <p className="mt-4 text-sm text-white/85">
                {FEATURED_EXPERIENCES[restaurantShowcaseIndex].description}
              </p>
              <div className="mt-6 flex gap-2">
                {FEATURED_EXPERIENCES.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => setRestaurantShowcaseIndex(index)}
                    className={`h-1.5 flex-1 rounded-full transition ${restaurantShowcaseIndex === index ? "bg-orange-400" : "bg-white/35 hover:bg-white/55"}`}
                    aria-label={`Go to featured experience ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRestaurantShowcaseIndex((current) => (current + 1) % FEATURED_EXPERIENCES.length)}
              className="flex h-12 min-w-[92px] shrink-0 items-center justify-center gap-2 rounded-full border border-orange-300/60 bg-orange-500/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(251,146,60,0.35)] transition hover:border-orange-200 hover:bg-orange-500/30 animate-pulse"
              aria-label="Next featured experience"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="font-headline text-4xl">Latest Highlights</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.8fr_0.9fr]">
          {stories.map((story) => {
            const isBarStory = story.tag === "Bar & Lounge";
            const isRestaurantStory = story.tag === "Restaurant";
            const isHotelStory = story.tag === "Hotel";

            return (
              <article
                key={story.title}
                className="group relative min-h-[280px] overflow-hidden rounded-sm cursor-pointer"
                onClick={() => {
                  setActiveStory(story);
                  setActiveStorySlide(0);
                }}
              >
                {isBarStory ? (
                  <CrossfadeStoryImage
                    src={BAR_IMAGES[barStoryIndex]}
                    alt={`${story.title} ${barStoryIndex + 1}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : isRestaurantStory ? (
                  <CrossfadeStoryImage
                    src={chefImages[chefStoryIndex]}
                    alt={`${story.title} ${chefStoryIndex + 1}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : isHotelStory ? (
                  <CrossfadeStoryImage
                    src={ROOM_IMAGES.slice(1)[roomStoryIndex]}
                    alt={`${story.title} ${roomStoryIndex + 1}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <LandingImage src={story.image} alt={story.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-orange-200">{story.tag}</p>
                  <h3 className="mt-2 font-headline text-2xl leading-tight">{story.title}</h3>
                  <p className="mt-3 inline-flex items-center border-b border-white/50 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition group-hover:text-orange-200">
                    Open Story
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeStory ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={() => setActiveStory(null)}>
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-[#111111] text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:grid-cols-[1.1fr_0.9fr]" onClick={(event) => event.stopPropagation()}>
            <div className="relative min-h-[340px] md:min-h-[620px]">
              <LandingImage
                key={activeStory.images[activeStorySlide]}
                src={activeStory.images[activeStorySlide]}
                alt={`${activeStory.title} ${activeStorySlide + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex gap-2">
                {activeStory.images.map((image, index) => (
                  <button
                    key={`${image}-dot`}
                    type="button"
                    onClick={() => setActiveStorySlide(index)}
                    className={`h-1.5 flex-1 rounded-full transition ${activeStorySlide === index ? "bg-orange-400" : "bg-white/30 hover:bg-white/50"}`}
                    aria-label={`Show slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between p-6 md:p-10">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">{activeStory.tag}</p>
                    <h3 className="mt-3 font-headline text-4xl leading-tight">{activeStory.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStory(null)}
                    className="rounded-full border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-orange-200">{activeStory.eyebrow}</p>
                <p className="mt-3 max-w-md text-sm leading-7 text-white/80">{activeStory.description}</p>
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">Why Guests Notice It</p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      Real spaces, strong atmosphere, and a visual style that feels memorable from the first glance to the final impression.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">Orange Hotel Promise</p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      Designed to attract attention online and give guests a clear sense of the experience waiting inside the hotel.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Slide {activeStorySlide + 1} / {activeStory.images.length}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStory(null);
                    openBookingPopup();
                  }}
                  className="rounded-full bg-orange-500 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-orange-400"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showBookingPopup ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowBookingPopup(false)}>
          <div className="w-full max-w-lg rounded-[28px] bg-[#121212] p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Reservation Popup</p>
                <h3 className="mt-3 font-headline text-4xl leading-tight">Book Your Stay At Orange Hotel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingPopup(false)}
                className="rounded-full border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-white/78">
              Choose your preferred room class, then continue to the reservation form to confirm dates, guests, and contact details.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRoomType("standard")}
                className={`rounded-2xl border px-5 py-5 text-left transition ${roomType === "standard" ? "border-orange-400 bg-orange-500/15" : "border-white/10 bg-white/5 hover:border-white/30"}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">Standard</p>
                <p className="mt-2 text-sm text-white/75">Comfortable stay option for business and leisure guests.</p>
                <p className="mt-4 font-black">{formatTzs(INVENTORY.standard.price)} / night</p>
              </button>
              <button
                type="button"
                onClick={() => setRoomType("platinum")}
                className={`rounded-2xl border px-5 py-5 text-left transition ${roomType === "platinum" ? "border-orange-400 bg-orange-500/15" : "border-white/10 bg-white/5 hover:border-white/30"}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">Platinum</p>
                <p className="mt-2 text-sm text-white/75">A more elevated stay with premium room experience and privacy.</p>
                <p className="mt-4 font-black">{formatTzs(INVENTORY.platinum.price)} / night</p>
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Selected Room: {roomType}</p>
              <button
                type="button"
                onClick={continueToBookingForm}
                className="rounded-full bg-orange-500 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-orange-400"
              >
                Open Booking Form
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="relative overflow-hidden rounded-sm px-6 py-16 text-center text-white md:px-10">
          <LandingImage
            key={experienceImages[experienceShowcaseIndex]}
            src={experienceImages[experienceShowcaseIndex]}
            alt={`Orange Experience ${experienceShowcaseIndex + 1}`}
            fill
            sizes="100vw"
            className="object-cover transition-all duration-[1800ms]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.48)_45%,rgba(245,124,0,0.28)_100%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Orange Experience</p>
            <h2 className="mt-3 font-headline text-5xl">Rooms, Restaurant, And Bar</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80">Book your stay, start with breakfast, enjoy lunch in the restaurant, and close the day with signature drinks at the bar.</p>
            <a href="#book" className="mt-8 inline-block border-b border-orange-300 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              Discover More
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="grid overflow-hidden rounded-sm bg-[#3a3a3a] text-white md:grid-cols-3">
          <div className="relative min-h-[260px] px-8 py-12 text-center">
            <LandingImage src={MAIN_ROOM_IMAGE} alt="Orange Hotel luxury room" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative flex h-full items-center justify-center">
            <h3 className="font-headline text-3xl">Comfortable Stays</h3>
            </div>
          </div>
          <div className="relative min-h-[260px] border-y border-white/20 px-8 py-12 text-center md:border-x md:border-y-0">
            <LandingImage src={LUNCH_IMAGES[2]} alt="Orange Hotel dining" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative flex h-full items-center justify-center">
            <h3 className="font-headline text-3xl">Great Dining</h3>
            </div>
          </div>
          <div className="relative min-h-[260px] px-8 py-12 text-center">
            <LandingImage src={BAR_IMAGES[1]} alt="Orange Hotel bar" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative flex h-full items-center justify-center">
            <h3 className="font-headline text-3xl">Evening Bar Vibes</h3>
            </div>
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

      <footer className="border-t border-white/10 bg-[#0b0b0b] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[1.1fr_1fr_1.1fr]">
          <div className="max-w-md">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Orange Hotel</p>
            <h3 className="mt-3 font-headline text-4xl leading-tight">Luxury Stay With Precision Hospitality</h3>
            <p className="mt-4 text-sm leading-7 text-white/72">
              A modern luxury stay shaped around comfort, precision service, and secure online booking.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Contact</p>
            <div className="mt-5 space-y-3">
              <a
                href="mailto:orangehotelarusha@gmail.com"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:border-orange-400/50 hover:bg-white/10 hover:text-white"
              >
                <Mail className="h-4 w-4 text-orange-300" />
                <span>orangehotelarusha@gmail.com</span>
              </a>
              <a
                href="tel:+255702693911"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:border-orange-400/50 hover:bg-white/10 hover:text-white"
              >
                <Phone className="h-4 w-4 text-orange-300" />
                <span>+255702693911</span>
              </a>
              <a
                href="https://www.instagram.com/orangehotelarusha/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:border-orange-400/50 hover:bg-white/10 hover:text-white"
              >
                <Instagram className="h-4 w-4 text-orange-300" />
                <span>Instagram: orangehotelarusha</span>
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Location</p>
            <div className="mt-5 space-y-4">
              <a
                href="https://google.com/maps/dir//Orange+Hotel,+Colonel+Middleton+Rd,+Arusha/@-3.3723504,36.6849352,15z/data=!3m1!4b1!4m8!4m7!1m0!1m5!1m1!1s0x18371d2bb7e9ac29:0x7365b393cb52b793!2m2!1d36.6840467!2d-3.3675175?entry=ttu&g_ep=EgoyMDI2MDMxMC4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:border-orange-400/50 hover:bg-white/10 hover:text-white"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                <span>Orange Hotel, Colonel Middleton Rd, Arusha</span>
              </a>
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-2">
                <iframe
                  title="Orange Hotel map"
                  src="https://www.google.com/maps?q=Orange+Hotel,+Colonel+Middleton+Rd,+Arusha&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-44 w-full rounded-[16px] border-0"
                />
              </div>
              <a
                href="#book"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-orange-400"
              >
                Book Now
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-4 right-4 z-[120] md:bottom-6 md:right-6">
        {showChatWidget ? (
          <div className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between bg-black px-5 py-4 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Live Chat</p>
                <p className="mt-1 font-headline text-2xl leading-none">Orange Hotel Support</p>
              </div>
              <button
                type="button"
                onClick={() => setShowChatWidget(false)}
                className="rounded-full border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/75 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-[320px] space-y-3 overflow-y-auto bg-[#f8f6f3] px-4 py-4">
              {chatThread ? (
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/40">
                  Conversation Date: {new Date(chatThread.createdAt).toLocaleDateString()}
                </div>
              ) : null}
              {chatThread?.messages.length ? (
                chatThread.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === "guest" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === "guest" ? "bg-orange-500 text-white" : "bg-white text-black shadow-sm"}`}>
                      {message.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-black shadow-sm">
                  Start a conversation and reception will reply from the dashboard.
                </div>
              )}
            </div>

            {!chatThread ? (
              <div className="grid gap-3 border-t px-4 py-4">
                <input
                  value={chatGuestName}
                  onChange={(event) => setChatGuestName(event.target.value)}
                  placeholder="Your name"
                  className="h-11 rounded-xl border border-black/10 px-4 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
                <input
                  value={chatGuestContact}
                  onChange={(event) => setChatGuestContact(event.target.value)}
                  placeholder="Phone or email"
                  className="h-11 rounded-xl border border-black/10 px-4 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
              </div>
            ) : null}

            <div className="border-t bg-white px-4 py-4">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Write your message..."
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
                <button
                  type="button"
                  onClick={sendChatMessage}
                  disabled={!chatMessage.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send live chat message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowChatWidget((current) => !current)}
          className="flex items-center gap-3 rounded-full border border-white/20 bg-orange-500 px-5 py-4 text-white shadow-[0_18px_44px_rgba(245,124,0,0.45)] transition hover:scale-105 hover:bg-orange-400"
          aria-label="Open live chat"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <MessageCircle className="h-6 w-6" />
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Need Help?</span>
            <span className="block text-sm font-black uppercase tracking-[0.16em]">Live Chat</span>
          </span>
        </button>
      </div>
    </main>
  );
}
