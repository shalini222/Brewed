// functions/index.js

const { setGlobalOptions } = require("firebase-functions");

const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  defineSecret,
} = require("firebase-functions/params");

const logger = require("firebase-functions/logger");

const {
  initializeApp,
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const Razorpay = require("razorpay");

/*
|--------------------------------------------------------------------------
| Firebase Admin
|--------------------------------------------------------------------------
*/

initializeApp();

const db = getFirestore();

/*
|--------------------------------------------------------------------------
| Global Functions Configuration
|--------------------------------------------------------------------------
*/

setGlobalOptions({
  maxInstances: 10,
});

/*
|--------------------------------------------------------------------------
| Secrets
|--------------------------------------------------------------------------
*/

const razorpayKeyId =
  defineSecret("RAZORPAY_KEY_ID");

const razorpayKeySecret =
  defineSecret("RAZORPAY_KEY_SECRET");

/*
|--------------------------------------------------------------------------
| Reservation Defaults
|--------------------------------------------------------------------------
|
| These are fallbacks only.
| Your admin panel can later control these through:
|
| reservationSettings/general
|
*/

const DEFAULT_RESERVATION_SETTINGS = {
  enabled: true,

  openingTime: "08:00",
  closingTime: "22:00",

  slotIntervalMinutes: 30,

  reservationDurationMinutes: 90,

  defaultCapacityPerSlot: 20,

  minGuests: 1,
  maxGuests: 10,

  advanceBookingDays: 30,
};

/*
|--------------------------------------------------------------------------
| Utility Functions
|--------------------------------------------------------------------------
*/

const pad = (value) =>
  String(value).padStart(2, "0");

const getTodayString = () => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(
    now.getMonth() + 1
  )}-${pad(now.getDate())}`;
};

const isValidDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidTime = (value) =>
  typeof value === "string" &&
  /^\d{2}:\d{2}$/.test(value);

const timeToMinutes = (time) => {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);

  const mins = minutes % 60;

  return `${pad(hours)}:${pad(mins)}`;
};

const addDays = (
  dateString,
  amount
) => {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  date.setDate(
    date.getDate() + amount
  );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
};

const generateSlots = (settings) => {
  const slots = [];

  const opening =
    timeToMinutes(
      settings.openingTime
    );

  const closing =
    timeToMinutes(
      settings.closingTime
    );

  const interval = Number(
    settings.slotIntervalMinutes
  );

  const duration = Number(
    settings.reservationDurationMinutes
  );

  if (
    !Number.isFinite(opening) ||
    !Number.isFinite(closing) ||
    !Number.isFinite(interval) ||
    !Number.isFinite(duration) ||
    interval <= 0 ||
    duration <= 0 ||
    closing <= opening
  ) {
    return slots;
  }

  for (
    let current = opening;
    current + duration <= closing;
    current += interval
  ) {
    slots.push(
      minutesToTime(current)
    );
  }

  return slots;
};

const cleanString = (
  value,
  maxLength
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
};

const normalizePhone = (
  value
) => {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .slice(0, 15);
};

const generateReservationCode =
  () => {
    const random = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `BR-${Date.now()
      .toString()
      .slice(-8)}-${random}`;
  };

/*
|--------------------------------------------------------------------------
| RAZORPAY
|--------------------------------------------------------------------------
|
| Your existing production function.
|
*/

exports.createRazorpayOrder =
  onCall(
    {
      invoker: "public",
      secrets: [
        razorpayKeyId,
        razorpayKeySecret,
      ],
    },

    async (request) => {
      try {
        if (!request.auth) {
          throw new HttpsError(
            "unauthenticated",
            "You must be logged in to make a payment."
          );
        }

        const {
          amount,
        } = request.data || {};

        logger.info(
          "Razorpay request received",
          {
            userId:
              request.auth.uid,

            amount,

            hasKeyId:
              !!razorpayKeyId.value(),

            hasKeySecret:
              !!razorpayKeySecret.value(),
          }
        );

        if (
          typeof amount !==
            "number" ||
          !Number.isFinite(
            amount
          ) ||
          amount <= 0
        ) {
          throw new HttpsError(
            "invalid-argument",
            "A valid payment amount is required."
          );
        }

        const amountInPaise =
          Math.round(
            amount * 100
          );

        const razorpay =
          new Razorpay({
            key_id:
              razorpayKeyId.value(),

            key_secret:
              razorpayKeySecret.value(),
          });

        const order =
          await razorpay.orders.create(
            {
              amount:
                amountInPaise,

              currency: "INR",

              receipt: `brew_${Date.now()}`,
            }
          );

        logger.info(
          "Razorpay order created successfully",
          {
            orderId:
              order.id,

            userId:
              request.auth.uid,

            amount,
          }
        );

        return {
          success: true,

          orderId:
            order.id,

          amount:
            order.amount,

          currency:
            order.currency,

          keyId:
            razorpayKeyId.value(),
        };
      } catch (error) {
        logger.error(
          "🔥 RAZORPAY ORDER CREATION FAILED",
          {
            message:
              error?.message,

            name:
              error?.name,

            code:
              error?.code,

            description:
              error?.description,

            statusCode:
              error?.statusCode,
          }
        );

        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          error?.message ||
            "Unable to create Razorpay order."
        );
      }
    }
  );

/*
|--------------------------------------------------------------------------
| CREATE RESERVATION
|--------------------------------------------------------------------------
|
| Customer:
|
| ReservationPage.jsx
|       ↓
| createReservation()
|       ↓
| Firestore transaction
|       ↓
| reservation + slot update
|
|--------------------------------------------------------------------------
*/

exports.createReservation =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      try {
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */

        if (!request.auth) {
          throw new HttpsError(
            "unauthenticated",
            "You must be logged in to make a reservation."
          );
        }

        const uid =
          request.auth.uid;

        /*
        |--------------------------------------------------------------------------
        | Request data
        |--------------------------------------------------------------------------
        */

        const {
          date,
          time,
          guests,
          customerName,
          phone,
          note,
        } =
          request.data || {};

        /*
        |--------------------------------------------------------------------------
        | Load reservation settings
        |--------------------------------------------------------------------------
        */

        const settingsRef =
          db.doc(
            "reservationSettings/general"
          );

        const settingsSnap =
          await settingsRef.get();

        const settings = {
          ...DEFAULT_RESERVATION_SETTINGS,

          ...(settingsSnap.exists
            ? settingsSnap.data()
            : {}),
        };

        /*
        |--------------------------------------------------------------------------
        | Reservations enabled?
        |--------------------------------------------------------------------------
        */

        if (!settings.enabled) {
          throw new HttpsError(
            "failed-precondition",
            "Reservations are currently closed.",
            {
              reason:
                "reservation/closed",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Validate date
        |--------------------------------------------------------------------------
        */

        if (
          !isValidDate(date)
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Invalid reservation date.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        const today =
          getTodayString();

        const maxDate =
          addDays(
            today,
            Number(
              settings.advanceBookingDays
            )
          );

        if (
          date < today ||
          date > maxDate
        ) {
          throw new HttpsError(
            "invalid-argument",
            "This reservation date is unavailable.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Validate time
        |--------------------------------------------------------------------------
        */

        if (
          !isValidTime(time)
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Invalid reservation time.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        const validSlots =
          generateSlots(
            settings
          );

        if (
          !validSlots.includes(
            time
          )
        ) {
          throw new HttpsError(
            "invalid-argument",
            "This reservation time is unavailable.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent booking a past time today
        |--------------------------------------------------------------------------
        */

        if (date === today) {
          const now =
            new Date();

          const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

          const slotMinutes =
            timeToMinutes(time);

          if (
            slotMinutes <=
            currentMinutes
          ) {
            throw new HttpsError(
              "invalid-argument",
              "This reservation time has already passed.",
              {
                reason:
                  "reservation/invalid",
              }
            );
          }
        }

        /*
        |--------------------------------------------------------------------------
        | Validate guests
        |--------------------------------------------------------------------------
        */

        const guestCount =
          Number(guests);

        const minGuests =
          Number(
            settings.minGuests
          );

        const maxGuests =
          Number(
            settings.maxGuests
          );

        if (
          !Number.isInteger(
            guestCount
          ) ||
          guestCount <
            minGuests ||
          guestCount >
            maxGuests
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Invalid number of guests.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Customer information
        |--------------------------------------------------------------------------
        */

        const safeName =
          cleanString(
            customerName,
            100
          );

        const safePhone =
          normalizePhone(phone);

        const safeNote =
          cleanString(
            note,
            500
          );

        if (
          safeName.length < 2
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Please provide a valid name.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        if (
          safePhone.length < 10
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Please provide a valid phone number.",
            {
              reason:
                "reservation/invalid",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate active reservation
        |--------------------------------------------------------------------------
        */

        const duplicateQuery =
          await db
            .collection(
              "reservations"
            )
            .where(
              "userId",
              "==",
              uid
            )
            .where(
              "date",
              "==",
              date
            )
            .where(
              "time",
              "==",
              time
            )
            .where(
              "status",
              "in",
              [
                "pending",
                "confirmed",
              ]
            )
            .limit(1)
            .get();

        if (
          !duplicateQuery.empty
        ) {
          throw new HttpsError(
            "already-exists",
            "You already have a reservation for this time.",
            {
              reason:
                "reservation/duplicate",
            }
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Slot
        |--------------------------------------------------------------------------
        */

        const slotId =
          `${date}_${time.replace(
            ":",
            "-"
          )}`;

        const slotRef =
          db.doc(
            `reservationSlots/${slotId}`
          );

        const reservationRef =
          db
            .collection(
              "reservations"
            )
            .doc();

        const reservationCode =
          generateReservationCode();

        /*
        |--------------------------------------------------------------------------
        | ATOMIC TRANSACTION
        |--------------------------------------------------------------------------
        |
        | This is the important production part.
        |
        | Two customers cannot both successfully
        | claim the last available capacity.
        |
        */

        await db.runTransaction(
          async (
            transaction
          ) => {
            const slotSnap =
              await transaction.get(
                slotRef
              );

            let capacity =
              Number(
                settings.defaultCapacityPerSlot
              );

            let bookedGuests = 0;

            if (
              slotSnap.exists
            ) {
              const slot =
                slotSnap.data();

              capacity =
                Number(
                  slot.capacity ??
                    capacity
                );

              bookedGuests =
                Number(
                  slot.bookedGuests ||
                    0
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Final capacity check
            |--------------------------------------------------------------------------
            */

            if (
              bookedGuests +
                guestCount >
              capacity
            ) {
              throw new HttpsError(
                "resource-exhausted",
                "This reservation slot is full.",
                {
                  reason:
                    "reservation/slot-full",
                }
              );
            }

            const newBookedGuests =
              bookedGuests +
              guestCount;

            /*
            |--------------------------------------------------------------------------
            | Update slot
            |--------------------------------------------------------------------------
            */

            transaction.set(
              slotRef,
              {
                date,

                time,

                capacity,

                bookedGuests:
                  newBookedGuests,

                available:
                  newBookedGuests <
                  capacity,

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            /*
            |--------------------------------------------------------------------------
            | Create reservation
            |--------------------------------------------------------------------------
            */

            transaction.create(
              reservationRef,
              {
                reservationCode,

                userId: uid,

                customerName:
                  safeName,

                phone:
                  safePhone,

                email:
                  request.auth
                    ?.token
                    ?.email || "",

                date,

                time,

                guests:
                  guestCount,

                note:
                  safeNote,

                status:
                  "pending",

                slotId,

                source:
                  "customer",

                createdAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              }
            );
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Logging
        |--------------------------------------------------------------------------
        */

        logger.info(
          "Reservation created",
          {
            reservationId:
              reservationRef.id,

            reservationCode,

            userId: uid,

            date,

            time,

            guests:
              guestCount,
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return {
          success: true,

          reservationId:
            reservationRef.id,

          reservationCode,

          status:
            "pending",

          date,

          time,

          guests:
            guestCount,
        };
      } catch (error) {
        logger.error(
          "🔥 RESERVATION CREATION FAILED",
          {
            message:
              error?.message,

            code:
              error?.code,

            userId:
              request.auth?.uid,
          }
        );

        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "Unable to create reservation."
        );
      }
    }
  );

/*
|--------------------------------------------------------------------------
| CANCEL RESERVATION
|--------------------------------------------------------------------------
|
| Customer cancellation also happens server-side
| so the slot capacity is correctly released.
|
|--------------------------------------------------------------------------
*/

exports.cancelReservation =
  onCall(
    {
      region: "asia-south1",
    },

    async (request) => {
      try {
        /*
        |--------------------------------------------------------------------------
        | Authentication
        |--------------------------------------------------------------------------
        */

        if (!request.auth) {
          throw new HttpsError(
            "unauthenticated",
            "You must be signed in."
          );
        }

        const uid =
          request.auth.uid;

        const {
          reservationId,
        } =
          request.data || {};

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (
          typeof reservationId !==
            "string" ||
          reservationId.length <
            10 ||
          reservationId.length >
            150
        ) {
          throw new HttpsError(
            "invalid-argument",
            "Invalid reservation."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Reservation
        |--------------------------------------------------------------------------
        */

        const reservationRef =
          db.doc(
            `reservations/${reservationId}`
          );

        /*
        |--------------------------------------------------------------------------
        | Atomic cancellation
        |--------------------------------------------------------------------------
        */

        await db.runTransaction(
          async (
            transaction
          ) => {
            const reservationSnap =
              await transaction.get(
                reservationRef
              );

            if (
              !reservationSnap.exists
            ) {
              throw new HttpsError(
                "not-found",
                "Reservation not found."
              );
            }

            const reservation =
              reservationSnap.data();

            /*
            |--------------------------------------------------------------------------
            | Ownership
            |--------------------------------------------------------------------------
            */

            if (
              reservation.userId !==
              uid
            ) {
              throw new HttpsError(
                "permission-denied",
                "You cannot cancel this reservation."
              );
            }

            /*
            |--------------------------------------------------------------------------
            | Idempotency
            |--------------------------------------------------------------------------
            */

            if (
              reservation.status ===
              "cancelled"
            ) {
              return;
            }

            /*
            |--------------------------------------------------------------------------
            | Valid statuses
            |--------------------------------------------------------------------------
            */

            if (
              ![
                "pending",
                "confirmed",
              ].includes(
                reservation.status
              )
            ) {
              throw new HttpsError(
                "failed-precondition",
                "This reservation can no longer be cancelled."
              );
            }

            /*
            |--------------------------------------------------------------------------
            | Slot
            |--------------------------------------------------------------------------
            */

            if (
              !reservation.slotId
            ) {
              throw new HttpsError(
                "failed-precondition",
                "Reservation slot information is missing."
              );
            }

            const slotRef =
              db.doc(
                `reservationSlots/${reservation.slotId}`
              );

            const slotSnap =
              await transaction.get(
                slotRef
              );

            /*
            |--------------------------------------------------------------------------
            | Release capacity
            |--------------------------------------------------------------------------
            */

            if (
              slotSnap.exists
            ) {
              const slot =
                slotSnap.data();

              const currentBooked =
                Number(
                  slot.bookedGuests ||
                    0
                );

              const reservationGuests =
                Number(
                  reservation.guests ||
                    0
                );

              const newBooked =
                Math.max(
                  0,
                  currentBooked -
                    reservationGuests
                );

              transaction.update(
                slotRef,
                {
                  bookedGuests:
                    newBooked,

                  available:
                    newBooked <
                    Number(
                      slot.capacity ||
                        0
                    ),

                  updatedAt:
                    FieldValue.serverTimestamp(),
                }
              );
            }

            /*
            |--------------------------------------------------------------------------
            | Cancel reservation
            |--------------------------------------------------------------------------
            */

            transaction.update(
              reservationRef,
              {
                status:
                  "cancelled",

                cancelledAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              }
            );
          }
        );

        logger.info(
          "Reservation cancelled",
          {
            reservationId,

            userId: uid,
          }
        );

        return {
          success: true,
        };
      } catch (error) {
        logger.error(
          "🔥 RESERVATION CANCELLATION FAILED",
          {
            message:
              error?.message,

            code:
              error?.code,

            userId:
              request.auth?.uid,
          }
        );

        if (
          error instanceof
          HttpsError
        ) {
          throw error;
        }

        throw new HttpsError(
          "internal",
          "Unable to cancel reservation."
        );
      }
    }
  );
