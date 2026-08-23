// src/pages/ReservationPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Loader2,
  MapPin,
  MessageSquareText,
  Minus,
  Phone,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db, functions } from "../firebase";

const DEFAULT_SETTINGS = {
  enabled: true,
  openingTime: "08:00",
  closingTime: "22:00",
  slotIntervalMinutes: 30,
  reservationDurationMinutes: 90,
  defaultCapacityPerSlot: 4,
  minGuests: 1,
  maxGuests: 10,
  advanceBookingDays: 30,
};

const getDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (dateString, amount) => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return getDateString(date);
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
};

const formatTime = (time) => {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
};

const normalizePhone = (value) =>
  value.replace(/[^\d+]/g, "").slice(0, 15);

const generateSlots = (settings) => {
  const opening = timeToMinutes(settings.openingTime);
  const closing = timeToMinutes(settings.closingTime);
  const interval = Number(settings.slotIntervalMinutes || 30);
  const duration = Number(
    settings.reservationDurationMinutes || 90
  );

  const slots = [];

  for (
    let current = opening;
    current + duration <= closing;
    current += interval
  ) {
    slots.push(minutesToTime(current));
  }

  return slots;
};

const isPastSlot = (date, time) => {
  const today = getDateString();

  if (date !== today) return false;

  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  const slot = new Date();
  slot.setHours(hours, minutes, 0, 0);

  return slot <= now;
};

export default function ReservationPage({setPage} ) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [date, setDate] = useState(getDateString());
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [availability, setAvailability] = useState({});
  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [confirmation, setConfirmation] = useState(null);

  /*
   * ------------------------------------------------------
   * Load reservation settings
   * ------------------------------------------------------
   */

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const settingsSnap = await getDoc(
          doc(db, "reservationSettings", "general")
        );

        if (!active) return;

        if (settingsSnap.exists()) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...settingsSnap.data(),
          });
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            "Unable to load reservation settings."
          );
        }
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  /*
   * ------------------------------------------------------
   * User defaults
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!user) return;

    setName((current) =>
      current || user.displayName || ""
    );

    setPhone((current) =>
      current || user.phoneNumber || ""
    );
  }, [user]);

  /*
   * ------------------------------------------------------
   * Date limits
   * ------------------------------------------------------
   */

  const minDate = getDateString();

  const maxDate = useMemo(
    () =>
      addDays(
        minDate,
        Number(settings.advanceBookingDays || 30)
      ),
    [minDate, settings.advanceBookingDays]
  );

  /*
   * ------------------------------------------------------
   * Slots
   * ------------------------------------------------------
   */

  const slots = useMemo(
    () => generateSlots(settings),
    [settings]
  );

  /*
   * ------------------------------------------------------
   * Load slot availability
   *
   * Read-only. The server still performs the final
   * capacity validation when booking.
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!date || !settings.enabled) return;

    let active = true;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);

      try {
        const slotsQuery = query(
          collection(db, "reservationSlots"),
          where("date", "==", date)
        );

        const snapshot = await getDocs(slotsQuery);

        if (!active) return;

        const result = {};

        snapshot.forEach((slotDoc) => {
          const data = slotDoc.data();

          result[data.time] = {
            capacity: Number(data.capacity || 0),
            bookedGuests: Number(
              data.bookedGuests || 0
            ),
          };
        });

        setAvailability(result);

        if (
          time &&
          result[time] &&
          result[time].bookedGuests + guests >
            result[time].capacity
        ) {
          setTime("");
        }
      } catch (err) {
        console.error(
          "Availability error:",
          err
        );

        setAvailability({});
      } finally {
        if (active) {
          setAvailabilityLoading(false);
        }
      }
    };

    loadAvailability();

    return () => {
      active = false;
    };
  }, [date, settings.enabled, guests]);

  /*
   * ------------------------------------------------------
   * Slot availability
   * ------------------------------------------------------
   */

  const getCapacity = (slot) =>
    Number(
      availability[slot]?.capacity ??
        settings.defaultCapacityPerSlot
    );

  const getBooked = (slot) =>
    Number(
      availability[slot]?.bookedGuests || 0
    );

  const getRemaining = (slot) =>
    Math.max(
      0,
      getCapacity(slot) - getBooked(slot)
    );

  const isUnavailable = (slot) => {
    if (isPastSlot(date, slot)) return true;

    return getRemaining(slot) < guests;
  };

  /*
   * ------------------------------------------------------
   * Guest controls
   * ------------------------------------------------------
   */

  const incrementGuests = () => {
    setGuests((current) =>
      Math.min(
        current + 1,
        Number(settings.maxGuests)
      )
    );

    setTime("");
  };

  const decrementGuests = () => {
    setGuests((current) =>
      Math.max(
        current - 1,
        Number(settings.minGuests)
      )
    );

    setTime("");
  };

  /*
   * ------------------------------------------------------
   * Validation
   * ------------------------------------------------------
   */

  const validateStepOne = () => {
    if (!date) {
      setError("Please choose a date.");
      return false;
    }

    if (!time) {
      setError("Please choose a time.");
      return false;
    }

    if (isUnavailable(time)) {
      setError(
        "That time is no longer available."
      );

      setTime("");
      return false;
    }

    setError("");
    return true;
  };

  const validateStepTwo = () => {
    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);

    if (cleanName.length < 2) {
      setError("Please enter your name.");
      return false;
    }

    if (cleanPhone.length < 10) {
      setError(
        "Please enter a valid phone number."
      );
      return false;
    }

    setError("");
    return true;
  };

  /*
   * ------------------------------------------------------
   * Create reservation
   *
   * IMPORTANT:
   * The callable function is the authority.
   * ------------------------------------------------------
   */

  const handleConfirm = async () => {
    if (loading) return;

    if (!user) {
      navigate("/login", {
        state: {
          from: "/reservation",
        },
      });

      return;
    }

    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    if (!validateStepTwo()) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const createReservation =
        httpsCallable(
          functions,
          "createReservation"
        );

      const result =
        await createReservation({
          date,
          time,
          guests,
          customerName: name.trim(),
          phone: normalizePhone(phone),
          note: note.trim().slice(0, 500),
        });

      setConfirmation(result.data);
      setStep(4);
    } catch (err) {
      console.error(
        "Reservation creation failed:",
        err
      );

      const code = err?.code || "";

      if (
        code.includes(
          "reservation/slot-full"
        )
      ) {
        setError(
          "That slot just filled up. Please choose another time."
        );

        setTime("");
        setStep(1);
      } else if (
        code.includes(
          "reservation/closed"
        )
      ) {
        setError(
          "Reservations are currently closed."
        );
      } else if (
        code.includes(
          "reservation/invalid"
        )
      ) {
        setError(
          err.message ||
            "Please check your reservation details."
        );
      } else {
        setError(
          "Something went wrong while creating your reservation. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------
   * Loading
   * ------------------------------------------------------
   */

  if (settingsLoading) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <Loader2
          className="animate-spin text-[#806b56]"
          size={26}
        />
      </main>
    );
  }

  /*
   * ------------------------------------------------------
   * Reservations disabled
   * ------------------------------------------------------
   */

  if (!settings.enabled) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-5">
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
          <div className="w-full rounded-[32px] bg-white p-10 text-center shadow-sm">
            <Coffee
              size={30}
              className="mx-auto text-[#806b56]"
            />

            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              Reservations are closed
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#827970]">
              We're not accepting reservations at
              the moment. Please check back later.
            </p>

            <button
              onClick={() => navigate("/menu")}
              className="mt-7 rounded-full bg-[#302a25] px-7 py-3 text-sm font-semibold text-white"
            >
              Back to menu
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------
   * Confirmation
   * ------------------------------------------------------
   */

  if (step === 4 && confirmation) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-5 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[34px] bg-white p-7 text-center shadow-[0_20px_70px_rgba(48,42,37,.07)] sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f0e6] text-[#60745d]">
              <CheckCircle2
                size={40}
                strokeWidth={1.5}
              />
            </div>

            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[.2em] text-[#9a8062]">
              Reservation received
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-[-.045em]">
              See you at Brewed.
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#81776e]">
              Your reservation has been received
              and is waiting for confirmation.
            </p>

            <div className="mt-8 rounded-[26px] bg-[#f8f5ef] p-6 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9a8062]">
                Reservation ID
              </p>

              <p className="mt-2 font-mono text-sm font-semibold">
                {confirmation.reservationCode}
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[.15em] text-[#a29486]">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(date)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[.15em] text-[#a29486]">
                    Time
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {formatTime(time)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[.15em] text-[#a29486]">
                    Guests
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {guests}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[.15em] text-[#a29486]">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#927958]">
                    Pending confirmation
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/menu")}
              className="mt-8 w-full rounded-full bg-[#302a25] py-4 text-sm font-semibold text-white"
            >
              Back to menu
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------
   * Main UI
   * ------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#302a25]">
      <header className="border-b border-[#e9e1d7] bg-[#f8f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#eee8df]"
          >
            <ChevronLeft size={19} />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Coffee size={16} />
              <span className="font-semibold">
                Brewed
              </span>
            </div>

            <p className="text-[9px] uppercase tracking-[.2em] text-[#9a8062]">
              Reservations
            </p>
          </div>

          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-7 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#9a8062]">
            <Sparkles size={15} />

            <span className="text-[10px] font-semibold uppercase tracking-[.2em]">
              Your table awaits
            </span>
          </div>

          <h1 className="mt-3 max-w-xl text-[38px] font-semibold leading-[1.05] tracking-[-.05em] sm:text-5xl">
            Make a little room
            <br />
            for something lovely.
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-6 text-[#81776e]">
            Reserve your spot at Brewed for coffee,
            food and good company.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#e4caca] bg-[#fff7f6] px-4 py-3 text-sm text-[#8c514c]">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[30px] bg-white p-5 shadow-[0_18px_60px_rgba(54,42,31,.06)] sm:p-8">
            {/* STEP 1 */}

            {step === 1 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a8062]">
                  Step 01
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  When are you joining us?
                </h2>

                <label className="mt-7 block text-sm font-semibold">
                  Date
                </label>

                <div className="relative mt-2">
                  <CalendarDays
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8062]"
                  />

                  <input
                    type="date"
                    value={date}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime("");
                      setError("");
                    }}
                    className="h-14 w-full rounded-2xl border border-[#e8e0d6] bg-[#fcfaf7] pl-12 pr-4 text-sm outline-none focus:border-[#9a8062]"
                  />
                </div>

                <label className="mt-7 block text-sm font-semibold">
                  Guests
                </label>

                <div className="mt-2 flex items-center justify-between rounded-2xl border border-[#e8e0d6] bg-[#fcfaf7] p-3.5">
                  <div className="flex items-center gap-3">
                    <Users
                      size={18}
                      className="text-[#9a8062]"
                    />

                    <span className="text-sm font-semibold">
                      {guests}{" "}
                      {guests === 1
                        ? "guest"
                        : "guests"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={decrementGuests}
                      disabled={
                        guests <=
                        settings.minGuests
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-30"
                    >
                      <Minus size={15} />
                    </button>

                    <button
                      onClick={incrementGuests}
                      disabled={
                        guests >=
                        settings.maxGuests
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-30"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <label className="text-sm font-semibold">
                    Available times
                  </label>

                  {availabilityLoading && (
                    <Loader2
                      size={15}
                      className="animate-spin text-[#9a8062]"
                    />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const unavailable =
                      isUnavailable(slot);

                    const selected =
                      time === slot;

                    return (
                      <button
                        key={slot}
                        disabled={unavailable}
                        onClick={() => {
                          setTime(slot);
                          setError("");
                        }}
                        className={`rounded-2xl border px-3 py-3.5 text-left transition ${
                          selected
                            ? "border-[#302a25] bg-[#302a25] text-white"
                            : unavailable
                            ? "cursor-not-allowed border-[#eee8df] bg-[#f7f4f0] text-[#b8aea4]"
                            : "border-[#e8e0d6] bg-[#fcfaf7] hover:border-[#9a8062]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock3 size={15} />

                          <span className="text-sm font-semibold">
                            {formatTime(slot)}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] opacity-60">
                          {isPastSlot(date, slot)
                            ? "Passed"
                            : unavailable
                            ? "Unavailable"
                            : `${getRemaining(
                                slot
                              )} seats left`}
                        </p>

                        {selected && (
                          <Check
                            size={14}
                            className="absolute"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={!time}
                  onClick={() => {
                    if (validateStepOne()) {
                      setStep(2);
                    }
                  }}
                  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#302a25] text-sm font-semibold text-white disabled:opacity-40"
                >
                  Continue
                  <ChevronRight size={17} />
                </button>
              </>
            )}

            {/* STEP 2 */}

            {step === 2 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a8062]">
                  Step 02
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  A few details
                </h2>

                <div className="mt-7 space-y-5">
                  <div>
                    <label className="text-sm font-semibold">
                      Full name
                    </label>

                    <input
                      value={name}
                      maxLength={100}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      autoComplete="name"
                      className="mt-2 h-14 w-full rounded-2xl border border-[#e8e0d6] bg-[#fcfaf7] px-4 text-sm outline-none focus:border-[#9a8062]"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Phone number
                    </label>

                    <div className="relative mt-2">
                      <Phone
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8062]"
                      />

                      <input
                        value={phone}
                        maxLength={15}
                        onChange={(e) =>
                          setPhone(
                            normalizePhone(
                              e.target.value
                            )
                          )
                        }
                        autoComplete="tel"
                        className="h-14 w-full rounded-2xl border border-[#e8e0d6] bg-[#fcfaf7] pl-11 pr-4 text-sm outline-none focus:border-[#9a8062]"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Special request{" "}
                      <span className="font-normal text-[#aaa098]">
                        (optional)
                      </span>
                    </label>

                    <div className="relative mt-2">
                      <MessageSquareText
                        size={17}
                        className="absolute left-4 top-4 text-[#9a8062]"
                      />

                      <textarea
                        value={note}
                        maxLength={500}
                        rows={4}
                        onChange={(e) =>
                          setNote(
                            e.target.value
                          )
                        }
                        className="w-full resize-none rounded-2xl border border-[#e8e0d6] bg-[#fcfaf7] px-11 py-4 text-sm outline-none focus:border-[#9a8062]"
                        placeholder="Birthday, accessibility request, seating preference..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setError("");
                      setStep(1);
                    }}
                    className="h-14 rounded-full border border-[#ddd4c8] text-sm font-semibold"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => {
                      if (validateStepTwo()) {
                        setStep(3);
                      }
                    }}
                    className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#302a25] text-sm font-semibold text-white"
                  >
                    Review
                    <ChevronRight size={17} />
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 */}

            {step === 3 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9a8062]">
                  Step 03
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Review your reservation
                </h2>

                <div className="mt-7 overflow-hidden rounded-[24px] border border-[#e8e0d6] bg-[#fcfaf7]">
                  <div className="border-b border-[#e8e0d6] p-5">
                    <p className="text-[10px] uppercase tracking-[.16em] text-[#9a8062]">
                      Date & time
                    </p>

                    <p className="mt-1.5 text-sm font-semibold">
                      {formatDate(date)}
                      {" · "}
                      {formatTime(time)}
                    </p>
                  </div>

                  <div className="border-b border-[#e8e0d6] p-5">
                    <p className="text-[10px] uppercase tracking-[.16em] text-[#9a8062]">
                      Guests
                    </p>

                    <p className="mt-1.5 text-sm font-semibold">
                      {guests}{" "}
                      {guests === 1
                        ? "guest"
                        : "guests"}
                    </p>
                  </div>

                  <div className="border-b border-[#e8e0d6] p-5">
                    <p className="text-[10px] uppercase tracking-[.16em] text-[#9a8062]">
                      Contact
                    </p>

                    <p className="mt-1.5 text-sm font-semibold">
                      {name}
                    </p>

                    <p className="mt-1 text-xs text-[#847a71]">
                      {phone}
                    </p>
                  </div>

                  {note && (
                    <div className="p-5">
                      <p className="text-[10px] uppercase tracking-[.16em] text-[#9a8062]">
                        Special request
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#6f665e]">
                        {note}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl bg-[#f2ece3] p-4 text-xs leading-5 text-[#776b60]">
                  Your reservation will be
                  created as <strong>pending</strong>.
                  The café can then confirm or decline
                  it from the admin panel.
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    disabled={loading}
                    onClick={() => setStep(2)}
                    className="h-14 rounded-full border border-[#ddd4c8] text-sm font-semibold disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    disabled={loading}
                    onClick={handleConfirm}
                    className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#302a25] text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Reserving...
                      </>
                    ) : (
                      <>
                        Confirm
                        <Check size={17} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Desktop summary */}

          <aside className="hidden lg:block">
            <div className="sticky top-8 rounded-[30px] bg-[#302a25] p-7 text-white">
              <Coffee size={20} />

              <p className="mt-7 text-[10px] uppercase tracking-[.2em] text-white/45">
                Your reservation
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Table for {guests}
              </h3>

              <div className="mt-7 space-y-5">
                <div className="flex gap-3">
                  <CalendarDays
                    size={17}
                    className="text-white/50"
                  />

                  <div>
                    <p className="text-xs text-white/40">
                      Date
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(date)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock3
                    size={17}
                    className="text-white/50"
                  />

                  <div>
                    <p className="text-xs text-white/40">
                      Time
                    </p>

                    <p className="mt-1 text-sm">
                      {time
                        ? formatTime(time)
                        : "Not selected"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users
                    size={17}
                    className="text-white/50"
                  />

                  <div>
                    <p className="text-xs text-white/40">
                      Guests
                    </p>

                    <p className="mt-1 text-sm">
                      {guests}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-white/45">
                Reservations are available up to{" "}
                {settings.advanceBookingDays} days
                ahead.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
