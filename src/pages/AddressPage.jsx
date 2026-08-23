import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { checkDelivery as checkDeliveryService } from "../service/deliveryService";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Home,
  Briefcase,
  MapPin,
  Star,
  Navigation,
  Search,
  X,
  Check,
  Loader2,
  Clock3,
  MapPinned,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/*
 * Brewed's default map area.
 *
 * We intentionally start the map here so the map is NEVER blank while
 * Google's geocoder is resolving PIN 700033.
 *
 * The coordinates are only the initial visual fallback.
 * The actual 700033 location is resolved through Google Geocoding below.
 */
const BREWED_DEFAULT_PINCODE = "700033";

const BREWED_FALLBACK_CENTER = {
  lat: 22.485,
  lng: 88.345,
};

const MAP_ZOOM_DEFAULT = 14;
const MAP_ZOOM_SELECTED = 17;

const EMPTY_FORM = {
  name: "",
  phone: "",
  house: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  type: "Home",
  isDefault: false,
  latitude: null,
  longitude: null,
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getTimestampMillis(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

function formatRecentDate(value) {
  const millis = getTimestampMillis(value);

  if (!millis) return "";

  const diff = Date.now() - millis;

  if (diff < 60 * 60 * 1000) {
    return "Just now";
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  }

  return new Date(millis).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  /* ------------------------------ DATA STATE ----------------------------- */

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [cleanedForm, setCleanedForm] = useState(EMPTY_FORM);

  /* ---------------------------- GOOGLE STATE ----------------------------- */

  const [googleReady, setGoogleReady] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState(null);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const placesServiceRef = useRef(null);

  /* ---------------------------- LOCATION STATE --------------------------- */

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  /* ------------------------------ SEARCH -------------------------------- */

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  /* --------------------------- DELIVERY STATE ---------------------------- */

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  /* ---------------------------- SAVE STATE ------------------------------- */

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* ------------------------------ MAP STATE ------------------------------ */

  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);

  /* ------------------------------------------------------------------------ */
  /* SORTED ADDRESSES                                                         */
  /* ------------------------------------------------------------------------ */

  const sortedAddresses = useMemo(() => {
    return [...addresses].sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return Number(b.isDefault) - Number(a.isDefault);
      }

      const recentA =
        getTimestampMillis(a.lastUsedAt) ||
        getTimestampMillis(a.updatedAt) ||
        getTimestampMillis(a.createdAt);

      const recentB =
        getTimestampMillis(b.lastUsedAt) ||
        getTimestampMillis(b.updatedAt) ||
        getTimestampMillis(b.createdAt);

      return recentB - recentA;
    });
  }, [addresses]);

  /* ------------------------------------------------------------------------ */
  /* LOAD ADDRESSES                                                           */
  /* ------------------------------------------------------------------------ */

  const loadAddresses = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const snap = await getDocs(
        collection(db, "users", currentUser.uid, "addresses")
      );

      const data = snap.docs.map((addressDoc) => ({
        id: addressDoc.id,
        ...addressDoc.data(),
      }));

      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  /* ------------------------------------------------------------------------ */
  /* LOAD USER DETAILS                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadUserDetails() {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        setCleanedForm((previous) => ({
          ...previous,
          name: userData.fullName || "",
          phone: userData.phone || "",
        }));
      } catch (error) {
        console.error("Failed to load user details:", error);
      }
    }

    loadUserDetails();
  }, [currentUser]);

  /* ------------------------------------------------------------------------ */
  /* LOAD GOOGLE MAPS                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      console.error(
        "Missing VITE_GOOGLE_MAPS_API_KEY environment variable."
      );
      return;
    }

    let cancelled = false;

    loadGoogleMaps(GOOGLE_API_KEY)
      .then(() => {
        if (!cancelled) {
          setGoogleReady(true);
        }
      })
      .catch((error) => {
        console.error("Google Maps failed to load:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* INITIALIZE GOOGLE SERVICES                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!googleReady || !window.google?.maps) return;

    try {
      const service = new window.google.maps.places.AutocompleteService();

      setAutocompleteService(service);

      geocoderRef.current = new window.google.maps.Geocoder();
    } catch (error) {
      console.error("Failed to initialize Google services:", error);
    }
  }, [googleReady]);

  /* ------------------------------------------------------------------------ */
  /* REVERSE GEOCODING                                                        */
  /* ------------------------------------------------------------------------ */

  const reverseGeocode = useCallback(
    async (latitude, longitude, options = {}) => {
      if (!geocoderRef.current) return;

      const { updateForm = true, panMap = true } = options;

      try {
        const response = await geocoderRef.current.geocode({
          location: {
            lat: latitude,
            lng: longitude,
          },
        });

        const result = response.results?.[0];

        if (!result) {
          throw new Error("No address found for this location.");
        }

        const components = result.address_components || [];

        let house = "";
        let street = "";
        let city = "";
        let state = "";
        let pincode = "";

        components.forEach((component) => {
          const types = component.types || [];

          if (
            types.includes("street_number") ||
            types.includes("premise")
          ) {
            if (!house) house = component.long_name;
          }

          if (
            types.includes("route") ||
            types.includes("sublocality_level_1") ||
            types.includes("sublocality")
          ) {
            if (!street) street = component.long_name;
          }

          if (
            types.includes("locality") ||
            types.includes("postal_town")
          ) {
            if (!city) city = component.long_name;
          }

          if (types.includes("administrative_area_level_1")) {
            state = component.long_name;
          }

          if (types.includes("postal_code")) {
            pincode = component.long_name;
          }
        });

        /*
         * Google sometimes doesn't return street_number for Indian
         * addresses. Keep the complete formatted address available as a
         * fallback rather than leaving the user with an unusable location.
         */
        if (!street && result.formatted_address) {
          street = result.formatted_address;
        }

        if (updateForm) {
          setCleanedForm((previous) => ({
            ...previous,
            house,
            street,
            city,
            state,
            pincode,
            latitude,
            longitude,
          }));

          setSearchText(result.formatted_address || "");
        }

        setSelectedCoordinates({
          lat: latitude,
          lng: longitude,
        });

        if (panMap && mapRef.current) {
          mapRef.current.panTo({
            lat: latitude,
            lng: longitude,
          });

          mapRef.current.setZoom(MAP_ZOOM_SELECTED);
        }

        if (pincode && /^\d{6}$/.test(pincode)) {
          checkDelivery(pincode);
        }

        return result;
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        setLocationError(
          "We couldn't identify the address at this location."
        );
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* MOVE / CREATE MARKER                                                     */
  /* ------------------------------------------------------------------------ */

  const placeMarker = useCallback(
    (latitude, longitude, { draggable = true } = {}) => {
      if (!window.google?.maps || !mapRef.current) return;

      const position = {
        lat: latitude,
        lng: longitude,
      };

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position,
          draggable,
          title: "Selected delivery location",
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current.addListener("dragend", () => {
          const markerPosition = markerRef.current.getPosition();

          if (!markerPosition) return;

          const lat = markerPosition.lat();
          const lng = markerPosition.lng();

          setSelectedCoordinates({
            lat,
            lng,
          });

          reverseGeocode(lat, lng);
        });
      } else {
        markerRef.current.setPosition(position);
        markerRef.current.setMap(mapRef.current);
      }

      setSelectedCoordinates(position);
    },
    [reverseGeocode]
  );

  /* ------------------------------------------------------------------------ */
  /* INITIALIZE MAP                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!googleReady || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const google = window.google;

    if (!google?.maps) return;

    try {
      setMapLoading(true);

      /*
       * IMPORTANT:
       * The map starts immediately at Brewed's 700033 area.
       * We then geocode 700033 and refine the center.
       */
      const map = new google.maps.Map(mapContainerRef.current, {
        center: BREWED_FALLBACK_CENTER,
        zoom: MAP_ZOOM_DEFAULT,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
        zoomControl: true,
      });

      mapRef.current = map;

      placesServiceRef.current = new google.maps.places.PlacesService(
        map
      );

      map.addListener("click", (event) => {
        if (!event.latLng) return;

        const latitude = event.latLng.lat();
        const longitude = event.latLng.lng();

        placeMarker(latitude, longitude);
        reverseGeocode(latitude, longitude);
      });

      /*
       * Resolve the actual 700033 location.
       */
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          address: BREWED_DEFAULT_PINCODE,
          componentRestrictions: {
            country: "IN",
          },
        },
        (results, status) => {
          if (
            status === "OK" &&
            results?.[0]?.geometry?.location
          ) {
            const location = results[0].geometry.location;

            const latitude = location.lat();
            const longitude = location.lng();

            map.setCenter({
              lat: latitude,
              lng: longitude,
            });

            map.setZoom(MAP_ZOOM_DEFAULT);

            /*
             * Show a marker immediately for Brewed's default area.
             * This gives the user visual context instead of an empty map.
             */
            placeMarker(latitude, longitude, {
              draggable: true,
            });

            setSelectedCoordinates({
              lat: latitude,
              lng: longitude,
            });
          } else {
            /*
             * Even if geocoding fails, the fallback center remains visible.
             */
            placeMarker(
              BREWED_FALLBACK_CENTER.lat,
              BREWED_FALLBACK_CENTER.lng
            );
          }

          setMapReady(true);
          setMapLoading(false);
        }
      );
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setMapLoading(false);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      mapRef.current = null;
      placesServiceRef.current = null;
    };
  }, [googleReady, placeMarker, reverseGeocode]);

  /* ------------------------------------------------------------------------ */
  /* CENTER MAP ON SAVED ADDRESS                                              */
  /* ------------------------------------------------------------------------ */

  const centerMapOnAddress = useCallback(
    (address) => {
      if (!mapRef.current) return;

      const latitude = Number(address.latitude);
      const longitude = Number(address.longitude);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        mapRef.current.panTo({
          lat: latitude,
          lng: longitude,
        });

        mapRef.current.setZoom(MAP_ZOOM_SELECTED);

        placeMarker(latitude, longitude);
        return;
      }

      /*
       * If an old saved address has no coordinates, geocode its textual
       * address and upgrade it visually without breaking the saved record.
       */
      if (!geocoderRef.current) return;

      const textualAddress = [
        address.house,
        address.street,
        address.city,
        address.state,
        address.pincode,
        "India",
      ]
        .filter(Boolean)
        .join(", ");

      geocoderRef.current.geocode(
        {
          address: textualAddress,
        },
        (results, status) => {
          if (
            status !== "OK" ||
            !results?.[0]?.geometry?.location
          ) {
            return;
          }

          const location = results[0].geometry.location;

          const lat = location.lat();
          const lng = location.lng();

          mapRef.current.panTo({
            lat,
            lng,
          });

          mapRef.current.setZoom(MAP_ZOOM_SELECTED);

          placeMarker(lat, lng);
        }
      );
    },
    [placeMarker]
  );

  /* ------------------------------------------------------------------------ */
  /* DELIVERY CHECK                                                           */
  /* ------------------------------------------------------------------------ */

  const checkDelivery = useCallback(async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      return;
    }

    setCheckingDelivery(true);

    try {
      const result = await checkDeliveryService(pincode);

      if (result?.available) {
        setDeliveryAvailable(true);
        setDeliveryInfo(result.info || null);
      } else {
        setDeliveryAvailable(false);
        setDeliveryInfo(null);
      }
    } catch (error) {
      console.error("Delivery check failed:", error);

      setDeliveryAvailable(false);
      setDeliveryInfo(null);
    } finally {
      setCheckingDelivery(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* PINCODE WATCHER                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const pincode = cleanedForm.pincode;

    if (pincode.length === 6) {
      checkDelivery(pincode);
    } else {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
    }
  }, [cleanedForm.pincode, checkDelivery]);

  /* ------------------------------------------------------------------------ */
  /* INPUT HANDLER                                                            */
  /* ------------------------------------------------------------------------ */

  function handleChange(event) {
    let { name, value } = event.target;

    if (name === "phone" || name === "pincode") {
      value = value.replace(/\D/g, "");
    }

    setCleanedForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "pincode" && value.length < 6) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SEARCH PLACES                                                            */
  /* ------------------------------------------------------------------------ */

  const searchPlaces = (text) => {
    setSearchText(text);
    setLocationError("");

    if (!autocompleteService) return;

    if (text.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    autocompleteService.getPlacePredictions(
      {
        input: text.trim(),
        componentRestrictions: {
          country: "in",
        },
        types: ["geocode"],
      },
      (predictions, status) => {
        setLoadingSuggestions(false);

        if (
          status !==
            window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          setSuggestions([]);
          return;
        }

        setSuggestions(predictions.slice(0, 6));
      }
    );
  };

  /* ------------------------------------------------------------------------ */
  /* SELECT SEARCH RESULT                                                     */
  /* ------------------------------------------------------------------------ */

  const selectSuggestion = (place) => {
    if (!placesServiceRef.current) return;

    setSearchText(place.description);
    setSuggestions([]);
    setLoadingSuggestions(true);

    placesServiceRef.current.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "formatted_address",
          "geometry",
          "address_components",
          "name",
        ],
      },
      (result, status) => {
        setLoadingSuggestions(false);

        if (
          status !==
            window.google.maps.places.PlacesServiceStatus.OK ||
          !result?.geometry?.location
        ) {
          setLocationError(
            "We couldn't load that address. Please try again."
          );
          return;
        }

        const location = result.geometry.location;

        const latitude = location.lat();
        const longitude = location.lng();

        setSelectedCoordinates({
          lat: latitude,
          lng: longitude,
        });

        placeMarker(latitude, longitude);

        if (mapRef.current) {
          mapRef.current.panTo({
            lat: latitude,
            lng: longitude,
          });

          mapRef.current.setZoom(MAP_ZOOM_SELECTED);
        }

        /*
         * Use the exact selected Google place's components when possible.
         */
        const components = result.address_components || [];

        let house = "";
        let street = "";
        let city = "";
        let state = "";
        let pincode = "";

        components.forEach((component) => {
          const types = component.types || [];

          if (
            types.includes("street_number") ||
            types.includes("premise")
          ) {
            if (!house) house = component.long_name;
          }

          if (
            types.includes("route") ||
            types.includes("sublocality_level_1") ||
            types.includes("sublocality")
          ) {
            if (!street) street = component.long_name;
          }

          if (
            types.includes("locality") ||
            types.includes("postal_town")
          ) {
            if (!city) city = component.long_name;
          }

          if (types.includes("administrative_area_level_1")) {
            state = component.long_name;
          }

          if (types.includes("postal_code")) {
            pincode = component.long_name;
          }
        });

        setCleanedForm((previous) => ({
          ...previous,
          house,
          street:
            street ||
            result.formatted_address ||
            previous.street,
          city,
          state,
          pincode,
          latitude,
          longitude,
        }));

        if (pincode.length === 6) {
          checkDelivery(pincode);
        }
      }
    );
  };

  /* ------------------------------------------------------------------------ */
  /* CURRENT LOCATION                                                         */
  /* ------------------------------------------------------------------------ */

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Your device doesn't support location services."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          if (mapRef.current) {
            mapRef.current.panTo({
              lat: latitude,
              lng: longitude,
            });

            mapRef.current.setZoom(MAP_ZOOM_SELECTED);
          }

          placeMarker(latitude, longitude);

          await reverseGeocode(latitude, longitude);
        } catch (error) {
          console.error("Current location failed:", error);

          setLocationError(
            "Unable to determine your address from your current location."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let message = "Couldn't get your current location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission was denied. Please allow location access and try again.";
            break;

          case error.POSITION_UNAVAILABLE:
            message =
              "Your current location is unavailable right now.";
            break;

          case error.TIMEOUT:
            message =
              "Location request timed out. Please try again.";
            break;

          default:
            break;
        }

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      }
    );
  };

  /* ------------------------------------------------------------------------ */
  /* OPEN NEW ADDRESS                                                         */
  /* ------------------------------------------------------------------------ */

  const openNewAddress = () => {
    setEditingId(null);

    setCleanedForm({
      ...EMPTY_FORM,
      name: cleanedForm.name,
      phone: cleanedForm.phone,
      pincode: "",
    });

    setSearchText("");
    setSuggestions([]);
    setLocationError("");
    setDeliveryAvailable(null);
    setDeliveryInfo(null);

    setShowForm(true);

    /*
     * Map remains around Brewed's 700033 area.
     * We don't reset it to blank.
     */
    if (mapRef.current) {
      mapRef.current.setCenter(BREWED_FALLBACK_CENTER);
      mapRef.current.setZoom(MAP_ZOOM_DEFAULT);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* EDIT ADDRESS                                                             */
  /* ------------------------------------------------------------------------ */

  const editAddress = (address) => {
    setCleanedForm({
      name: address.name || "",
      phone: address.phone || "",
      house: address.house || "",
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      type: address.type || "Home",
      isDefault: Boolean(address.isDefault),
      latitude:
        Number.isFinite(Number(address.latitude))
          ? Number(address.latitude)
          : null,
      longitude:
        Number.isFinite(Number(address.longitude))
          ? Number(address.longitude)
          : null,
    });

    setSearchText(
      [
        address.house,
        address.street,
        address.city,
        address.state,
        address.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    );

    setEditingId(address.id);
    setShowForm(true);

    setLocationError("");

    if (address.pincode?.length === 6) {
      checkDelivery(address.pincode);
    }

    setTimeout(() => {
      centerMapOnAddress(address);
    }, 50);
  };

  /* ------------------------------------------------------------------------ */
  /* SAVE ADDRESS                                                             */
  /* ------------------------------------------------------------------------ */

  const saveAddress = async () => {
    if (!currentUser || saving) return;

    const name = cleanedForm.name.trim();
    const phone = cleanedForm.phone.trim();
    const house = cleanedForm.house.trim();
    const street = cleanedForm.street.trim();
    const city = cleanedForm.city.trim();
    const state = cleanedForm.state.trim();
    const pincode = cleanedForm.pincode.trim();

    if (!name) {
      alert("Please enter your full name.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    if (!house) {
      alert("Please enter your house or flat number.");
      return;
    }

    if (!street) {
      alert("Please enter your street or area.");
      return;
    }

    if (!city) {
      alert("Please enter your city.");
      return;
    }

    if (!state) {
      alert("Please enter your state.");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      alert("Pincode must be exactly 6 digits.");
      return;
    }

    if (deliveryAvailable === false) {
      alert(
        "This address is outside Brewed's current delivery area."
      );
      return;
    }

    /*
     * If map coordinates exist, persist them.
     * Otherwise preserve the current form coordinates.
     */
    const latitude =
      selectedCoordinates?.lat ??
      cleanedForm.latitude ??
      null;

    const longitude =
      selectedCoordinates?.lng ??
      cleanedForm.longitude ??
      null;

    const duplicate = addresses.some((item) => {
      if (editingId && item.id === editingId) return false;

      return (
        normalize(item.house) === normalize(house) &&
        normalize(item.street) === normalize(street) &&
        normalize(item.city) === normalize(city) &&
        normalize(item.pincode) === normalize(pincode)
      );
    });

    if (duplicate) {
      alert("This address is already saved.");
      return;
    }

    const addressData = {
      name,
      phone,
      house,
      street,
      city,
      state,
      pincode,
      type: cleanedForm.type || "Home",
      isDefault: Boolean(cleanedForm.isDefault),
      latitude,
      longitude,
      lastUsedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            editingId
          ),
          addressData
        );

        setAddresses((previous) =>
          previous.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...addressData,
                }
              : item
          )
        );
      } else {
        const collectionRef = collection(
          db,
          "users",
          currentUser.uid,
          "addresses"
        );

        const ref = await addDoc(collectionRef, {
          ...addressData,
          createdAt: serverTimestamp(),
        });

        setAddresses((previous) => [
          ...previous,
          {
            id: ref.id,
            ...addressData,
            createdAt: new Date(),
            lastUsedAt: new Date(),
          },
        ]);
      }

      /*
       * If the user explicitly saved this as default, make every other
       * address non-default.
       */
      if (addressData.isDefault) {
        const targetId = editingId;

        const snapshot = await getDocs(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          )
        );

        await Promise.all(
          snapshot.docs
            .filter((item) => item.id !== targetId)
            .map((item) =>
              updateDoc(item.ref, {
                isDefault: false,
              })
            )
        );

        setAddresses((previous) =>
          previous.map((item) => ({
            ...item,
            isDefault:
              item.id === targetId ||
              (!targetId &&
                item.id ===
                  previous[previous.length - 1]?.id),
          }))
        );
      }

      setCleanedForm({
        ...EMPTY_FORM,
        name,
        phone,
      });

      setSearchText("");
      setSuggestions([]);
      setEditingId(null);
      setShowForm(false);
      setSelectedCoordinates(null);

      await loadAddresses();
    } catch (error) {
      console.error("Failed to save address:", error);
      alert(
        "We couldn't save this address. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* DELETE ADDRESS                                                           */
  /* ------------------------------------------------------------------------ */

  const removeAddress = async (id) => {
    if (!currentUser || deletingId) return;

    const address = addresses.find((item) => item.id === id);

    const message = address?.isDefault
      ? "This is your default address. Delete it anyway?"
      : "Delete this saved address?";

    if (!window.confirm(message)) return;

    try {
      setDeletingId(id);

      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          id
        )
      );

      setAddresses((previous) =>
        previous.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert(
        "We couldn't delete this address. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* SET DEFAULT                                                              */
  /* ------------------------------------------------------------------------ */

  const setDefaultAddress = async (id) => {
    if (!currentUser) return;

    const target = addresses.find((item) => item.id === id);

    if (!target || target.isDefault) return;

    try {
      const updates = addresses.map((item) => ({
        ...item,
        isDefault: item.id === id,
      }));

      setAddresses(updates);

      await Promise.all(
        addresses.map((item) =>
          updateDoc(
            doc(
              db,
              "users",
              currentUser.uid,
              "addresses",
              item.id
            ),
            {
              isDefault: item.id === id,
              ...(item.id === id
                ? { lastUsedAt: serverTimestamp() }
                : {}),
            }
          )
        )
      );

      await loadAddresses();
    } catch (error) {
      console.error("Failed to set default address:", error);

      await loadAddresses();

      alert(
        "We couldn't update your default address."
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* CLOSE FORM                                                               */
  /* ------------------------------------------------------------------------ */

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setSuggestions([]);
    setSearchText("");
    setLocationError("");
  };

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .address-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(196,149,106,0.08),
              transparent 32%
            ),
            #FDFAF5;
          color: #1A0B05;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          padding: 28px 20px 70px;
        }

        .address-shell {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        /* HEADER */

        .address-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 26px;
        }

        .address-back {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border: 1px solid #EEE5DC;
          border-radius: 14px;
          background: rgba(255,255,255,0.88);
          color: #1A0B05;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(26,11,5,0.06);
          transition: all 0.2s ease;
        }

        .address-back:hover {
          transform: translateY(-1px);
          border-color: #C4956A;
          box-shadow: 0 8px 24px rgba(26,11,5,0.1);
        }

        .address-header-copy {
          min-width: 0;
          flex: 1;
        }

        .address-eyebrow {
          margin: 0 0 4px;
          color: #C4956A;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .address-title {
          margin: 0;
          color: #1A0B05;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(29px, 5vw, 38px);
          line-height: 1.08;
          font-weight: 600;
          letter-spacing: -0.025em;
        }

        .address-subtitle {
          margin: 7px 0 0;
          color: #837A73;
          font-size: 14px;
          line-height: 1.5;
        }

        .address-count {
          display: none;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 42px;
          padding: 0 12px;
          border-radius: 999px;
          background: #F5EBDD;
          color: #9B6B42;
          font-size: 13px;
          font-weight: 800;
        }

        /* TOP ACTION */

        .address-add-button {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 16px;
          background: #1A0B05;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 750;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(26,11,5,0.16);
          transition: all 0.2s ease;
          margin-bottom: 24px;
        }

        .address-add-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 32px rgba(26,11,5,0.2);
        }

        /* FORM */

        .address-form-card {
          background: rgba(255,255,255,0.96);
          border: 1px solid #EEE5DC;
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 28px;
          box-shadow: 0 16px 45px rgba(26,11,5,0.08);
          overflow: hidden;
        }

        .address-form-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 18px;
        }

        .address-form-title {
          margin: 0;
          color: #1A0B05;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          font-weight: 600;
        }

        .address-form-description {
          margin: 5px 0 0;
          color: #8A817A;
          font-size: 13px;
          line-height: 1.5;
        }

        .address-close {
          width: 38px;
          height: 38px;
          border: 1px solid #EEE5DC;
          border-radius: 12px;
          background: #FAF7F3;
          color: #5D5048;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 38px;
        }

        /* MAP */

        .map-section {
          position: relative;
          margin-bottom: 18px;
        }

        .map-container {
          width: 100%;
          height: 310px;
          border-radius: 19px;
          overflow: hidden;
          border: 1px solid #E9DED3;
          background: #EAE5DF;
          position: relative;
        }

        .map-loading {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            rgba(253,250,245,0.92),
            rgba(245,238,230,0.86)
          );
          color: #6F625A;
          font-size: 13px;
          font-weight: 700;
          gap: 8px;
        }

        .map-hint {
          position: absolute;
          z-index: 4;
          left: 12px;
          bottom: 12px;
          padding: 8px 11px;
          border-radius: 10px;
          background: rgba(26,11,5,0.82);
          color: #fff;
          font-size: 11px;
          font-weight: 650;
          backdrop-filter: blur(8px);
          pointer-events: none;
        }

        .map-location-button {
          position: absolute;
          z-index: 4;
          top: 12px;
          right: 12px;
          height: 42px;
          padding: 0 13px;
          border: 0;
          border-radius: 12px;
          background: rgba(255,255,255,0.96);
          color: #1A0B05;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 5px 18px rgba(26,11,5,0.14);
        }

        .map-location-button:hover {
          background: #FFFFFF;
        }

        /* SEARCH */

        .address-search-wrapper {
          position: relative;
          margin-bottom: 16px;
        }

        .address-search-box {
          width: 100%;
          min-height: 52px;
          padding: 0 45px 0 44px;
          border: 1px solid #E5DBD1;
          border-radius: 14px;
          background: #FCFAF7;
          color: #1A0B05;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }

        .address-search-box:focus {
          background: #FFFFFF;
          border-color: #C4956A;
          box-shadow: 0 0 0 4px rgba(196,149,106,0.1);
        }

        .address-search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #9B8B80;
          pointer-events: none;
        }

        .address-search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          border: 0;
          background: transparent;
          color: #8A7C73;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .suggestions {
          position: absolute;
          z-index: 20;
          left: 0;
          right: 0;
          top: calc(100% + 7px);
          background: #FFFFFF;
          border: 1px solid #E9DED3;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 15px 40px rgba(26,11,5,0.13);
        }

        .suggestion {
          width: 100%;
          padding: 13px 15px;
          border: 0;
          border-bottom: 1px solid #F1EBE5;
          background: #FFFFFF;
          color: #3B302A;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          line-height: 1.45;
        }

        .suggestion:last-child {
          border-bottom: 0;
        }

        .suggestion:hover {
          background: #FCF8F3;
        }

        .suggestion-icon {
          flex: 0 0 auto;
          margin-top: 2px;
          color: #C4956A;
        }

        /* LOCATION BUTTON */

        .current-location-button {
          width: 100%;
          min-height: 50px;
          margin-bottom: 18px;
          border: 1px solid #DCC5B0;
          border-radius: 14px;
          background: #FFF9F3;
          color: #8E603D;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .current-location-button:hover {
          background: #FDF0E4;
          border-color: #C4956A;
        }

        /* FIELDS */

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field {
          min-width: 0;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: block;
          margin: 0 0 7px 2px;
          color: #574940;
          font-size: 12px;
          font-weight: 750;
        }

        .field-input,
        .field-select {
          width: 100%;
          min-height: 50px;
          padding: 0 14px;
          border: 1px solid #E4DAD0;
          border-radius: 13px;
          background: #FFFFFF;
          color: #1A0B05;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }

        .field-input::placeholder {
          color: #B0A59D;
        }

        .field-input:focus,
        .field-select:focus {
          border-color: #C4956A;
          box-shadow: 0 0 0 4px rgba(196,149,106,0.09);
        }

        .field-select {
          cursor: pointer;
        }

        /* DELIVERY STATUS */

        .delivery-status {
          grid-column: 1 / -1;
          min-height: 48px;
          padding: 12px 14px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 700;
        }

        .delivery-status.available {
          background: #F1F8F2;
          color: #367344;
          border: 1px solid #D6EAD9;
        }

        .delivery-status.unavailable {
          background: #FFF3F1;
          color: #A34A3D;
          border: 1px solid #F0D5D0;
        }

        .delivery-status.checking {
          background: #F8F4EF;
          color: #786A60;
          border: 1px solid #ECE1D7;
        }

        .delivery-extra {
          margin-left: auto;
          color: inherit;
          opacity: 0.75;
          font-size: 11px;
        }

        /* ERROR */

        .address-error {
          margin: 12px 0 0;
          padding: 11px 13px;
          border-radius: 12px;
          background: #FFF2F0;
          border: 1px solid #F0D5D0;
          color: #A34A3D;
          font-size: 12px;
          line-height: 1.5;
        }

        /* SAVE */

        .save-address-button {
          width: 100%;
          min-height: 54px;
          margin-top: 18px;
          border: 0;
          border-radius: 15px;
          background: #1A0B05;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(26,11,5,0.16);
          transition: all 0.2s ease;
        }

        .save-address-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 13px 29px rgba(26,11,5,0.2);
        }

        .save-address-button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* EMPTY STATE */

        .empty-address {
          background: rgba(255,255,255,0.9);
          border: 1px solid #EEE5DC;
          border-radius: 24px;
          padding: 48px 22px;
          text-align: center;
          box-shadow: 0 12px 35px rgba(26,11,5,0.06);
        }

        .empty-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto 18px;
          border-radius: 22px;
          background: #F7EDE2;
          color: #C4956A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-title {
          margin: 0 0 8px;
          color: #1A0B05;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          font-weight: 600;
        }

        .empty-text {
          max-width: 360px;
          margin: 0 auto;
          color: #837A73;
          font-size: 14px;
          line-height: 1.65;
        }

        /* ADDRESS LIST */

        .address-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .address-card {
          background: rgba(255,255,255,0.95);
          border: 1px solid #EEE5DC;
          border-radius: 21px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(26,11,5,0.055);
          transition: all 0.2s ease;
        }

        .address-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 13px 34px rgba(26,11,5,0.08);
        }

        .address-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .address-type {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .address-type-icon {
          color: #C4956A;
        }

        .address-type-text {
          color: #1A0B05;
          font-size: 14px;
          font-weight: 800;
        }

        .address-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .address-badge.default {
          background: #C4956A;
          color: #FFFFFF;
        }

        .address-badge.recent {
          background: #F4E9DE;
          color: #996C47;
        }

        .address-actions {
          display: flex;
          gap: 7px;
          flex: 0 0 auto;
        }

        .address-icon-button {
          width: 37px;
          height: 37px;
          border: 1px solid #ECE3DB;
          border-radius: 11px;
          background: #FAF7F3;
          color: #4C4038;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .address-icon-button:hover {
          background: #F3E8DD;
          color: #1A0B05;
          border-color: #D8C2AE;
        }

        .address-icon-button.delete:hover {
          background: #FFF1EF;
          border-color: #E8C8C2;
          color: #A34A3D;
        }

        .address-name {
          margin: 0 0 4px;
          color: #1A0B05;
          font-size: 16px;
          font-weight: 800;
        }

        .address-phone {
          margin: 0 0 11px;
          color: #8B8078;
          font-size: 12px;
        }

        .address-lines {
          color: #4E433D;
          font-size: 13px;
          line-height: 1.65;
        }

        .address-line {
          margin: 0;
        }

        .recent-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 11px;
          color: #A18F82;
          font-size: 11px;
          font-weight: 600;
        }

        .default-address-button {
          width: 100%;
          min-height: 43px;
          margin-top: 15px;
          border: 1px solid #DCC7B5;
          border-radius: 12px;
          background: #FFF9F3;
          color: #9A6C47;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .default-address-button:hover:not(:disabled) {
          background: #F7EBDD;
          border-color: #C4956A;
        }

        .default-address-button.active {
          background: #C4956A;
          color: #FFFFFF;
          border-color: #C4956A;
          cursor: default;
        }

        .loading-state {
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #837A73;
          font-size: 13px;
          font-weight: 700;
        }

        /* RESPONSIVE */

        @media (min-width: 620px) {
          .address-page {
            padding: 38px 28px 80px;
          }

          .address-count {
            display: flex;
          }

          .address-form-card {
            padding: 26px;
          }

          .map-container {
            height: 350px;
          }

          .address-card {
            padding: 20px;
          }
        }

        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .delivery-status {
            grid-column: auto;
          }

          .map-container {
            height: 285px;
          }

          .map-hint {
            max-width: calc(100% - 24px);
          }

          .map-location-button {
            font-size: 0;
            width: 42px;
            padding: 0;
            justify-content: center;
          }
        }

        @media (max-width: 430px) {
          .address-page {
            padding: 22px 14px 55px;
          }

          .address-form-card {
            padding: 16px;
            border-radius: 20px;
          }

          .address-header {
            gap: 11px;
          }

          .address-back {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .address-subtitle {
            font-size: 12px;
          }

          .address-card-top {
            gap: 8px;
          }

          .address-actions {
            gap: 5px;
          }

          .address-icon-button {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>

      <main className="address-page">
        <div className="address-shell">

          {/* ---------------------------------------------------------------- */}
          {/* HEADER                                                           */}
          {/* ---------------------------------------------------------------- */}

          <header className="address-header">
            <button
              type="button"
              className="address-back"
              onClick={() => setPage("menu")}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="address-header-copy">
              <p className="address-eyebrow">Delivery</p>

              <h1 className="address-title">
                My Addresses
              </h1>

              <p className="address-subtitle">
                Save your favourite delivery spots for a faster
                checkout.
              </p>
            </div>

            <div className="address-count">
              {addresses.length}
            </div>
          </header>

          {/* ---------------------------------------------------------------- */}
          {/* ADD BUTTON                                                       */}
          {/* ---------------------------------------------------------------- */}

          {!showForm && (
            <button
              type="button"
              className="address-add-button"
              onClick={openNewAddress}
            >
              <Plus size={18} />
              Add New Address
            </button>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* FORM                                                             */}
          {/* ---------------------------------------------------------------- */}

          {showForm && (
            <section className="address-form-card">

              <div className="address-form-head">
                <div>
                  <h2 className="address-form-title">
                    {editingId
                      ? "Edit Address"
                      : "Add an Address"}
                  </h2>

                  <p className="address-form-description">
                    Pin your exact location or search for your
                    address.
                  </p>
                </div>

                <button
                  type="button"
                  className="address-close"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* MAP */}

              <div className="map-section">
                <div
                  ref={mapContainerRef}
                  className="map-container"
                />

                {!mapReady && (
                  <div className="map-loading">
                    <Loader2
                      size={16}
                      className="spin"
                    />
                    Preparing Brewed's map…
                  </div>
                )}

                <button
                  type="button"
                  className="map-location-button"
                  onClick={useCurrentLocation}
                  disabled={locationLoading}
                  aria-label="Use current location"
                >
                  {locationLoading ? (
                    <Loader2 size={17} />
                  ) : (
                    <Navigation size={17} />
                  )}

                  <span>My location</span>
                </button>

                <div className="map-hint">
                  Drag the pin or tap the map to choose your
                  delivery location
                </div>
              </div>

              {/* SEARCH */}

              <div className="address-search-wrapper">
                <Search
                  size={18}
                  className="address-search-icon"
                />

                <input
                  type="text"
                  className="address-search-box"
                  placeholder="Search your address..."
                  value={searchText}
                  onChange={(event) =>
                    searchPlaces(event.target.value)
                  }
                  autoComplete="off"
                />

                {searchText && (
                  <button
                    type="button"
                    className="address-search-clear"
                    onClick={() => {
                      setSearchText("");
                      setSuggestions([]);
                    }}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}

                {loadingSuggestions && (
                  <div
                    style={{
                      position: "absolute",
                      right: "15px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <Loader2
                      size={17}
                      color="#C4956A"
                    />
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="suggestions">
                    {suggestions.map((place) => (
                      <button
                        type="button"
                        className="suggestion"
                        key={place.place_id}
                        onClick={() =>
                          selectSuggestion(place)
                        }
                      >
                        <MapPin
                          size={16}
                          className="suggestion-icon"
                        />

                        <span>
                          {place.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* CURRENT LOCATION */}

              <button
                type="button"
                className="current-location-button"
                onClick={useCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <Loader2 size={17} />
                ) : (
                  <Navigation size={17} />
                )}

                {locationLoading
                  ? "Detecting your location..."
                  : "Use Current Location"}
              </button>

              {locationError && (
                <div className="address-error">
                  {locationError}
                </div>
              )}

              {/* FIELDS */}

              <div className="form-grid">

                <div className="field">
                  <label className="field-label">
                    Full Name
                  </label>

                  <input
                    className="field-input"
                    name="name"
                    placeholder="Enter full name"
                    value={cleanedForm.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Phone Number
                  </label>

                  <input
                    className="field-input"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={cleanedForm.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    House / Flat
                  </label>

                  <input
                    className="field-input"
                    name="house"
                    placeholder="Flat, house or building"
                    value={cleanedForm.house}
                    onChange={handleChange}
                    autoComplete="address-line1"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Street / Area
                  </label>

                  <input
                    className="field-input"
                    name="street"
                    placeholder="Street, locality or area"
                    value={cleanedForm.street}
                    onChange={handleChange}
                    autoComplete="address-line2"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    City
                  </label>

                  <input
                    className="field-input"
                    name="city"
                    placeholder="City"
                    value={cleanedForm.city}
                    onChange={handleChange}
                    autoComplete="address-level2"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    State
                  </label>

                  <input
                    className="field-input"
                    name="state"
                    placeholder="State"
                    value={cleanedForm.state}
                    onChange={handleChange}
                    autoComplete="address-level1"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Pincode
                  </label>

                  <input
                    className="field-input"
                    name="pincode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit pincode"
                    value={cleanedForm.pincode}
                    onChange={handleChange}
                    autoComplete="postal-code"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    Address Type
                  </label>

                  <select
                    className="field-select"
                    name="type"
                    value={cleanedForm.type}
                    onChange={handleChange}
                  >
                    <option value="Home">
                      Home
                    </option>

                    <option value="Work">
                      Work
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                {/* DELIVERY */}

                {checkingDelivery && (
                  <div className="delivery-status checking">
                    <Loader2 size={17} />
                    Checking delivery availability…
                  </div>
                )}

                {!checkingDelivery &&
                  deliveryAvailable === true && (
                    <div className="delivery-status available">
                      <Check size={17} />

                      <span>
                        Delivery is available at this
                        address.
                      </span>

                      {deliveryInfo && (
                        <span className="delivery-extra">
                          {deliveryInfo.area ||
                            deliveryInfo.city ||
                            ""}
                        </span>
                      )}
                    </div>
                  )}

                {!checkingDelivery &&
                  deliveryAvailable === false && (
                    <div className="delivery-status unavailable">
                      <X size={17} />

                      <span>
                        Sorry, Brewed doesn't deliver to this
                        pincode yet.
                      </span>
                    </div>
                  )}
              </div>

              {/* SAVE */}

              <button
                type="button"
                className="save-address-button"
                onClick={saveAddress}
                disabled={
                  saving ||
                  checkingDelivery ||
                  deliveryAvailable === false
                }
              >
                {saving ? (
                  <>
                    <Loader2 size={17} />
                    Saving Address…
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {editingId
                      ? "Update Address"
                      : "Save Address"}
                  </>
                )}
              </button>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* EMPTY                                                            */}
          {/* ---------------------------------------------------------------- */}

          {!loading && addresses.length === 0 && !showForm && (
            <section className="empty-address">
              <div className="empty-icon">
                <MapPinned size={32} />
              </div>

              <h2 className="empty-title">
                No Saved Addresses
              </h2>

              <p className="empty-text">
                Add your first delivery address and make
                checkout quicker every time you order.
              </p>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* ADDRESS LIST                                                     */}
          {/* ---------------------------------------------------------------- */}

          <section className="address-list">
            {loading && (
              <div className="loading-state">
                <Loader2 size={18} />
                Loading your addresses…
              </div>
            )}

            {!loading &&
              sortedAddresses.map((address, index) => {
                const timestamp =
                  address.lastUsedAt ||
                  address.updatedAt ||
                  address.createdAt;

                const millis =
                  getTimestampMillis(timestamp);

                /*
                 * "Recent" means the address was used/updated within
                 * the last 7 days.
                 */
                const isRecent =
                  millis > 0 &&
                  Date.now() - millis <
                    7 * 24 * 60 * 60 * 1000;

                return (
                  <article
                    className="address-card"
                    key={address.id}
                  >
                    <div className="address-card-top">

                      <div className="address-type">
                        {address.type === "Home" && (
                          <Home
                            size={18}
                            className="address-type-icon"
                          />
                        )}

                        {address.type === "Work" && (
                          <Briefcase
                            size={18}
                            className="address-type-icon"
                          />
                        )}

                        {address.type === "Other" && (
                          <MapPin
                            size={18}
                            className="address-type-icon"
                          />
                        )}

                        <span className="address-type-text">
                          {address.type || "Address"}
                        </span>

                        {address.isDefault && (
                          <span className="address-badge default">
                            <Star
                              size={11}
                              fill="currentColor"
                            />
                            Default
                          </span>
                        )}

                        {!address.isDefault &&
                          isRecent && (
                            <span className="address-badge recent">
                              <Clock3 size={11} />
                              Recent
                            </span>
                          )}
                      </div>

                      <div className="address-actions">
                        <button
                          type="button"
                          className="address-icon-button"
                          onClick={() =>
                            editAddress(address)
                          }
                          aria-label="Edit address"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="address-icon-button delete"
                          onClick={() =>
                            removeAddress(address.id)
                          }
                          disabled={
                            deletingId === address.id
                          }
                          aria-label="Delete address"
                        >
                          {deletingId === address.id ? (
                            <Loader2 size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="address-name">
                      {address.name}
                    </h3>

                    <p className="address-phone">
                      {address.phone}
                    </p>

                    <div className="address-lines">
                      <p className="address-line">
                        {address.house}
                        {address.street
                          ? `, ${address.street}`
                          : ""}
                      </p>

                      <p className="address-line">
                        {address.city}
                        {address.state
                          ? `, ${address.state}`
                          : ""}
                      </p>

                      <p className="address-line">
                        {address.pincode}
                      </p>
                    </div>

                    {millis > 0 && (
                      <div className="recent-meta">
                        <Clock3 size={12} />
                        {isRecent
                          ? `Updated ${formatRecentDate(
                              timestamp
                            )}`
                          : "Saved address"}
                      </div>
                    )}

                    <button
                      type="button"
                      className={`default-address-button ${
                        address.isDefault
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setDefaultAddress(address.id)
                      }
                      disabled={address.isDefault}
                    >
                      {address.isDefault ? (
                        <>
                          <Star
                            size={14}
                            fill="currentColor"
                          />
                          Default Address
                        </>
                      ) : (
                        <>
                          <Star size={14} />
                          Set as Default
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* ADD ANOTHER WHEN LIST EXISTS                                     */}
          {/* ---------------------------------------------------------------- */}

          {!showForm && addresses.length > 0 && (
            <button
              type="button"
              className="address-add-button"
              style={{ marginTop: "18px" }}
              onClick={openNewAddress}
            >
              <Plus size={18} />
              Add Another Address
            </button>
          )}
        </div>
      </main>
    </>
  );
}
