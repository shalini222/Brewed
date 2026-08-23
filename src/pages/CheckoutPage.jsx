import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";

import { httpsCallable } from "firebase/functions";

import { useCart } from "../context/CartContext";
import { auth, db, functions } from "../firebase";
import { checkDelivery } from "../service/deliveryService";
import walletService from "../service/walletService";

/* =========================================================
   THEME
========================================================= */

const THEME = {
  colors: {
    bgPage: "#FAF6F0",
    headerBg: "#1A0B05",
    cardBg: "#FFFFFF",
    cardBorder: "#E6DFD5",
    primary: "#C4956A",
    textDark: "#1A0B05",
    textMuted: "#70645C",
    success: "#4A7A5B",
    danger: "#DE6B48",
    soft: "#F5EFE8",
  },

  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'Inter', sans-serif",
  },
};

/* =========================================================
   GOOGLE MAPS LOADER
========================================================= */

const GOOGLE_MAPS_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

let googleMapsPromise = null;

const loadGoogleMaps = () => {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps is only available in the browser.")
    );
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(
      new Error(
        "Missing VITE_GOOGLE_MAPS_API_KEY environment variable."
      )
    );
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-brewed-google-maps="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps?.places) {
          resolve(window.google);
        } else {
          reject(
            new Error("Google Maps Places library failed to initialize.")
          );
        }
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Google Maps failed to load."));
      });

      return;
    }

    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}&libraries=places&v=weekly`;

    script.async = true;
    script.defer = true;
    script.dataset.brewedGoogleMaps = "true";

    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve(window.google);
      } else {
        reject(
          new Error(
            "Google Maps loaded but Places library is unavailable."
          )
        );
      }
    };

    script.onerror = () => {
      reject(new Error("Unable to load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

/* =========================================================
   RAZORPAY
========================================================= */

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[data-brewed-razorpay="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () =>
        resolve(!!window.Razorpay)
      );

      existing.addEventListener("error", () => resolve(false));

      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.dataset.brewedRazorpay = "true";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

/* =========================================================
   HELPERS
========================================================= */

const EMPTY_NEW_ADDRESS = {
  type: "Home",
  name: "",
  phone: "",
  house: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  formatted: "",
  latitude: null,
  longitude: null,
  placeId: "",
};

const buildAddressString = (address) => {
  if (!address) return "";

  return [
    address.house,
    address.street,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(
      `${address.state}, ${address.pincode}`,
      `${address.state} ${address.pincode}`
    );
};

const normalizeAddress = (address) => ({
  ...address,
  formatted:
    address.formatted ||
    buildAddressString(address),
});

/* =========================================================
   COMPONENT
========================================================= */

export default function CheckoutPage({
  setPage,
  orderSnapshot,
}) {
  const {
    cart,
    total,
    placeOrder,
    clearCart,
    addToCart,
    removeFromCart,
  } = useCart();

  const createRazorpayOrder = useMemo(
    () =>
      httpsCallable(
        functions,
        "createRazorpayOrder"
      ),
    []
  );

  /* =========================================================
     CORE STATE
  ========================================================= */

  const [status, setStatus] = useState("idle");

  const [paymentMethod, setPaymentMethod] =
    useState("online");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    instructions: "",
  });

  /* =========================================================
     ADDRESS STATE
  ========================================================= */

  const [addresses, setAddresses] = useState([]);

  const [selectedAddress, setSelectedAddress] =
    useState(null);

  const [showAddressPicker, setShowAddressPicker] =
    useState(false);

  const [showNewAddress, setShowNewAddress] =
    useState(false);

  const [newAddress, setNewAddress] =
    useState(EMPTY_NEW_ADDRESS);

  const [saveNewAddress, setSaveNewAddress] =
    useState(true);

  const [addressSaving, setAddressSaving] =
    useState(false);

  const [addressError, setAddressError] =
    useState("");

  const [mapsReady, setMapsReady] =
    useState(false);

  const [mapsError, setMapsError] =
    useState("");

  const [mapSearch, setMapSearch] =
    useState("");

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);

  /* =========================================================
     DELIVERY
  ========================================================= */

  const [deliveryLoading, setDeliveryLoading] =
    useState(false);

  const [deliveryAvailable, setDeliveryAvailable] =
    useState(null);

  const [deliveryInfo, setDeliveryInfo] =
    useState(null);

  /* =========================================================
     COUPON
  ========================================================= */

  const [coupon, setCoupon] = useState("");

  const [appliedCoupon, setAppliedCoupon] =
    useState(null);

  const [couponError, setCouponError] =
    useState("");

  /* =========================================================
     REWARDS
  ========================================================= */

  const [useRewards, setUseRewards] =
    useState(false);

  const [availableRewards, setAvailableRewards] =
    useState([]);

  const [selectedReward, setSelectedReward] =
    useState(null);

  const [
    loadingAvailableRewards,
    setLoadingAvailableRewards,
  ] = useState(true);

  /* =========================================================
     LOYALTY
  ========================================================= */

  const [loyaltyEnabled, setLoyaltyEnabled] =
    useState(true);

  const [loyaltySettings, setLoyaltySettings] =
    useState(null);

  /* =========================================================
     WALLET
  ========================================================= */

  const [wallet, setWallet] = useState(null);

  const [walletLoading, setWalletLoading] =
    useState(true);

  const [useWallet, setUseWallet] =
    useState(false);

  /* =========================================================
     ORDER
  ========================================================= */

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [completedOrder, setCompletedOrder] =
    useState(null);

  const canvasRef = useRef(null);

  /* =========================================================
     CONFIG
  ========================================================= */

  const CONFIG = {
    taxRate: 0.08,
    codFee: 30,
  };

  /* =========================================================
     CALCULATIONS
  ========================================================= */

  const calculations = useMemo(() => {
    const subtotal =
      Number.isFinite(total) ? total : 0;

    const tax = Math.round(
      subtotal * CONFIG.taxRate
    );

    let rewardDiscount = 0;

    if (selectedReward?.menuItem) {
      rewardDiscount =
        selectedReward.menuItem.price || 0;
    }

    let delivery = 0;

    if (
      subtotal > 0 &&
      deliveryInfo
    ) {
      if (
        subtotal >=
        Number(deliveryInfo.freeDeliveryAbove || 0)
      ) {
        delivery = 0;
      } else {
        delivery =
          Number(deliveryInfo.deliveryFee || 0);
      }
    }

    const cod =
      paymentMethod === "cod"
        ? CONFIG.codFee
        : 0;

    const discount =
      appliedCoupon
        ? Number(appliedCoupon.discount || 0)
        : 0;

    const baseTotal = Math.max(
      0,
      Math.round(
        subtotal +
          tax +
          delivery +
          cod -
          discount
      )
    );

    let grandTotal = baseTotal;

    let walletDeduction = 0;

    if (
      useWallet &&
      wallet?.balance > 0
    ) {
      walletDeduction = Math.min(
        Number(wallet.balance),
        grandTotal
      );

      grandTotal -= walletDeduction;
    }

    let rewardDeduction = 0;

    if (
      useRewards &&
      wallet?.rewardBalance > 0
    ) {
      rewardDeduction = Math.min(
        Number(wallet.rewardBalance),
        grandTotal
      );

      grandTotal -= rewardDeduction;
    }

    grandTotal = Math.max(
      0,
      grandTotal
    );

    return {
      subtotal,
      tax,
      delivery,
      cod,
      discount,
      rewardDiscount,
      baseTotal,
      walletDeduction,
      rewardDeduction,
      grandTotal,
      remainingAmount: grandTotal,
    };
  }, [
    total,
    paymentMethod,
    appliedCoupon,
    deliveryInfo,
    useWallet,
    useRewards,
    wallet,
    selectedReward,
  ]);

  /* =========================================================
     RESET COD WHEN FULLY PAID
  ========================================================= */

  useEffect(() => {
    if (
      paymentMethod === "cod" &&
      calculations.remainingAmount === 0
    ) {
      setPaymentMethod("online");
    }
  }, [
    paymentMethod,
    calculations.remainingAmount,
  ]);

  /* =========================================================
     LOAD RAZORPAY
  ========================================================= */

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  /* =========================================================
     LOAD LOYALTY SETTINGS
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadLoyaltySettings() {
      try {
        const snap = await getDoc(
          doc(db, "settings", "loyalty")
        );

        if (!active) return;

        if (snap.exists()) {
          const data = snap.data();

          setLoyaltySettings(data);
          setLoyaltyEnabled(
            data.enabled !== false
          );
        }
      } catch (error) {
        console.error(
          "LOYALTY SETTINGS ERROR:",
          error
        );
      }
    }

    loadLoyaltySettings();

    return () => {
      active = false;
    };
  }, []);

  /* =========================================================
     LOAD WALLET
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadWallet() {
      if (!auth.currentUser) {
        if (active) {
          setWallet(null);
          setWalletLoading(false);
        }

        return;
      }

      try {
        setWalletLoading(true);

        let walletData =
          await walletService.getWallet(
            auth.currentUser.uid
          );

        if (!walletData) {
          walletData =
            await walletService.createWallet(
              auth.currentUser.uid
            );
        }

        if (active) {
          setWallet(walletData);
        }
      } catch (error) {
        console.error(
          "WALLET LOAD ERROR:",
          error
        );

        if (active) {
          setWallet(null);
        }
      } finally {
        if (active) {
          setWalletLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      active = false;
    };
  }, []);

  /* =========================================================
     LOAD SAVED ADDRESSES
  ========================================================= */

  const applyAddressToCheckout = useCallback(
    (address) => {
      if (!address) return;

      const normalized =
        normalizeAddress(address);

      setSelectedAddress(normalized);

      setForm((previous) => ({
        ...previous,

        name:
          normalized.name ||
          previous.name ||
          "",

        phone:
          normalized.phone ||
          previous.phone ||
          "",

        email:
          auth.currentUser?.email ||
          previous.email ||
          "",

        address:
          normalized.formatted ||
          buildAddressString(normalized),
      }));
    },
    []
  );

  useEffect(() => {
    let active = true;

    async function loadAddresses() {
      const user = auth.currentUser;

      if (!user) return;

      try {
        const snapshot =
          await getDocs(
            collection(
              db,
              "users",
              user.uid,
              "addresses"
            )
          );

        if (!active) return;

        const list =
          snapshot.docs.map(
            (addressDoc) => ({
              id: addressDoc.id,
              ...addressDoc.data(),
            })
          );

        setAddresses(list);

        const defaultAddress =
          list.find(
            (address) =>
              address.isDefault === true
          );

        const addressToUse =
          defaultAddress || list[0];

        if (addressToUse) {
          applyAddressToCheckout(
            addressToUse
          );
        }
      } catch (error) {
        console.error(
          "ADDRESS LOAD ERROR:",
          error
        );
      }
    }

    loadAddresses();

    return () => {
      active = false;
    };
  }, [applyAddressToCheckout]);

  /* =========================================================
     LOAD AVAILABLE REWARDS
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadAvailableRewards() {
      if (!loyaltyEnabled) {
        setAvailableRewards([]);
        setLoadingAvailableRewards(false);
        return;
      }

      const user = auth.currentUser;

      if (!user) {
        setAvailableRewards([]);
        setLoadingAvailableRewards(false);
        return;
      }

      try {
        setLoadingAvailableRewards(true);

        const loyaltySettingsSnap =
          await getDoc(
            doc(db, "settings", "loyalty")
          );

        if (
          loyaltySettingsSnap.exists() &&
          loyaltySettingsSnap.data().enabled === false
        ) {
          setAvailableRewards([]);
          return;
        }

        const snapshot =
          await getDocs(
            query(
              collection(
                db,
                "users",
                user.uid,
                "redeemedRewards"
              ),
              where(
                "status",
                "==",
                "unused"
              )
            )
          );

        const rewards =
          await Promise.all(
            snapshot.docs.map(
              async (rewardDoc) => {
                const reward = {
                  id: rewardDoc.id,
                  ...rewardDoc.data(),
                };

                if (reward.menuItemId) {
                  const menuSnap =
                    await getDoc(
                      doc(
                        db,
                        "menu",
                        reward.menuItemId
                      )
                    );

                  if (menuSnap.exists()) {
                    reward.menuItem = {
                      id: menuSnap.id,
                      ...menuSnap.data(),
                    };
                  }
                }

                return reward;
              }
            )
          );

        if (active) {
          setAvailableRewards(rewards);
        }
      } catch (error) {
        console.error(
          "REWARDS LOAD ERROR:",
          error
        );
      } finally {
        if (active) {
          setLoadingAvailableRewards(false);
        }
      }
    }

    loadAvailableRewards();

    return () => {
      active = false;
    };
  }, [loyaltyEnabled]);

  /* =========================================================
     DELIVERY VALIDATION
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function validateDelivery() {
      const pincode =
        selectedAddress?.pincode
          ?.toString()
          .trim();

      if (!pincode) {
        setDeliveryAvailable(null);
        setDeliveryInfo(null);
        return;
      }

      setDeliveryLoading(true);

      try {
        const result =
          await checkDelivery(pincode);

        if (!active) return;

        setDeliveryAvailable(
          result.available
        );

        setDeliveryInfo(
          result.info || null
        );
      } catch (error) {
        console.error(
          "DELIVERY VALIDATION ERROR:",
          error
        );

        if (active) {
          setDeliveryAvailable(false);
          setDeliveryInfo(null);
        }
      } finally {
        if (active) {
          setDeliveryLoading(false);
        }
      }
    }

    validateDelivery();

    return () => {
      active = false;
    };
  }, [selectedAddress]);

  /* =========================================================
     AUTH EMAIL
  ========================================================= */

  useEffect(() => {
    if (auth.currentUser?.email) {
      setForm((previous) => ({
        ...previous,
        email:
          auth.currentUser.email,
      }));
    }
  }, []);

  /* =========================================================
     GOOGLE MAPS INITIALIZATION
  ========================================================= */

  const updateNewAddressFromGeocoder =
    useCallback(
      (lat, lng, extra = {}) => {
        if (!geocoderRef.current) return;

        geocoderRef.current.geocode(
          {
            location: {
              lat,
              lng,
            },
          },
          (results, geocodeStatus) => {
            if (
              geocodeStatus !== "OK" ||
              !results?.length
            ) {
              setNewAddress((previous) => ({
                ...previous,
                latitude: lat,
                longitude: lng,
              }));

              return;
            }

            const result = results[0];

            const components =
              result.address_components || [];

            const getComponent = (
              type
            ) =>
              components.find(
                (component) =>
                  component.types?.includes(
                    type
                  )
              )?.long_name || "";

            const house =
              getComponent(
                "street_number"
              );

            const route =
              getComponent("route");

            const sublocality =
              getComponent(
                "sublocality_level_1"
              ) ||
              getComponent(
                "sublocality"
              );

            const city =
              getComponent("locality") ||
              getComponent(
                "administrative_area_level_2"
              );

            const state =
              getComponent(
                "administrative_area_level_1"
              );

            const pincode =
              getComponent("postal_code");

            setNewAddress((previous) => ({
              ...previous,

              house:
                extra.house ??
                house ??
                previous.house,

              street:
                extra.street ??
                [route, sublocality]
                  .filter(Boolean)
                  .join(", ") ||
                previous.street,

              city:
                extra.city ??
                city ??
                previous.city,

              state:
                extra.state ??
                state ??
                previous.state,

              pincode:
                extra.pincode ??
                pincode ??
                previous.pincode,

              formatted:
                result.formatted_address ||
                previous.formatted,

              latitude: lat,
              longitude: lng,

              placeId:
                extra.placeId ||
                result.place_id ||
                previous.placeId,
            }));
          }
        );
      },
      []
    );

  const setMapLocation =
    useCallback(
      (lat, lng, extra = {}) => {
        if (!mapRef.current) return;

        const position =
          new window.google.maps.LatLng(
            lat,
            lng
          );

        mapRef.current.panTo(position);

        if (
          mapRef.current.getZoom() < 15
        ) {
          mapRef.current.setZoom(16);
        }

        if (markerRef.current) {
          markerRef.current.setPosition(
            position
          );
        } else {
          markerRef.current =
            new window.google.maps.Marker({
              map: mapRef.current,
              position,
              draggable: true,
              title:
                "Delivery location",
            });

          markerRef.current.addListener(
            "dragend",
            () => {
              const markerPosition =
                markerRef.current.getPosition();

              if (!markerPosition) return;

              const lat =
                markerPosition.lat();

              const lng =
                markerPosition.lng();

              updateNewAddressFromGeocoder(
                lat,
                lng
              );
            }
          );
        }

        updateNewAddressFromGeocoder(
          lat,
          lng,
          extra
        );
      },
      [updateNewAddressFromGeocoder]
    );

  const initializeMap =
    useCallback(async () => {
      if (!showNewAddress) return;

      try {
        setMapsError("");

        const google =
          await loadGoogleMaps();

        setMapsReady(true);

        if (!mapContainerRef.current) {
          return;
        }

        if (mapRef.current) {
          return;
        }

        const defaultLocation = {
          lat:
            Number(newAddress.latitude) ||
            22.5726,

          lng:
            Number(newAddress.longitude) ||
            88.3639,
        };

        mapRef.current =
          new google.maps.Map(
            mapContainerRef.current,
            {
              center: defaultLocation,
              zoom: 14,

              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,

              gestureHandling:
                "greedy",

              styles: [
                {
                  featureType:
                    "poi.business",
                  stylers: [
                    {
                      visibility:
                        "off",
                    },
                  ],
                },
              ],
            }
          );

        geocoderRef.current =
          new google.maps.Geocoder();

        mapRef.current.addListener(
          "click",
          (event) => {
            if (
              !event.latLng
            ) {
              return;
            }

            setMapLocation(
              event.latLng.lat(),
              event.latLng.lng()
            );
          }
        );

        setMapLocation(
          defaultLocation.lat,
          defaultLocation.lng
        );

        const input =
          document.getElementById(
            "checkout-address-search"
          );

        if (
          input &&
          !autocompleteRef.current
        ) {
          autocompleteRef.current =
            new google.maps.places.Autocomplete(
              input,
              {
                fields: [
                  "address_components",
                  "formatted_address",
                  "geometry",
                  "place_id",
                ],

                componentRestrictions: {
                  country: "in",
                },
              }
            );

          autocompleteRef.current.addListener(
            "place_changed",
            () => {
              const place =
                autocompleteRef.current.getPlace();

              if (
                !place?.geometry?.location
              ) {
                setAddressError(
                  "Please select a location from the search suggestions."
                );

                return;
              }

              setAddressError("");

              const location =
                place.geometry.location;

              setMapLocation(
                location.lat(),
                location.lng(),
                {
                  placeId:
                    place.place_id,
                  formatted:
                    place.formatted_address,
                }
              );

              const components =
                place.address_components ||
                [];

              const getComponent = (
                type
              ) =>
                components.find(
                  (component) =>
                    component.types?.includes(
                      type
                    )
                )?.long_name || "";

              const house =
                getComponent(
                  "street_number"
                );

              const route =
                getComponent("route");

              const sublocality =
                getComponent(
                  "sublocality_level_1"
                ) ||
                getComponent(
                  "sublocality"
                );

              setNewAddress(
                (previous) => ({
                  ...previous,

                  house:
                    house ||
                    previous.house,

                  street:
                    [route, sublocality]
                      .filter(Boolean)
                      .join(", ") ||
                    previous.street,

                  city:
                    getComponent(
                      "locality"
                    ) ||
                    getComponent(
                      "administrative_area_level_2"
                    ) ||
                    previous.city,

                  state:
                    getComponent(
                      "administrative_area_level_1"
                    ) ||
                    previous.state,

                  pincode:
                    getComponent(
                      "postal_code"
                    ) ||
                    previous.pincode,

                  formatted:
                    place.formatted_address ||
                    previous.formatted,

                  latitude:
                    location.lat(),

                  longitude:
                    location.lng(),

                  placeId:
                    place.place_id ||
                    "",
                })
              );
            }
          );
        }
      } catch (error) {
        console.error(
          "GOOGLE MAPS ERROR:",
          error
        );

        setMapsError(
          error?.message ||
            "Unable to load the interactive map."
        );
      }
    }, [
      showNewAddress,
      newAddress.latitude,
      newAddress.longitude,
      setMapLocation,
    ]);

  useEffect(() => {
    if (!showNewAddress) {
      mapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
      geocoderRef.current = null;
      setMapsReady(false);
      return;
    }

    const timer = setTimeout(
      initializeMap,
      100
    );

    return () => clearTimeout(timer);
  }, [
    showNewAddress,
    initializeMap,
  ]);

  /* =========================================================
     CURRENT LOCATION
  ========================================================= */

  const useCurrentLocation =
    useCallback(() => {
      if (
        !navigator.geolocation
      ) {
        setAddressError(
          "Location services are not supported by this browser."
        );

        return;
      }

      setAddressError("");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          setMapLocation(
            lat,
            lng
          );
        },
        (error) => {
          console.error(
            "LOCATION ERROR:",
            error
          );

          setAddressError(
            "Unable to access your current location. Please enable location permission or select the location on the map."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    }, [setMapLocation]);

  /* =========================================================
     NEW ADDRESS INPUT
  ========================================================= */

  const handleNewAddressChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setNewAddress(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  /* =========================================================
     SAVE NEW ADDRESS
  ========================================================= */

  const closeNewAddressModal =
    () => {
      if (addressSaving) return;

      setShowNewAddress(false);
      setAddressError("");

      setNewAddress(
        EMPTY_NEW_ADDRESS
      );

      setMapSearch("");
    };

  const saveAndUseNewAddress =
    async () => {
      const user =
        auth.currentUser;

      if (!user) {
        setAddressError(
          "Please log in before adding an address."
        );

        return;
      }

      setAddressError("");

      const requiredFields = [
        ["name", "Recipient name"],
        ["phone", "Phone number"],
        ["house", "House / Flat"],
        ["street", "Street / Area"],
        ["city", "City"],
        ["state", "State"],
        ["pincode", "Pincode"],
      ];

      for (
        const [
          field,
          label,
        ] of requiredFields
      ) {
        if (
          !newAddress[field]
            ?.toString()
            .trim()
        ) {
          setAddressError(
            `${label} is required.`
          );

          return;
        }
      }

      if (
        !/^\d{6}$/.test(
          String(
            newAddress.pincode
          ).trim()
        )
      ) {
        setAddressError(
          "Please enter a valid 6-digit pincode."
        );

        return;
      }

      if (
        newAddress.latitude == null ||
        newAddress.longitude == null
      ) {
        setAddressError(
          "Please select your exact delivery location on the map."
        );

        return;
      }

      setAddressSaving(true);

      try {
        const addressPayload =
          normalizeAddress({
            ...newAddress,

            name:
              newAddress.name.trim(),

            phone:
              newAddress.phone.trim(),

            house:
              newAddress.house.trim(),

            street:
              newAddress.street.trim(),

            city:
              newAddress.city.trim(),

            state:
              newAddress.state.trim(),

            pincode:
              newAddress.pincode
                .toString()
                .trim(),

            formatted:
              newAddress.formatted ||
              buildAddressString(
                newAddress
              ),

            latitude:
              Number(
                newAddress.latitude
              ),

            longitude:
              Number(
                newAddress.longitude
              ),

            placeId:
              newAddress.placeId ||
              "",
          });

        let savedAddress = {
          ...addressPayload,
          id: `checkout-${Date.now()}`,
        };

        if (saveNewAddress) {
          const addressRef =
            await addDoc(
              collection(
                db,
                "users",
                user.uid,
                "addresses"
              ),
              {
                ...addressPayload,
                isDefault:
                  addresses.length === 0,
                createdAt:
                  serverTimestamp(),
                updatedAt:
                  serverTimestamp(),
              }
            );

          savedAddress.id =
            addressRef.id;

          setAddresses(
            (previous) => [
              ...previous,
              savedAddress,
            ]
          );
        }

        applyAddressToCheckout(
          savedAddress
        );

        setShowNewAddress(false);

        setNewAddress(
          EMPTY_NEW_ADDRESS
        );

        setMapSearch("");
      } catch (error) {
        console.error(
          "SAVE ADDRESS ERROR:",
          error
        );

        setAddressError(
          error?.message ||
            "Unable to save this address. Please try again."
        );
      } finally {
        setAddressSaving(false);
      }
    };

  /* =========================================================
     FORM INPUT
  ========================================================= */

  const handleInputChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  /* =========================================================
     COUPONS
  ========================================================= */

  const applyCouponCode =
    (event) => {
      event.preventDefault();

      setCouponError("");

      const sanitized =
        coupon
          .trim()
          .toUpperCase();

      if (
        sanitized ===
        "BREW100"
      ) {
        if (
          calculations.subtotal <
          200
        ) {
          setCouponError(
            "Minimum spend for BREW100 is ₹200."
          );

          return;
        }

        setAppliedCoupon({
          code: "BREW100",
          discount: 100,
        });

        return;
      }

      if (
        sanitized ===
        "COFFEE20"
      ) {
        setAppliedCoupon({
          code: "COFFEE20",
          discount: Math.round(
            calculations.subtotal *
              0.2
          ),
        });

        return;
      }

      setCouponError(
        "Invalid coupon code."
      );
    };

  /* =========================================================
     REWARD SELECTION
  ========================================================= */

  const toggleReward =
    async (reward) => {
      if (
        selectedReward?.id ===
        reward.id
      ) {
        setSelectedReward(null);

        const rewardCartItem =
          cart.find(
            (item) =>
              item.rewardId ===
              reward.id
          );

        if (rewardCartItem) {
          removeFromCart(
            rewardCartItem
          );
        }

        return;
      }

      setSelectedReward(
        reward
      );

      if (
        reward.menuItemId &&
        !cart.some(
          (item) =>
            item.rewardId ===
            reward.id
        )
      ) {
        try {
          const menuSnap =
            await getDoc(
              doc(
                db,
                "menu",
                reward.menuItemId
              )
            );

          if (
            menuSnap.exists()
          ) {
            const menuItem = {
              ...menuSnap.data(),

              id: menuSnap.id,

              firestoreId:
                menuSnap.id,

              price: 0,

              qty: 1,

              isReward: true,

              rewardId:
                reward.id,
            };

            addToCart(
              menuItem
            );
          }
        } catch (error) {
          console.error(
            "REWARD MENU ITEM ERROR:",
            error
          );
        }
      }
    };

  /* =========================================================
     ORDER SUBMISSION
  ========================================================= */

  const handleFormSubmission =
    async (event) => {
      event.preventDefault();

      if (placingOrder) return;

      const user =
        auth.currentUser;

      if (
        !cart ||
        cart.length === 0
      ) {
        alert(
          "Your cart is empty."
        );

        return;
      }

      if (!user) {
        alert(
          "Please log in to your Brewed account to place an order."
        );

        setPage("login");

        return;
      }

      if (!selectedAddress) {
        alert(
          "Please select a delivery address."
        );

        return;
      }

      if (
        !selectedAddress.pincode
      ) {
        alert(
          "Selected address doesn't have a valid pincode."
        );

        return;
      }

      if (
        selectedAddress.latitude ==
          null ||
        selectedAddress.longitude ==
          null
      ) {
        alert(
          "Please select a valid delivery location."
        );

        return;
      }

      if (deliveryLoading) {
        alert(
          "Please wait while we verify delivery availability."
        );

        return;
      }

      if (
        deliveryAvailable ===
        false
      ) {
        alert(
          "Sorry, we don't deliver to the selected address."
        );

        return;
      }

      if (
        deliveryInfo &&
        calculations.subtotal <
          Number(
            deliveryInfo.minOrder || 0
          )
      ) {
        alert(
          `Minimum order for this area is ₹${deliveryInfo.minOrder}.`
        );

        return;
      }

      setPlacingOrder(true);

      let paymentResponse =
        null;

      try {
        /* =====================================================
           RAZORPAY
        ===================================================== */

        if (
          paymentMethod ===
            "online" &&
          calculations.remainingAmount >
            0
        ) {
          const razorpayLoaded =
            await loadRazorpayScript();

          if (
            !razorpayLoaded
          ) {
            throw new Error(
              "Razorpay SDK failed to load."
            );
          }

          const razorpayOrderResult =
            await createRazorpayOrder(
              {
                amount:
                  calculations.remainingAmount,
              }
            );

          const razorpayOrder =
            razorpayOrderResult.data;

          if (
            !razorpayOrder ||
            !razorpayOrder.success ||
            !razorpayOrder.orderId ||
            !razorpayOrder.keyId
          ) {
            throw new Error(
              "Unable to create Razorpay order."
            );
          }

          paymentResponse =
            await new Promise(
              (
                resolve,
                reject
              ) => {
                const options =
                  {
                    key:
                      razorpayOrder.keyId,

                    amount:
                      razorpayOrder.amount,

                    currency:
                      razorpayOrder.currency,

                    name:
                      "Brewed Cafe",

                    description:
                      "Online Order Settlement",

                    order_id:
                      razorpayOrder.orderId,

                    handler:
                      (
                        response
                      ) => {
                        resolve(
                          response
                        );
                      },

                    modal: {
                      ondismiss:
                        () =>
                          reject(
                            new Error(
                              "Payment cancelled by user."
                            )
                          ),
                    },

                    prefill: {
                      name:
                        form.name,

                      email:
                        form.email,

                      contact:
                        form.phone,
                    },

                    theme: {
                      color:
                        THEME.colors.primary,
                    },
                  };

                try {
                  const rzp =
                    new window.Razorpay(
                      options
                    );

                  rzp.on(
                    "payment.failed",
                    (
                      response
                    ) => {
                      reject(
                        new Error(
                          response
                            ?.error
                            ?.description ||
                            "Razorpay payment failed."
                        )
                      );
                    }
                  );

                  rzp.open();
                } catch (error) {
                  reject(error);
                }
              }
            );
        }

        /* =====================================================
           WALLET / REWARDS
        ===================================================== */

        let walletPaid = 0;

        let refreshedWalletBalance =
          wallet
            ? Number(
                wallet.balance || 0
              )
            : 0;

        let walletTransaction =
          null;

        let rewardPaid = 0;

        let refreshedRewardBalance =
          wallet
            ? Number(
                wallet.rewardBalance ||
                  0
              )
            : 0;

        if (
          useWallet &&
          calculations.walletDeduction >
            0
        ) {
          walletTransaction =
            await walletService.deductMoney(
              {
                userId:
                  user.uid,

                amount:
                  calculations.walletDeduction,
              }
            );

          walletPaid =
            calculations.walletDeduction;

          refreshedWalletBalance =
            Math.max(
              0,
              refreshedWalletBalance -
                walletPaid
            );
        }

        if (
          useRewards &&
          calculations.rewardDeduction >
            0
        ) {
          await walletService.redeemReward(
            {
              userId:
                user.uid,

              amount:
                calculations.rewardDeduction,

              description:
                "Reward Redemption",
            }
          );

          rewardPaid =
            calculations.rewardDeduction;

          refreshedRewardBalance =
            Math.max(
              0,
              refreshedRewardBalance -
                rewardPaid
            );
        }

        /* =====================================================
           PAYMENT METHOD
        ===================================================== */

        const remainingAmount =
          calculations.remainingAmount;

        const basePaymentLabel =
          paymentMethod === "cod"
            ? "Cash on Delivery"
            : "UPI/Card";

        const finalPaymentMethod =
          walletPaid > 0 ||
          rewardPaid > 0
            ? remainingAmount >
              0
              ? `Wallet/Rewards + ${basePaymentLabel}`
              : "Wallet/Rewards"
            : basePaymentLabel;

        /* =====================================================
           STRUCTURED DELIVERY ADDRESS
        ===================================================== */

        const deliveryAddress = {
          id:
            selectedAddress.id ||
            null,

          type:
            selectedAddress.type ||
            "Home",

          name:
            selectedAddress.name ||
            form.name,

          phone:
            selectedAddress.phone ||
            form.phone,

          house:
            selectedAddress.house ||
            "",

          street:
            selectedAddress.street ||
            "",

          city:
            selectedAddress.city ||
            "",

          state:
            selectedAddress.state ||
            "",

          pincode:
            selectedAddress.pincode ||
            "",

          formatted:
            selectedAddress.formatted ||
            form.address,

          latitude:
            Number(
              selectedAddress.latitude
            ),

          longitude:
            Number(
              selectedAddress.longitude
            ),

          placeId:
            selectedAddress.placeId ||
            "",
        };

        /* =====================================================
           ORDER DATA
        ===================================================== */

        const orderData = {
          customer: {
            ...form,

            address:
              deliveryAddress.formatted,
          },

          deliveryAddress,

          userId:
            user.uid,

          items: cart,

          subtotal:
            calculations.subtotal,

          tax:
            calculations.tax,

          delivery:
            calculations.delivery,

          deliveryZone:
            deliveryInfo?.zoneName ||
            "",

          estimatedDelivery:
            deliveryInfo?.estimatedTime ||
            "",

          minimumOrder:
            deliveryInfo?.minOrder ||
            0,

          freeDeliveryAbove:
            deliveryInfo?.freeDeliveryAbove ||
            0,

          walletPaid,

          usedWallet:
            walletPaid > 0,

          walletBalanceBeforePayment:
            wallet?.balance || 0,

          walletBalanceAfterPayment:
            refreshedWalletBalance,

          usedRewards:
            rewardPaid > 0,

          rewardPaid,

          rewardBalanceBeforePayment:
            wallet?.rewardBalance ||
            0,

          rewardBalanceAfterPayment:
            refreshedRewardBalance,

          otherPayment:
            remainingAmount,

          total:
            calculations.grandTotal,

          paymentMethod:
            finalPaymentMethod,

          status: "New",

          walletTransactionId:
            walletTransaction?.transactionId ||
            null,

          walletPayment:
            walletPaid,

          walletStatus:
            walletPaid > 0
              ? "PAID"
              : "NOT_USED",

          paymentStatus:
            "SUCCESS",

          paymentGateway:
            paymentMethod ===
            "online"
              ? "Razorpay"
              : null,

          paymentReference:
            paymentResponse?.razorpay_payment_id ||
            null,

          razorpayOrderId:
            paymentResponse?.razorpay_order_id ||
            null,

          refundStatus:
            "NOT_REFUNDED",

          loyaltyPointsUsed:
            selectedReward?.points ||
            0,

          refundAmount: 0,

          refundTransactionId:
            null,

          cancelReason:
            null,

          cancelledAt:
            null,

          cancelledBy:
            null,

          selectedReward:
            selectedReward ||
            null,

          rewardStatus:
            rewardPaid > 0
              ? "REDEEMED"
              : "PENDING",

          rewardAmount:
            rewardPaid,

          rewardCreditedAt:
            rewardPaid > 0
              ? serverTimestamp()
              : null,

          createdAt:
            serverTimestamp(),
        };

        /* =====================================================
           CREATE ORDER
        ===================================================== */

        const orderId =
          await placeOrder(
            orderData
          );

        const completedOrderData =
          {
            ...orderData,

            id: orderId,
          };

        setCompletedOrder(
          completedOrderData
        );

        /* =====================================================
           LOYALTY POINTS
        ===================================================== */

        const loyaltySettingsSnap =
          await getDoc(
            doc(
              db,
              "settings",
              "loyalty"
            )
          );

        if (
          loyaltySettingsSnap.exists()
        ) {
          const fetched =
            loyaltySettingsSnap.data();

          if (
            fetched.enabled !==
            false
          ) {
            let earnedPoints =
              Math.floor(
                calculations.subtotal /
                  100
              ) *
              (
                fetched.pointsPer100 ||
                0
              );

            const today =
              new Date();

            const campaignActive =
              fetched.seasonalCampaignEnabled &&
              fetched.seasonalStartDate &&
              fetched.seasonalEndDate &&
              today >=
                new Date(
                  fetched.seasonalStartDate
                ) &&
              today <=
                new Date(
                  fetched.seasonalEndDate
                );

            if (
              campaignActive
            ) {
              earnedPoints =
                Math.round(
                  earnedPoints *
                    (
                      fetched.seasonalMultiplier ||
                      2
                    )
                );
            }

            if (
              earnedPoints > 0
            ) {
              await runTransaction(
                db,
                async (
                  transaction
                ) => {
                  const userRef =
                    doc(
                      db,
                      "users",
                      user.uid
                    );

                  const userSnap =
                    await transaction.get(
                      userRef
                    );

                  if (
                    !userSnap.exists()
                  ) {
                    return;
                  }

                  const currentUser =
                    userSnap.data();

                  transaction.update(
                    userRef,
                    {
                      loyaltyPoints:
                        (
                          currentUser.loyaltyPoints ||
                          0
                        ) +
                        earnedPoints,

                      lifetimePoints:
                        (
                          currentUser.lifetimePoints ||
                          0
                        ) +
                        earnedPoints,

                      totalOrders:
                        (
                          currentUser.totalOrders ||
                          0
                        ) +
                        1,
                    }
                  );

                  const txRef =
                    doc(
                      collection(
                        db,
                        "loyaltyTransactions"
                      )
                    );

                  transaction.set(
                    txRef,
                    {
                      userId:
                        user.uid,

                      type:
                        "earned",

                      points:
                        earnedPoints,

                      description:
                        campaignActive
                          ? `${fetched.seasonalCampaignName || "Seasonal"} Bonus`
                          : "Points earned from order",

                      seasonalCampaign:
                        campaignActive
                          ? fetched.seasonalCampaignName
                          : null,

                      orderId,

                      amount:
                        calculations.subtotal,

                      createdAt:
                        serverTimestamp(),
                    }
                  );
                }
              );
            }
          }
        }

        /* =====================================================
           REFRESH WALLET
        ===================================================== */

        const updatedWallet =
          await walletService.getWallet(
            user.uid
          );

        setWallet(
          updatedWallet
        );

        setUseWallet(false);
        setUseRewards(false);

        setStatus(
          "success"
        );
      } catch (error) {
        console.error(
          "CHECKOUT ERROR:",
          error
        );

        alert(
          `Payment error:\n\n${
            error?.message ||
            "Unable to complete your order."
          }`
        );

        setStatus(
          "failure"
        );
      } finally {
        setPlacingOrder(false);
      }
    };

  /* =========================================================
     FAILURE / SUCCESS
  ========================================================= */

  useEffect(() => {
    if (
      status !== "failure" ||
      !canvasRef.current
    ) {
      return;
    }

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext(
        "2d"
      );

    let animationFrameId;
    let active = true;

    const resizeCanvas =
      () => {
        canvas.width =
          window.innerWidth;

        canvas.height =
          window.innerHeight;
      };

    window.addEventListener(
      "resize",
      resizeCanvas
    );

    resizeCanvas();

    const particles = [];

    const failureColors = [
      "#DE6B48",
      "#1A0B05",
      "#E6DFD5",
      "#70645C",
    ];

    for (
      let i = 0;
      i < 140;
      i++
    ) {
      particles.push({
        x:
          canvas.width / 2,

        y:
          canvas.height *
          0.5,

        radius:
          Math.random() *
            4 +
          3,

        color:
          failureColors[
            Math.floor(
              Math.random() *
                failureColors.length
            )
          ],

        vx:
          (Math.random() -
            0.5) *
          16,

        vy:
          Math.random() *
            -14 -
          4,

        gravity:
          0.28,

        rotation:
          Math.random() *
          360,

        rotationSpeed:
          (Math.random() -
            0.5) *
          10,

        opacity: 1,
      });
    }

    const render =
      () => {
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        particles.forEach(
          (particle) => {
            particle.vy +=
              particle.gravity;

            particle.x +=
              particle.vx;

            particle.y +=
              particle.vy;

            particle.rotation +=
              particle.rotationSpeed;

            if (!active) {
              particle.opacity -=
                0.02;
            }

            ctx.save();

            ctx.translate(
              particle.x,
              particle.y
            );

            ctx.rotate(
              (particle.rotation *
                Math.PI) /
                180
            );

            ctx.globalAlpha =
              Math.max(
                0,
                particle.opacity
              );

            ctx.fillStyle =
              particle.color;

            ctx.fillRect(
              -particle.radius,
              -particle.radius /
                1.5,
              particle.radius *
                2,
              particle.radius *
                1.3
            );

            ctx.restore();
          }
        );

        if (
          active ||
          particles.some(
            (particle) =>
              particle.opacity >
              0
          )
        ) {
          animationFrameId =
            requestAnimationFrame(
              render
            );
        }
      };

    render();

    const timer =
      setTimeout(
        () => {
          active = false;
        },
        5000
      );

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );

      clearTimeout(
        timer
      );

      window.removeEventListener(
        "resize",
        resizeCanvas
      );
    };
  }, [status]);

  /* =========================================================
     SUCCESS
  ========================================================= */

  if (
    status === "success"
  ) {
    return (
      <div style={styles.confirmPage}>
        <canvas
          ref={canvasRef}
          style={
            styles.confettiCanvas
          }
        />

        <div
          style={
            styles.confirmCard
          }
        >
          <div
            style={
              styles.successIcon
            }
          >
            ✓
          </div>

          <h2
            style={{
              ...styles.confirmTitle,
              color:
                THEME.colors.primary,
            }}
          >
            Order Confirmed
          </h2>

          <p
            style={
              styles.confirmSub
            }
          >
            Your payment has been
            processed successfully
            and your Brewed order
            has been placed.
          </p>

          <div
            style={
              styles.confirmButtons
            }
          >
            <button
              style={{
                ...styles.payBtn,
                minWidth: 140,
              }}
              onClick={() => {
                if (
                  completedOrder
                ) {
                  setPage(
                    "tracking",
                    completedOrder
                  );
                }
              }}
            >
              Track Order
            </button>

            <button
              style={{
                ...styles.payBtn,
                minWidth: 140,
                background:
                  "transparent",
                color:
                  THEME.colors.primary,
                border:
                  `1px solid ${THEME.colors.primary}`,
              }}
              onClick={() => {
                setStatus(
                  "idle"
                );

                setPage(
                  "menu"
                );
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     FAILURE
  ========================================================= */

  if (
    status === "failure"
  ) {
    return (
      <div style={styles.confirmPage}>
        <canvas
          ref={canvasRef}
          style={
            styles.confettiCanvas
          }
        />

        <div
          style={
            styles.confirmCard
          }
        >
          <div
            style={
              styles.failureIcon
            }
          >
            !
          </div>

          <h2
            style={{
              ...styles.confirmTitle,
              color:
                THEME.colors.danger,
            }}
          >
            Payment Failed
          </h2>

          <p
            style={
              styles.confirmSub
            }
          >
            We couldn't process
            your transaction.
            No order was completed.
          </p>

          <button
            style={styles.payBtn}
            onClick={() => {
              setStatus(
                "idle"
              );
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN CHECKOUT
  ========================================================= */

  return (
    <div
      style={styles.page}
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          background-color: ${THEME.colors.bgPage};
          margin: 0;
          font-family: ${THEME.fonts.sans};
          color: ${THEME.colors.textDark};
        }

        .checkout-layout {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          max-width: 1100px;
          margin: 0 auto;
        }

        .main-panel {
          flex: 1;
          min-width: 0;
        }

        .side-panel {
          width: 360px;
          position: sticky;
          top: 20px;
        }

        .input-box {
          width: 100%;
          padding: 0.8rem 1rem;
          border: 1.5px solid ${THEME.colors.cardBorder};
          border-radius: 9px;
          font-size: 0.95rem;
          background: #FFF;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          font-family: inherit;
        }

        .input-box:focus {
          border-color: ${THEME.colors.primary};
          box-shadow: 0 0 0 3px rgba(196,149,106,.10);
        }

        .clickable-row {
          transition:
            border-color .2s,
            background-color .2s,
            transform .2s;
          cursor: pointer;
        }

        .clickable-row:hover {
          border-color: ${THEME.colors.primary} !important;
          background-color: #FAF9F6;
        }

        .address-option:hover {
          background: #FAF6F0 !important;
        }

        @media (max-width: 880px) {
          .checkout-layout {
            flex-direction: column;
          }

          .side-panel {
            width: 100%;
            position: static;
          }
        }

        @media (max-width: 600px) {
          .checkout-page-inner {
            padding: 0 14px !important;
          }

          .map-container {
            height: 300px !important;
          }
        }
      `}</style>

      <div
        className="checkout-page-inner"
        style={
          styles.pageInner
        }
      >
        <button
          style={
            styles.backLink
          }
          type="button"
          onClick={() =>
            setPage("cart")
          }
        >
          ← Back to Cart
        </button>

        <h1
          style={
            styles.heading
          }
        >
          Checkout
        </h1>

        <form
          onSubmit={
            handleFormSubmission
          }
          className="checkout-layout"
        >
          <div className="main-panel">

            {/* =================================================
                ADDRESS CARD
            ================================================= */}

            <div
              style={
                styles.addressCard
              }
            >
              <div
                style={
                  styles.addressHeader
                }
              >
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <div
                    style={
                      styles.addressEyebrow
                    }
                  >
                    DELIVERY TO
                  </div>

                  <h3
                    style={
                      styles.addressTitle
                    }
                  >
                    📍 Delivery Address
                  </h3>

                  {selectedAddress ? (
                    <>
                      <div
                        style={
                          styles.selectedAddressBadge
                        }
                      >
                        <span>
                          {selectedAddress.type ||
                            "Address"}
                        </span>
                      </div>

                      <p
                        style={
                          styles.addressName
                        }
                      >
                        {selectedAddress.name}
                      </p>

                      <p
                        style={
                          styles.addressText
                        }
                      >
                        {selectedAddress.formatted ||
                          buildAddressString(
                            selectedAddress
                          )}
                      </p>

                      {selectedAddress.phone && (
                        <p
                          style={
                            styles.addressPhone
                          }
                        >
                          {selectedAddress.phone}
                        </p>
                      )}
                    </>
                  ) : (
                    <p
                      style={
                        styles.emptyAddressText
                      }
                    >
                      No delivery address
                      selected yet.
                    </p>
                  )}
                </div>

                <div
                  style={
                    styles.addressActions
                  }
                >
                  {addresses.length >
                    0 && (
                    <button
                      type="button"
                      style={
                        styles.changeButton
                      }
                      onClick={() =>
                        setShowAddressPicker(
                          (previous) =>
                            !previous
                        )
                      }
                    >
                      {showAddressPicker
                        ? "Close"
                        : "Change"}
                    </button>
                  )}

                  <button
                    type="button"
                    style={
                      styles.addAddressButton
                    }
                    onClick={() => {
                      setAddressError(
                        ""
                      );

                      setNewAddress({
                        ...EMPTY_NEW_ADDRESS,

                        name:
                          form.name ||
                          auth.currentUser
                            ?.displayName ||
                          "",

                        phone:
                          form.phone ||
                          "",
                      });

                      setShowAddressPicker(
                        false
                      );

                      setShowNewAddress(
                        true
                      );
                    }}
                  >
                    + Add New
                  </button>
                </div>
              </div>
            </div>

            {/* =================================================
                SAVED ADDRESS PICKER
            ================================================= */}

            {showAddressPicker && (
              <div
                style={
                  styles.addressPicker
                }
              >
                <div
                  style={
                    styles.addressPickerHeader
                  }
                >
                  <div>
                    <strong>
                      Your saved addresses
                    </strong>

                    <p>
                      Select where you'd
                      like your order
                      delivered.
                    </p>
                  </div>
                </div>

                {addresses.map(
                  (address) => {
                    const isSelected =
                      selectedAddress?.id ===
                      address.id;

                    return (
                      <button
                        type="button"
                        key={
                          address.id
                        }
                        className="address-option"
                        style={{
                          ...styles.addressOption,
                          border:
                            isSelected
                              ? `1.5px solid ${THEME.colors.primary}`
                              : "1px solid #E6DFD5",

                          background:
                            isSelected
                              ? "#FBF5EE"
                              : "#FFF",
                        }}
                        onClick={() => {
                          applyAddressToCheckout(
                            address
                          );

                          setShowAddressPicker(
                            false
                          );
                        }}
                      >
                        <div
                          style={
                            styles.addressOptionTop
                          }
                        >
                          <strong>
                            {address.type ||
                              "Address"}
                          </strong>

                          {address.isDefault && (
                            <span
                              style={
                                styles.defaultBadge
                              }
                            >
                              DEFAULT
                            </span>
                          )}

                          {isSelected && (
                            <span
                              style={
                                styles.selectedCheck
                              }
                            >
                              ✓
                            </span>
                          )}
                        </div>

                        <div
                          style={
                            styles.addressOptionName
                          }
                        >
                          {address.name}
                        </div>

                        <div
                          style={
                            styles.addressOptionText
                          }
                        >
                          {address.formatted ||
                            buildAddressString(
                              address
                            )}
                        </div>
                      </button>
                    );
                  }
                )}

                <button
                  type="button"
                  style={
                    styles.pickerAddButton
                  }
                  onClick={() => {
                    setShowAddressPicker(
                      false
                    );

                    setAddressError(
                      ""
                    );

                    setNewAddress({
                      ...EMPTY_NEW_ADDRESS,

                      name:
                        form.name ||
                        auth.currentUser
                          ?.displayName ||
                        "",

                      phone:
                        form.phone ||
                        "",
                    });

                    setShowNewAddress(
                      true
                    );
                  }}
                >
                  + Add a new delivery address
                </button>
              </div>
            )}

            {/* =================================================
                DELIVERY INFORMATION
            ================================================= */}

            <div
              style={
                styles.card
              }
            >
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Delivery Information
              </h2>

              <div
                style={
                  styles.fieldGrid
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Name
                  </label>

                  <input
                    className="input-box"
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Phone Number
                  </label>

                  <input
                    className="input-box"
                    type="tel"
                    name="phone"
                    value={
                      form.phone
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  />
                </div>
              </div>

              <div
                style={
                  styles.field
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Email Address
                </label>

                <input
                  className="input-box"
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                />
              </div>

              <div
                style={
                  styles.field
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Complete Address
                </label>

                <div
                  style={
                    styles.addressReadonly
                  }
                >
                  <span>
                    {selectedAddress?.formatted ||
                      form.address ||
                      "Select a delivery address"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewAddress(
                        true
                      )}
                    style={
                      styles.editAddressButton
                    }
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={
                    styles.label
                  }
                >
                  Rider Delivery Instructions
                </label>

                <textarea
                  className="input-box"
                  style={
                    styles.instructions
                  }
                  name="instructions"
                  value={
                    form.instructions
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Drop-off instructions..."
                />
              </div>
            </div>

            {/* =================================================
                PAYMENT
            ================================================= */}

            <div
              style={
                styles.card
              }
            >
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Payment
              </h2>

              {/* WALLET */}

              <div
                style={
                  styles.walletBox
                }
              >
                <div
                  style={
                    styles.walletHeader
                  }
                >
                  <div>
                    <div
                      style={
                        styles.walletTitle
                      }
                    >
                      Brewed Wallet
                    </div>

                    <div
                      style={
                        styles.walletSubtitle
                      }
                    >
                      Use your wallet balance
                      at checkout.
                    </div>
                  </div>

                  <span
                    style={
                      styles.walletIcon
                    }
                  >
                    ₹
                  </span>
                </div>

                {walletLoading ? (
                  <p
                    style={
                      styles.muted
                    }
                  >
                    Loading wallet...
                  </p>
                ) : (
                  <>
                    <div
                      style={
                        styles.balanceRow
                      }
                    >
                      <span>
                        Available Balance
                      </span>

                      <strong>
                        ₹
                        {useWallet &&
                        wallet
                          ? Math.max(
                              0,
                              Number(
                                wallet.balance ||
                                  0
                              ) -
                                calculations.walletDeduction
                            )
                          : Number(
                              wallet?.balance ||
                                0
                            )}
                      </strong>
                    </div>

                    <label
                      style={
                        styles.checkboxRow
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          useWallet
                        }
                        disabled={
                          !wallet ||
                          Number(
                            wallet.balance ||
                              0
                          ) <= 0
                        }
                        onChange={(
                          event
                        ) =>
                          setUseWallet(
                            event.target
                              .checked
                          )
                        }
                      />

                      <span>
                        Use Brewed Wallet
                      </span>
                    </label>

                    <label
                      style={
                        styles.checkboxRow
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          useRewards
                        }
                        disabled={
                          !wallet ||
                          Number(
                            wallet.rewardBalance ||
                              0
                          ) <= 0
                        }
                        onChange={(
                          event
                        ) =>
                          setUseRewards(
                            event.target
                              .checked
                          )
                        }
                      />

                      <span>
                        Use Reward Balance
                        {" "}
                        <strong>
                          (₹
                          {Number(
                            wallet?.rewardBalance ||
                              0
                          )}
                          )
                        </strong>
                      </span>
                    </label>

                    {useWallet && (
                      <div
                        style={
                          styles.walletBreakdown
                        }
                      >
                        <div
                          style={
                            styles.breakdownRow
                          }
                        >
                          <span>
                            Order Total
                          </span>

                          <strong>
                            ₹
                            {
                              calculations.baseTotal
                            }
                          </strong>
                        </div>

                        <div
                          style={
                            styles.breakdownRow
                          }
                        >
                          <span>
                            Wallet Used
                          </span>

                          <strong>
                            -₹
                            {
                              calculations.walletDeduction
                            }
                          </strong>
                        </div>

                        <div
                          style={
                            styles.breakdownTotal
                          }
                        >
                          <strong>
                            Remaining Payment
                          </strong>

                          <strong>
                            ₹
                            {
                              calculations.remainingAmount
                            }
                          </strong>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* REWARDS */}

              {!loadingAvailableRewards &&
                availableRewards.length >
                  0 && (
                  <div
                    style={
                      styles.rewardsBox
                    }
                  >
                    <div
                      style={
                        styles.rewardHeader
                      }
                    >
                      <div>
                        <h3
                          style={
                            styles.rewardTitle
                          }
                        >
                          Available Rewards
                        </h3>

                        <p
                          style={
                            styles.rewardSubtitle
                          }
                        >
                          Redeemed rewards
                          ready to use.
                        </p>
                      </div>
                    </div>

                    {availableRewards.map(
                      (reward) => (
                        <label
                          key={
                            reward.id
                          }
                          style={
                            styles.rewardRow
                          }
                        >
                          <div>
                            <strong>
                              {reward.menuItem
                                ?.name
                                ? `Free ${reward.menuItem.name}`
                                : reward.title}
                            </strong>

                            <p
                              style={
                                styles.rewardStatus
                              }
                            >
                              Available
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={
                              selectedReward?.id ===
                              reward.id
                            }
                            onChange={() =>
                              toggleReward(
                                reward
                              )
                            }
                          />
                        </label>
                      )
                    )}
                  </div>
                )}

              {/* ONLINE */}

              <div
                className="clickable-row"
                style={{
                  ...styles.paymentSelector,

                  borderColor:
                    paymentMethod ===
                    "online"
                      ? THEME.colors.primary
                      : THEME.colors.cardBorder,

                  background:
                    paymentMethod ===
                    "online"
                      ? "#FCF8F3"
                      : "#FFF",
                }}
                onClick={() =>
                  setPaymentMethod(
                    "online"
                  )
                }
              >
                <span
                  style={
                    styles.paymentIcon
                  }
                >
                  ◉
                </span>

                <div
                  style={
                    styles.paymentText
                  }
                >
                  <strong>
                    Pay Online Now
                  </strong>

                  <p>
                    UPI, Cards,
                    Netbanking
                  </p>
                </div>

                <input
                  type="radio"
                  checked={
                    paymentMethod ===
                    "online"
                  }
                  readOnly
                />
              </div>

              {/* COD */}

              <div
                className="clickable-row"
                style={{
                  ...styles.paymentSelector,

                  borderColor:
                    paymentMethod ===
                    "cod"
                      ? THEME.colors.primary
                      : THEME.colors.cardBorder,

                  background:
                    paymentMethod ===
                    "cod"
                      ? "#FCF8F3"
                      : "#FFF",
                }}
                onClick={() =>
                  setPaymentMethod(
                    "cod"
                  )
                }
              >
                <span
                  style={
                    styles.paymentIcon
                  }
                >
                  ₹
                </span>

                <div
                  style={
                    styles.paymentText
                  }
                >
                  <strong>
                    Cash / QR on Delivery
                  </strong>

                  <p>
                    Extra handling charge
                    of +₹
                    {
                      CONFIG.codFee
                    }
                  </p>
                </div>

                <input
                  type="radio"
                  checked={
                    paymentMethod ===
                    "cod"
                  }
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* ===================================================
              SUMMARY
          =================================================== */}

          <div className="side-panel">
            <div
              style={
                styles.card
              }
            >
              <label
                style={
                  styles.label
                }
              >
                Promo Voucher
              </label>

              {!appliedCoupon ? (
                <div
                  style={
                    styles.couponRow
                  }
                >
                  <input
                    className="input-box"
                    style={{
                      padding:
                        "0.65rem 0.8rem",
                    }}
                    placeholder="COFFEE20"
                    value={
                      coupon
                    }
                    onChange={(
                      event
                    ) =>
                      setCoupon(
                        event.target
                          .value
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={
                      applyCouponCode
                    }
                    style={
                      styles.couponBtn
                    }
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div
                  style={
                    styles.couponPill
                  }
                >
                  <span>
                    <strong>
                      {
                        appliedCoupon.code
                      }
                    </strong>{" "}
                    applied
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setAppliedCoupon(
                        null
                      )
                    }
                    style={
                      styles.removeBtn
                    }
                  >
                    ×
                  </button>
                </div>
              )}

              {couponError && (
                <p
                  style={
                    styles.errorText
                  }
                >
                  {couponError}
                </p>
              )}
            </div>

            <div
              style={
                styles.card
              }
            >
              <h3
                style={
                  styles.summaryTitle
                }
              >
                Order Summary
              </h3>

              <div
                style={
                  styles.calcRow
                }
              >
                <span>
                  Subtotal
                </span>

                <span>
                  ₹
                  {
                    calculations.subtotal
                  }
                </span>
              </div>

              <div
                style={
                  styles.calcRow
                }
              >
                <span>
                  Tax / Fees (8%)
                </span>

                <span>
                  ₹
                  {
                    calculations.tax
                  }
                </span>
              </div>

              <div
                style={
                  styles.calcRow
                }
              >
                <span>
                  Delivery Fee
                </span>

                <span>
                  ₹
                  {
                    calculations.delivery
                  }
                </span>
              </div>

              {selectedReward && (
                <div
                  style={{
                    ...styles.calcRow,
                    color:
                      THEME.colors.success,
                  }}
                >
                  <span>
                    Free{" "}
                    {selectedReward
                      .menuItem
                      ?.name ||
                      selectedReward.title}
                  </span>

                  <span>
                    FREE
                  </span>
                </div>
              )}

              {/* DELIVERY STATUS */}

              {deliveryLoading ? (
                <div
                  style={
                    styles.deliveryLoading
                  }
                >
                  Checking delivery
                  availability...
                </div>
              ) : deliveryAvailable ===
                false ? (
                <div
                  style={
                    styles.deliveryError
                  }
                >
                  <strong>
                    Delivery unavailable
                  </strong>

                  <span>
                    We don't currently
                    deliver to this
                    address.
                  </span>
                </div>
              ) : deliveryAvailable &&
                deliveryInfo ? (
                <div
                  style={
                    styles.deliverySuccess
                  }
                >
                  <strong>
                    Delivery Available ✓
                  </strong>

                  <span>
                    Zone:{" "}
                    {
                      deliveryInfo.zoneName
                    }
                  </span>

                  <span>
                    ETA:{" "}
                    {
                      deliveryInfo.estimatedTime
                    }
                  </span>

                  <span>
                    Minimum Order: ₹
                    {
                      deliveryInfo.minOrder
                    }
                  </span>

                  <span>
                    Free Delivery Above: ₹
                    {
                      deliveryInfo.freeDeliveryAbove
                    }
                  </span>

                  {calculations.delivery ===
                    0 && (
                    <strong
                      style={{
                        color:
                          THEME.colors.success,
                        marginTop: 4,
                      }}
                    >
                      Free Delivery Applied
                    </strong>
                  )}
                </div>
              ) : null}

              {paymentMethod ===
                "cod" && (
                <div
                  style={
                    styles.calcRow
                  }
                >
                  <span>
                    COD Surcharge
                  </span>

                  <span>
                    ₹
                    {
                      calculations.cod
                    }
                  </span>
                </div>
              )}

              {calculations.discount >
                0 && (
                <div
                  style={{
                    ...styles.calcRow,
                    color:
                      THEME.colors.success,
                  }}
                >
                  <span>
                    Discount
                  </span>

                  <span>
                    -₹
                    {
                      calculations.discount
                    }
                  </span>
                </div>
              )}

              {calculations.walletDeduction >
                0 && (
                <div
                  style={{
                    ...styles.calcRow,
                    color:
                      THEME.colors.success,
                  }}
                >
                  <span>
                    Wallet Used
                  </span>

                  <span>
                    -₹
                    {
                      calculations.walletDeduction
                    }
                  </span>
                </div>
              )}

              {calculations.rewardDeduction >
                0 && (
                <div
                  style={{
                    ...styles.calcRow,
                    color:
                      THEME.colors.success,
                  }}
                >
                  <span>
                    Reward Balance
                  </span>

                  <span>
                    -₹
                    {
                      calculations.rewardDeduction
                    }
                  </span>
                </div>
              )}

              <div
                style={
                  styles.summaryDivider
                }
              />

              <div
                style={
                  styles.grandTotal
                }
              >
                <span>
                  Grand Total
                </span>

                <strong>
                  ₹
                  {
                    calculations.grandTotal
                  }
                </strong>
              </div>

              <button
                type="submit"
                disabled={
                  placingOrder ||
                  deliveryLoading ||
                  !selectedAddress ||
                  deliveryAvailable ===
                    false
                }
                style={{
                  ...styles.payBtn,

                  opacity:
                    placingOrder ||
                    deliveryLoading ||
                    !selectedAddress ||
                    deliveryAvailable ===
                      false
                      ? 0.6
                      : 1,

                  cursor:
                    placingOrder ||
                    deliveryLoading ||
                    !selectedAddress ||
                    deliveryAvailable ===
                      false
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {deliveryLoading
                  ? "Checking Delivery..."
                  : placingOrder
                  ? "Processing..."
                  : calculations.grandTotal ===
                    0
                  ? "Place Order"
                  : paymentMethod ===
                    "online"
                  ? "Pay & Place Order"
                  : "Place Order"}
              </button>

              <p
                style={
                  styles.secureNote
                }
              >
                Secure checkout · Your
                payment information is
                handled securely.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* =====================================================
          NEW ADDRESS MODAL
      ===================================================== */}

      {showNewAddress && (
        <div
          style={
            styles.modalOverlay
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeNewAddressModal();
            }
          }}
        >
          <div
            style={
              styles.addressModal
            }
          >
            <div
              style={
                styles.modalHeader
              }
            >
              <div>
                <div
                  style={
                    styles.modalEyebrow
                  }
                >
                  DELIVERY LOCATION
                </div>

                <h2
                  style={
                    styles.modalTitle
                  }
                >
                  Add New Address
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Pin your exact delivery
                  location so our rider can
                  find you easily.
                </p>
              </div>

              <button
                type="button"
                style={
                  styles.modalClose
                }
                onClick={
                  closeNewAddressModal
                }
                disabled={
                  addressSaving
                }
              >
                ×
              </button>
            </div>

            <div
              style={
                styles.searchRow
              }
            >
              <div
                style={
                  styles.searchIcon
                }
              >
                ⌕
              </div>

              <input
                id="checkout-address-search"
                value={
                  mapSearch
                }
                onChange={(
                  event
                ) =>
                  setMapSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search your delivery location..."
                style={
                  styles.mapSearchInput
                }
              />

              <button
                type="button"
                onClick={
                  useCurrentLocation
                }
                style={
                  styles.locationButton
                }
                title="Use current location"
              >
                ◎
              </button>
            </div>

            <div
              className="map-container"
              ref={
                mapContainerRef
              }
              style={
                styles.mapContainer
              }
            >
              {!mapsReady &&
                !mapsError && (
                  <div
                    style={
                      styles.mapLoading
                    }
                  >
                    Loading interactive
                    map...
                  </div>
                )}

              {mapsError && (
                <div
                  style={
                    styles.mapError
                  }
                >
                  <strong>
                    Map unavailable
                  </strong>

                  <span>
                    {mapsError}
                  </span>

                  <small>
                    You can still complete
                    the address fields below,
                    but the exact map location
                    is required for delivery.
                  </small>
                </div>
              )}
            </div>

            <div
              style={
                styles.mapHint
              }
            >
              <span>
                📍
              </span>

              <span>
                Search a place, tap the map,
                or drag the pin to set the
                exact delivery location.
              </span>
            </div>

            {addressError && (
              <div
                style={
                  styles.addressError
                }
              >
                {addressError}
              </div>
            )}

            <div
              style={
                styles.modalFields
              }
            >
              <div
                style={
                  styles.fieldGrid
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Recipient Name
                  </label>

                  <input
                    className="input-box"
                    name="name"
                    value={
                      newAddress.name
                    }
                    onChange={
                      handleNewAddressChange
                    }
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Phone Number
                  </label>

                  <input
                    className="input-box"
                    type="tel"
                    name="phone"
                    value={
                      newAddress.phone
                    }
                    onChange={
                      handleNewAddressChange
                    }
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div
                style={
                  styles.addressTypeRow
                }
              >
                {[
                  "Home",
                  "Work",
                  "Other",
                ].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setNewAddress(
                          (
                            previous
                          ) => ({
                            ...previous,
                            type,
                          })
                        )
                      }
                      style={{
                        ...styles.typeButton,

                        ...(newAddress.type ===
                        type
                          ? styles.typeButtonActive
                          : {}),
                      }}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>

              <div
                style={
                  styles.fieldGrid
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    House / Flat
                  </label>

                  <input
                    className="input-box"
                    name="house"
                    value={
                      newAddress.house
                    }
                    onChange={
                      handleNewAddressChange
                    }
                    placeholder="Flat, house, building"
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    Pincode
                  </label>

                  <input
                    className="input-box"
                    name="pincode"
                    inputMode="numeric"
                    maxLength={6}
                    value={
                      newAddress.pincode
                    }
                    onChange={
                      handleNewAddressChange
                    }
                    placeholder="700001"
                  />
                </div>
              </div>

              <div
                style={
                  styles.field
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Street / Area
                </label>

                <input
                  className="input-box"
                  name="street"
                  value={
                    newAddress.street
                  }
                  onChange={
                    handleNewAddressChange
                  }
                  placeholder="Street, locality, area"
                />
              </div>

              <div
                style={
                  styles.fieldGrid
                }
              >
                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    City
                  </label>

                  <input
                    className="input-box"
                    name="city"
                    value={
                      newAddress.city
                    }
                    onChange={
                      handleNewAddressChange
                    }
                  />
                </div>

                <div>
                  <label
                    style={
                      styles.label
                    }
                  >
                    State
                  </label>

                  <input
                    className="input-box"
                    name="state"
                    value={
                      newAddress.state
                    }
                    onChange={
                      handleNewAddressChange
                    }
                  />
                </div>
              </div>

              <label
                style={
                  styles.saveAddressCheckbox
                }
              >
                <input
                  type="checkbox"
                  checked={
                    saveNewAddress
                  }
                  onChange={(
                    event
                  ) =>
                    setSaveNewAddress(
                      event.target
                        .checked
                    )
                  }
                />

                <span>
                  <strong>
                    Save to my Address Book
                  </strong>

                  <small>
                    Use this address again
                    on future orders.
                  </small>
                </span>
              </label>
            </div>

            <div
              style={
                styles.modalFooter
              }
            >
              <button
                type="button"
                style={
                  styles.cancelButton
                }
                onClick={
                  closeNewAddressModal
                }
                disabled={
                  addressSaving
                }
              >
                Cancel
              </button>

              <button
                type="button"
                style={
                  styles.confirmAddressButton
                }
                onClick={
                  saveAndUseNewAddress
                }
                disabled={
                  addressSaving
                }
              >
                {addressSaving
                  ? "Saving..."
                  : "Confirm & Use Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    padding: "2rem 0 4rem",
    minHeight: "100vh",
  },

  pageInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 1rem",
  },

  backLink: {
    background: "none",
    border: "none",
    color: THEME.colors.textMuted,
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: 0,
    marginBottom: "0.6rem",
  },

  heading: {
    fontFamily: THEME.fonts.serif,
    fontSize: "2.4rem",
    fontWeight: 500,
    color: THEME.colors.textDark,
    margin: "0 0 1.7rem",
    letterSpacing: "-0.02em",
  },

  card: {
    background:
      THEME.colors.cardBg,
    borderRadius: "16px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    boxShadow:
      "0 8px 30px rgba(26,11,5,.025)",
  },

  sectionTitle: {
    fontFamily:
      THEME.fonts.serif,
    fontSize: "1.25rem",
    fontWeight: 500,
    margin:
      "0 0 1.2rem",
    color:
      THEME.colors.textDark,
  },

  /* ADDRESS */

  addressCard: {
    background: "#FFF",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "12px",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    boxShadow:
      "0 8px 30px rgba(26,11,5,.025)",
  },

  addressHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 20,
    alignItems:
      "flex-start",
  },

  addressEyebrow: {
    fontSize: 10,
    letterSpacing: ".16em",
    fontWeight: 700,
    color:
      THEME.colors.primary,
    marginBottom: 6,
  },

  addressTitle: {
    margin: 0,
    marginBottom: 10,
    fontFamily:
      THEME.fonts.serif,
    fontSize: "1.2rem",
    fontWeight: 500,
  },

  addressName: {
    fontWeight: 650,
    margin:
      "0 0 5px",
  },

  addressText: {
    margin: "0",
    color:
      THEME.colors.textMuted,
    fontSize: ".9rem",
    lineHeight: 1.55,
    maxWidth: 600,
  },

  addressPhone: {
    margin:
      "6px 0 0",
    color:
      THEME.colors.textMuted,
    fontSize: ".82rem",
  },

  emptyAddressText: {
    color:
      THEME.colors.textMuted,
    margin: 0,
  },

  addressActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },

  changeButton: {
    background: "transparent",
    color:
      THEME.colors.textDark,
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    padding:
      "9px 14px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 600,
  },

  addAddressButton: {
    background:
      THEME.colors.primary,
    color: "#FFF",
    border: "none",
    padding:
      "9px 14px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 600,
  },

  selectedAddressBadge: {
    display: "inline-flex",
    padding:
      "4px 8px",
    borderRadius: 999,
    background:
      "#F5EDE4",
    color:
      THEME.colors.primary,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".08em",
    marginBottom: 7,
  },

  addressPicker: {
    background: "#FFF",
    borderRadius: 16,
    marginBottom: 20,
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    overflow: "hidden",
  },

  addressPickerHeader: {
    padding: "17px 18px",
    borderBottom:
      "1px solid #EEE8E1",
  },

  addressPickerHeaderP: {
    margin:
      "5px 0 0",
  },

  addressOption: {
    display: "block",
    width: "calc(100% - 24px)",
    margin: 12,
    textAlign: "left",
    padding: 15,
    borderRadius: 12,
    cursor: "pointer",
    transition:
      "all .2s",
    fontFamily:
      THEME.fonts.sans,
  },

  addressOptionTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
  },

  defaultBadge: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".08em",
    background:
      "#EEE5DC",
    padding:
      "3px 6px",
    borderRadius: 5,
    color:
      THEME.colors.textMuted,
  },

  selectedCheck: {
    marginLeft: "auto",
    width: 22,
    height: 22,
    borderRadius: "50%",
    background:
      THEME.colors.primary,
    color: "#FFF",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
  },

  addressOptionName: {
    fontWeight: 650,
    marginBottom: 4,
  },

  addressOptionText: {
    color:
      THEME.colors.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },

  pickerAddButton: {
    width: "100%",
    background: "#FBF8F4",
    border: "none",
    borderTop:
      "1px solid #EEE8E1",
    padding: 16,
    textAlign: "left",
    color:
      THEME.colors.primary,
    cursor: "pointer",
    fontWeight: 650,
  },

  /* FORM */

  field: {
    marginBottom: 16,
  },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 16,
  },

  label: {
    display: "block",
    fontSize: ".78rem",
    fontWeight: 650,
    color:
      THEME.colors.textMuted,
    marginBottom: 6,
  },

  addressReadonly: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
    padding:
      "10px 12px",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    borderRadius: 9,
    color:
      THEME.colors.textDark,
    fontSize: ".9rem",
    background:
      "#FCFAF7",
  },

  editAddressButton: {
    flexShrink: 0,
    background: "none",
    border: "none",
    color:
      THEME.colors.primary,
    cursor: "pointer",
    fontWeight: 700,
  },

  instructions: {
    height: 70,
    resize: "vertical",
  },

  /* PAYMENT */

  walletBox: {
    background:
      THEME.colors.soft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    border:
      `1px solid ${THEME.colors.cardBorder}`,
  },

  walletHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  walletTitle: {
    fontWeight: 700,
    fontSize: 15,
  },

  walletSubtitle: {
    color:
      THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  walletIcon: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background:
      THEME.colors.headerBg,
    color: "#FFF",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
  },

  balanceRow: {
    display: "flex",
    justifyContent:
      "space-between",
    marginBottom: 13,
    fontSize: 14,
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
    fontSize: 14,
    marginTop: 10,
  },

  walletBreakdown: {
    marginTop: 14,
    padding: 12,
    background: "#FFF",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    borderRadius: 10,
  },

  breakdownRow: {
    display: "flex",
    justifyContent:
      "space-between",
    marginBottom: 7,
    fontSize: 13,
  },

  breakdownTotal: {
    display: "flex",
    justifyContent:
      "space-between",
    borderTop:
      `1px solid ${THEME.colors.cardBorder}`,
    paddingTop: 9,
    marginTop: 9,
    fontSize: 13,
  },

  rewardsBox: {
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },

  rewardHeader: {
    marginBottom: 8,
  },

  rewardTitle: {
    margin: 0,
    fontFamily:
      THEME.fonts.serif,
    fontSize: "1.05rem",
    fontWeight: 500,
  },

  rewardSubtitle: {
    margin:
      "4px 0 0",
    color:
      THEME.colors.textMuted,
    fontSize: 12,
  },

  rewardRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding:
      "12px 0",
    borderTop:
      "1px solid #EEE8E1",
    cursor: "pointer",
  },

  rewardStatus: {
    margin:
      "4px 0 0",
    color:
      THEME.colors.success,
    fontSize: 11,
  },

  paymentSelector: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    border: "1.5px solid",
    borderRadius: 11,
    marginBottom: 10,
  },

  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "#F4ECE3",
    color:
      THEME.colors.primary,
    fontWeight: 800,
  },

  paymentText: {
    flex: 1,
  },

  paymentTextP: {
    margin:
      ".25rem 0 0",
  },

  /* SUMMARY */

  couponRow: {
    display: "flex",
    gap: 8,
  },

  couponBtn: {
    background:
      THEME.colors.headerBg,
    color: "#FFF",
    border: "none",
    borderRadius: 9,
    padding:
      "0 16px",
    cursor: "pointer",
    fontWeight: 650,
  },

  couponPill: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    background:
      "#EAF3EC",
    color:
      THEME.colors.success,
    padding:
      "9px 11px",
    borderRadius: 9,
    fontSize: 13,
  },

  removeBtn: {
    background: "none",
    border: "none",
    color:
      THEME.colors.danger,
    cursor: "pointer",
    fontSize: 20,
    lineHeight: 1,
  },

  errorText: {
    color:
      THEME.colors.danger,
    fontSize: 12,
    margin:
      "7px 0 0",
  },

  summaryTitle: {
    margin:
      "0 0 1rem",
    fontFamily:
      THEME.fonts.serif,
    fontSize: "1.25rem",
    fontWeight: 500,
  },

  calcRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    fontSize: ".9rem",
    marginBottom: ".6rem",
    color:
      THEME.colors.textDark,
  },

  summaryDivider: {
    borderTop:
      `1px solid ${THEME.colors.cardBorder}`,
    margin:
      "1rem 0",
  },

  grandTotal: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    fontSize: "1.08rem",
    marginBottom: 18,
  },

  deliveryLoading: {
    background:
      "#F5F0EA",
    color:
      THEME.colors.textMuted,
    padding: 11,
    borderRadius: 9,
    margin:
      "12px 0",
    fontSize: 12,
  },

  deliveryError: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background:
      "#FCE8E6",
    color:
      "#A92D21",
    padding: 12,
    borderRadius: 9,
    margin:
      "12px 0",
    fontSize: 12,
  },

  deliverySuccess: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    background:
      "#EAF4EC",
    color:
      "#28643A",
    padding: 12,
    borderRadius: 9,
    margin:
      "12px 0",
    fontSize: 12,
  },

  payBtn: {
    width: "100%",
    padding: "1rem",
    backgroundColor:
      THEME.colors.headerBg,
    color: "#FFF",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: "1rem",
    outline: "none",
    transition:
      "opacity .2s, transform .2s",
  },

  secureNote: {
    textAlign: "center",
    color:
      THEME.colors.textMuted,
    fontSize: 10,
    lineHeight: 1.5,
    margin:
      "10px 0 0",
  },

  muted: {
    color:
      THEME.colors.textMuted,
    fontSize: 13,
  },

  /* =========================================================
     NEW ADDRESS MODAL
  ========================================================= */

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(20,10,5,.62)",
    backdropFilter:
      "blur(6px)",
    WebkitBackdropFilter:
      "blur(6px)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  addressModal: {
    width: "min(760px, 100%)",
    maxHeight: "94vh",
    overflowY: "auto",
    background: "#FFF",
    borderRadius: 20,
    boxShadow:
      "0 30px 80px rgba(0,0,0,.25)",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 20,
    padding:
      "22px 22px 16px",
    borderBottom:
      "1px solid #EEE8E1",
  },

  modalEyebrow: {
    color:
      THEME.colors.primary,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".16em",
    marginBottom: 5,
  },

  modalTitle: {
    fontFamily:
      THEME.fonts.serif,
    fontSize: "1.65rem",
    fontWeight: 500,
    margin: 0,
  },

  modalSubtitle: {
    margin:
      "5px 0 0",
    color:
      THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 1.5,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    background: "#FFF",
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
    color:
      THEME.colors.textMuted,
    flexShrink: 0,
  },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin:
      "16px 18px 10px",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    borderRadius: 11,
    padding:
      "0 8px 0 12px",
    background: "#FFF",
  },

  searchIcon: {
    color:
      THEME.colors.textMuted,
    fontSize: 22,
  },

  mapSearchInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    outline: "none",
    padding:
      "12px 4px",
    fontSize: 14,
    fontFamily:
      THEME.fonts.sans,
  },

  locationButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "none",
    background:
      "#F5EEE7",
    color:
      THEME.colors.primary,
    cursor: "pointer",
    fontSize: 20,
  },

  mapContainer: {
    height: 330,
    margin:
      "0 18px",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    background:
      "#EEE9E3",
  },

  mapLoading: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    color:
      THEME.colors.textMuted,
    background:
      "#F3EEE8",
    zIndex: 2,
    fontSize: 13,
  },

  mapError: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
    padding: 30,
    color:
      THEME.colors.danger,
    background:
      "#F9ECE8",
    zIndex: 2,
  },

  mapHint: {
    display: "flex",
    gap: 7,
    padding:
      "9px 20px",
    color:
      THEME.colors.textMuted,
    fontSize: 11,
    lineHeight: 1.45,
  },

  addressError: {
    margin:
      "2px 18px 12px",
    background:
      "#FCE8E6",
    color:
      THEME.colors.danger,
    borderRadius: 9,
    padding: 10,
    fontSize: 12,
  },

  modalFields: {
    padding:
      "5px 18px 18px",
  },

  addressTypeRow: {
    display: "flex",
    gap: 7,
    margin:
      "0 0 15px",
  },

  typeButton: {
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    background: "#FFF",
    color:
      THEME.colors.textMuted,
    borderRadius: 999,
    padding:
      "7px 13px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  typeButtonActive: {
    background:
      "#F6ECE2",
    color:
      THEME.colors.primary,
    borderColor:
      THEME.colors.primary,
  },

  saveAddressCheckbox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 5,
    padding:
      "13px 0 0",
    borderTop:
      "1px solid #EEE8E1",
    cursor: "pointer",
    fontSize: 13,
  },

  saveAddressCheckboxSmall: {
    display: "block",
  },

  modalFooter: {
    display: "flex",
    justifyContent:
      "flex-end",
    gap: 10,
    padding:
      "15px 18px",
    borderTop:
      "1px solid #EEE8E1",
    background:
      "#FCFAF7",
    borderRadius:
      "0 0 20px 20px",
  },

  cancelButton: {
    padding:
      "11px 17px",
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    background: "#FFF",
    color:
      THEME.colors.textDark,
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 600,
  },

  confirmAddressButton: {
    padding:
      "11px 19px",
    border: "none",
    background:
      THEME.colors.headerBg,
    color: "#FFF",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 700,
  },

  /* =========================================================
     CONFIRMATION
  ========================================================= */

  confirmPage: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "75vh",
    backgroundColor:
      THEME.colors.bgPage,
    padding: "0 1rem",
    position: "relative",
    overflow: "hidden",
  },

  confettiCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 9999,
  },

  confirmCard: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    padding:
      "3rem 2rem",
    background: "#FFF",
    borderRadius: 20,
    border:
      `1px solid ${THEME.colors.cardBorder}`,
    maxWidth: 460,
    width: "100%",
    boxShadow:
      "0 20px 60px rgba(26,11,5,.08)",
  },

  successIcon: {
    width: 62,
    height: 62,
    margin: "0 auto 18px",
    borderRadius: "50%",
    background:
      "#EAF4EC",
    color:
      THEME.colors.success,
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    fontWeight: 700,
  },

  failureIcon: {
    width: 62,
    height: 62,
    margin: "0 auto 18px",
    borderRadius: "50%",
    background:
      "#FCE8E6",
    color:
      THEME.colors.danger,
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    fontWeight: 700,
  },

  confirmTitle: {
    fontFamily:
      THEME.fonts.serif,
    fontSize: "2.2rem",
    margin:
      "0 0 .5rem",
    fontWeight: 500,
  },

  confirmSub: {
    fontSize: ".95rem",
    color:
      THEME.colors.textMuted,
    lineHeight: 1.6,
    margin:
      "0 0 2rem",
  },

  confirmButtons: {
    display: "flex",
    gap: 12,
    justifyContent:
      "center",
    flexWrap: "wrap",
  },
};
