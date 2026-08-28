/**
 * BREWED — FEATURE CONFIGURATION
 *
 * Feature flags allow Brewed to be configured for different
 * restaurants/clients without rewriting application logic.
 */

export const features = {
  customer: {
    menu: true,
    productDetails: true,

    cart: true,
    checkout: true,

    guestCheckout: true,

    favorites: true,

    orders: true,
    orderTracking: true,

    notifications: true,

    profile: true,
    addresses: true,

    wallet: true,

    loyalty: true,
    rewards: true,

    coupons: true,

    reviews: true,

    support: true,

    reservations: false,

    search: true,
    filters: true,

    darkMode: true,
    reducedMotion: true,
  },

  admin: {
    dashboard: true,

    orders: true,
    menuManagement: true,
    coupons: true,

    customers: true,

    notifications: true,

    settings: true,

    support: true,

    riders: true,

    analytics: true,

    inventory: true,

    reviews: true,

    employees: true,

    reports: true,
  },

  rider: {
    enabled: true,

    earnings: true,
    tipping: true,

    payments: true,

    gpsTracking: true,
    customerLiveTracking: true,

    navigation: true,

    deliveryFailure: true,

    performance: true,

    notifications: true,

    deliveryIssues: true,

    customerRating: true,

    dutyStatus: true,

    adminNotifications: true,

    deliveryOtp: true,
  },

  platform: {
    authentication: true,

    googleAuthentication: true,

    googleMaps: true,

    razorpay: true,

    firebase: true,

    firestore: true,

    cloudFunctions: true,
  },
};

export default features;
