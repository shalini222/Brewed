/**
 * BREWED — BUSINESS CONFIGURATION
 *
 * Central source of truth for cafe operations.
 *
 * Client-specific business values should eventually be
 * changed here rather than inside pages/components.
 */

export const business = {
  currency: {
    code: "INR",
    symbol: "₹",
    locale: "en-IN",
    decimals: 0,
  },

  ordering: {
    minimumOrderValue: 0,

    delivery: {
      enabled: true,

      fee: 0,

      freeDeliveryThreshold: 0,

      radiusKm: 10,
    },

    pickup: {
      enabled: true,
    },

    guestCheckout: true,
  },

  payments: {
    online: true,

    cashOnDelivery: false,

    wallet: true,

    razorpay: true,
  },

  loyalty: {
    enabled: true,

    pointsPerHundred: 10,

    currencyUnit: 100,

    tiers: {
      bronze: {
        name: "Bronze",
        minimumPoints: 0,
        multiplier: 1,
      },

      silver: {
        name: "Silver",
        minimumPoints: 500,
        multiplier: 1,
      },

      gold: {
        name: "Gold",
        minimumPoints: 1500,
        multiplier: 1.5,
      },

      platinum: {
        name: "Platinum",
        minimumPoints: 3000,
        multiplier: 1.5,
      },
    },
  },

  orders: {
    cancellationWindowMinutes: 5,

    statuses: [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ],
  },

  delivery: {
    otp: {
      enabled: true,
      length: 6,
      expiryMinutes: 10,
      maxAttempts: 3,
    },

    tracking: {
      enabled: true,
      customerTracking: true,
      riderTracking: true,
    },
  },

  support: {
    enabled: true,

    businessHours: {
      enabled: false,
      open: "09:00",
      close: "22:00",
    },

    ticketAttachments: true,
  },

  reservations: {
    enabled: false,
  },

  notifications: {
    enabled: true,
  },

  tax: {
    enabled: true,
    rate: 0,
  },

  cafe: {
    name: "Brewed",

    timezone: "Asia/Kolkata",

    openingHours: {
      monday: { open: "08:00", close: "22:00" },
      tuesday: { open: "08:00", close: "22:00" },
      wednesday: { open: "08:00", close: "22:00" },
      thursday: { open: "08:00", close: "22:00" },
      friday: { open: "08:00", close: "22:00" },
      saturday: { open: "08:00", close: "23:00" },
      sunday: { open: "08:00", close: "23:00" },
    },
  },
};

export default business;
