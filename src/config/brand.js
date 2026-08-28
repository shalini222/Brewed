/**
 * BREWED — BRAND CONFIGURATION
 *
 * Single source of truth for:
 * - Brand identity
 * - Typography
 * - Logo assets
 * - Contact/social information
 *
 * Keep client-specific values here when deploying Brewed
 * as a reusable restaurant/cafe product.
 */

export const brand = {
  name: "Brewed",

  shortName: "Brewed",

  tagline: "Coffee, thoughtfully brewed.",

  description:
    "A modern cafe experience for ordering handcrafted coffee, food, rewards, and more.",

  version: "1.0.0",

  logo: {
    src: "/assets/brand/logo.png",
    alt: "Brewed",
    mark: "/assets/brand/favicon.png",
  },

  typography: {
    body: "Inter",
    display: "Playfair Display",
  },

  contact: {
    email: "",
    phone: "",
  },

  social: {
    instagram: "",
    facebook: "",
    twitter: "",
  },

  legal: {
    businessName: "Brewed",
    copyright: "Brewed",
  },
};

export default brand;
