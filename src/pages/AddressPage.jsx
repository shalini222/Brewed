import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { checkDelivery as checkDeliveryService } from "../service/deliveryService";

import {
  GoogleMap,
  MarkerF,
} from "@react-google-maps/api";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Home,
  BriefcaseBusiness,
  MapPin,
  Star,
  Navigation,
  Search,
  X,
  Check,
  AlertCircle,
  Clock3,
  Loader2,
  ChevronRight,
  MapPinned,
} from "lucide-react";

const DEFAULT_CENTER = {
  lat: 22.5726,
  lng: 88.3639,
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "280px",
};

const emptyForm = {
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

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  const GOOGLE_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [cleanedForm, setCleanedForm] = useState(emptyForm);

  const [googleReady, setGoogleReady] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState(null);
  const [placesService, setPlacesService] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /*
   * ------------------------------------------------------------
   * Toast
   * ------------------------------------------------------------
   */

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  /*
   * ------------------------------------------------------------
   * Load addresses
   * ------------------------------------------------------------
   */

  const loadAddresses = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "users", currentUser.uid, "addresses")
      );

      const data = snapshot.docs.map((addressDoc) => ({
        id: addressDoc.id,
        ...addressDoc.data(),
      }));

      data.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;

        const aTime =
          a.lastUsedAt?.seconds ||
          a.createdAt?.seconds ||
          0;

        const bTime =
          b.lastUsedAt?.seconds ||
          b.createdAt?.seconds ||
          0;

        return bTime - aTime;
      });

      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
      showToast("Unable to load your addresses.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  /*
   * ------------------------------------------------------------
   * Load user details
   * ------------------------------------------------------------
   */

  useEffect(() => {
    async function loadUserDetails() {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        setCleanedForm((prev) => ({
          ...prev,
          name: userData.fullName || prev.name || "",
          phone: userData.phone || prev.phone || "",
        }));
      } catch (error) {
        console.error("Failed to load user details:", error);
      }
    }

    loadUserDetails();
  }, [currentUser]);

  /*
   * ------------------------------------------------------------
   * Load Google Maps
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      console.error(
        "Missing VITE_GOOGLE_MAPS_API_KEY environment variable."
      );
      return;
    }

    let mounted = true;

    loadGoogleMaps(GOOGLE_API_KEY)
      .then(() => {
        if (mounted) {
          setGoogleReady(true);
        }
      })
      .catch((error) => {
        console.error("Google Maps failed to load:", error);
      });

    return () => {
      mounted = false;
    };
  }, [GOOGLE_API_KEY]);

  /*
   * ------------------------------------------------------------
   * Google Places services
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!googleReady || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.AutocompleteService();

    const places = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    setAutocompleteService(autocomplete);
    setPlacesService(places);
  }, [googleReady]);

  /*
   * ------------------------------------------------------------
   * Delivery validation
   * ------------------------------------------------------------
   */

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

  useEffect(() => {
    if (cleanedForm.pincode.length === 6) {
      checkDelivery(cleanedForm.pincode);
    } else {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
    }
  }, [cleanedForm.pincode, checkDelivery]);

  /*
   * ------------------------------------------------------------
   * Form helpers
   * ------------------------------------------------------------
   */

  function resetLocationState() {
    setSearchText("");
    setSuggestions([]);
    setLocationError("");
    setMarkerPosition(null);
    setMapCenter(DEFAULT_CENTER);
    setDeliveryAvailable(null);
    setDeliveryInfo(null);
  }

  function resetForm() {
    setCleanedForm({
      ...emptyForm,
      name: cleanedForm.name,
      phone: cleanedForm.phone,
    });

    setEditingId(null);
    resetLocationState();
  }

  function openAddForm() {
    if (showForm && !editingId) {
      setShowForm(false);
      return;
    }

    resetForm();
    setShowForm(true);
  }

  function handleChange(event) {
    let { name, value } = event.target;

    if (name === "phone" || name === "pincode") {
      value = value.replace(/\D/g, "");
    }

    setCleanedForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /*
   * ------------------------------------------------------------
   * Google address parsing
   * ------------------------------------------------------------
   */

  function parseAddressComponents(components = []) {
    let house = "";
    let street = "";
    let city = "";
    let state = "";
    let pincode = "";

    components.forEach((component) => {
      const types = component.types || [];

      if (types.includes("street_number")) {
        house = component.long_name;
      }

      if (types.includes("route")) {
        street = component.long_name;
      }

      if (
        types.includes("locality") ||
        types.includes("postal_town")
      ) {
        city = component.long_name;
      }

      if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }

      if (types.includes("postal_code")) {
        pincode = component.long_name;
      }
    });

    return {
      house,
      street,
      city,
      state,
      pincode,
    };
  }

  /*
   * ------------------------------------------------------------
   * Google Places search
   * ------------------------------------------------------------
   */

  function searchPlaces(text) {
    setSearchText(text);

    if (!autocompleteService || !window.google?.maps?.places) {
      return;
    }

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);

    autocompleteService.getPlacePredictions(
      {
        input: text.trim(),
        componentRestrictions: {
          country: "in",
        },
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

        setSuggestions(predictions);
      }
    );
  }

  async function selectPlace(place) {
    if (!placesService || !place?.place_id) return;

    setLoadingSuggestions(true);

    placesService.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "place_id",
          "formatted_address",
          "geometry",
          "address_components",
          "name",
        ],
      },
      (result, status) => {
        setLoadingSuggestions(false);

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !result
        ) {
          showToast("Unable to load this location.", "error");
          return;
        }

        const location = result.geometry?.location;

        if (!location) {
          showToast("This location has no map coordinates.", "error");
          return;
        }

        const latitude = location.lat();
        const longitude = location.lng();

        const parsed = parseAddressComponents(
          result.address_components
        );

        setCleanedForm((prev) => ({
          ...prev,
          ...parsed,
          latitude,
          longitude,
        }));

        setMarkerPosition({
          lat: latitude,
          lng: longitude,
        });

        setMapCenter({
          lat: latitude,
          lng: longitude,
        });

        setSearchText(result.formatted_address || place.description);
        setSuggestions([]);
        setLocationError("");
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * Reverse geocoding
   * ------------------------------------------------------------
   */

  async function reverseGeocode(latitude, longitude) {
    if (!window.google?.maps?.Geocoder) {
      return null;
    }

    const geocoder = new window.google.maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode(
        {
          location: {
            lat: latitude,
            lng: longitude,
          },
        },
        (results, status) => {
          if (
            status !== window.google.maps.GeocoderStatus.OK ||
            !results?.length
          ) {
            resolve(null);
            return;
          }

          const result = results[0];

          const parsed = parseAddressComponents(
            result.address_components
          );

          resolve({
            ...parsed,
            formattedAddress: result.formatted_address || "",
          });
        }
      );
    });
  }

  /*
   * ------------------------------------------------------------
   * Interactive map marker movement
   * ------------------------------------------------------------
   */

  async function handleMarkerDragEnd(event) {
    if (!event.latLng) return;

    const latitude = event.latLng.lat();
    const longitude = event.latLng.lng();

    setMarkerPosition({
      lat: latitude,
      lng: longitude,
    });

    setMapCenter({
      lat: latitude,
      lng: longitude,
    });

    setMapLoading(true);

    try {
      const parsed = await reverseGeocode(latitude, longitude);

      if (parsed) {
        setCleanedForm((prev) => ({
          ...prev,
          ...parsed,
          latitude,
          longitude,
        }));

        setSearchText(parsed.formattedAddress || "");
      } else {
        setCleanedForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      showToast(
        "Location moved, but the address could not be updated.",
        "error"
      );
    } finally {
      setMapLoading(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * Current location
   * ------------------------------------------------------------
   */

  function useCurrentLocation() {
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

        setMarkerPosition({
          lat: latitude,
          lng: longitude,
        });

        setMapCenter({
          lat: latitude,
          lng: longitude,
        });

        setMapLoading(true);

        try {
          const parsed = await reverseGeocode(
            latitude,
            longitude
          );

          if (!parsed) {
            setCleanedForm((prev) => ({
              ...prev,
              latitude,
              longitude,
            }));

            showToast(
              "Location found, but we couldn't read the address.",
              "error"
            );

            return;
          }

          setCleanedForm((prev) => ({
            ...prev,
            ...parsed,
            latitude,
            longitude,
          }));

          setSearchText(parsed.formattedAddress || "");

          showToast("Current location detected.");
        } catch (error) {
          console.error(
            "Current location reverse geocoding failed:",
            error
          );

          setLocationError(
            "Unable to convert your location into an address."
          );
        } finally {
          setMapLoading(false);
        }
      },
      (error) => {
        let message = "Couldn't get your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission was denied.";
            break;

          case error.POSITION_UNAVAILABLE:
            message = "Your location is currently unavailable.";
            break;

          case error.TIMEOUT:
            message = "Location request timed out.";
            break;

          default:
            break;
        }

        setLocationError(message);
        showToast(message, "error");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * Edit address
   * ------------------------------------------------------------
   */

  function editAddress(address) {
    const latitude = Number(address.latitude);
    const longitude = Number(address.longitude);

    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

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
      latitude: hasCoordinates ? latitude : null,
      longitude: hasCoordinates ? longitude : null,
    });

    setEditingId(address.id);

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

    if (hasCoordinates) {
      setMarkerPosition({
        lat: latitude,
        lng: longitude,
      });

      setMapCenter({
        lat: latitude,
        lng: longitude,
      });
    } else {
      setMarkerPosition(null);
      setMapCenter(DEFAULT_CENTER);
    }

    setDeliveryAvailable(null);
    setDeliveryInfo(null);
    setLocationError("");
    setSuggestions([]);

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ------------------------------------------------------------
   * Save address
   * ------------------------------------------------------------
   */

  async function saveAddress() {
    if (!currentUser || saving) return;

    const name = cleanedForm.name.trim();
    const phone = cleanedForm.phone.trim();
    const house = cleanedForm.house.trim();
    const street = cleanedForm.street.trim();
    const city = cleanedForm.city.trim();
    const state = cleanedForm.state.trim();
    const pincode = cleanedForm.pincode.trim();

    if (!name) {
      showToast("Please enter the recipient's name.", "error");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      showToast(
        "Phone number must contain exactly 10 digits.",
        "error"
      );
      return;
    }

    if (!house) {
      showToast(
        "Please enter your house or flat number.",
        "error"
      );
      return;
    }

    if (!street) {
      showToast(
        "Please enter your street or area.",
        "error"
      );
      return;
    }

    if (!city) {
      showToast("Please enter your city.", "error");
      return;
    }

    if (!state) {
      showToast("Please enter your state.", "error");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      showToast(
        "Pincode must contain exactly 6 digits.",
        "error"
      );
      return;
    }

    if (deliveryAvailable === false) {
      showToast(
        "This location is outside the current delivery area.",
        "error"
      );
      return;
    }

    const latitude =
      cleanedForm.latitude !== null
        ? Number(cleanedForm.latitude)
        : null;

    const longitude =
      cleanedForm.longitude !== null
        ? Number(cleanedForm.longitude)
        : null;

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
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };

    try {
      setSaving(true);

      /*
       * --------------------------------------------------------
       * Editing
       * --------------------------------------------------------
       */

      if (editingId) {
        const addressRef = doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          editingId
        );

        await updateDoc(addressRef, {
          ...addressData,
          updatedAt: serverTimestamp(),
        });

        /*
         * If this address becomes default, remove default from
         * every other address.
         */

        if (addressData.isDefault) {
          const batch = writeBatch(db);

          addresses.forEach((item) => {
            if (
              item.id !== editingId &&
              item.isDefault
            ) {
              batch.update(
                doc(
                  db,
                  "users",
                  currentUser.uid,
                  "addresses",
                  item.id
                ),
                {
                  isDefault: false,
                }
              );
            }
          });

          await batch.commit();
        }

        setAddresses((prev) =>
          prev.map((item) => ({
            ...item,
            ...(item.id === editingId
              ? addressData
              : addressData.isDefault
                ? { isDefault: false }
                : {}),
          }))
        );

        showToast("Address updated successfully.");
      }

      /*
       * --------------------------------------------------------
       * Creating
       * --------------------------------------------------------
       */

      else {
        const normalizedHouse = house.toLowerCase();
        const normalizedStreet = street.toLowerCase();
        const normalizedCity = city.toLowerCase();

        const isDuplicate = addresses.some(
          (item) =>
            String(item.house || "")
              .trim()
              .toLowerCase() === normalizedHouse &&
            String(item.street || "")
              .trim()
              .toLowerCase() === normalizedStreet &&
            String(item.city || "")
              .trim()
              .toLowerCase() === normalizedCity &&
            String(item.pincode || "") === pincode
        );

        if (isDuplicate) {
          showToast(
            "This address is already saved.",
            "error"
          );
          return;
        }

        /*
         * If this is the first address, automatically make it
         * default.
         */

        const shouldBeDefault =
          addressData.isDefault ||
          addresses.length === 0;

        if (shouldBeDefault && addresses.length > 0) {
          const batch = writeBatch(db);

          addresses.forEach((item) => {
            if (item.isDefault) {
              batch.update(
                doc(
                  db,
                  "users",
                  currentUser.uid,
                  "addresses",
                  item.id
                ),
                {
                  isDefault: false,
                }
              );
            }
          });

          await batch.commit();
        }

        const finalAddress = {
          ...addressData,
          isDefault: shouldBeDefault,
          createdAt: serverTimestamp(),
        };

        const ref = await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          ),
          finalAddress
        );

        setAddresses((prev) => [
          ...prev.map((item) =>
            shouldBeDefault
              ? { ...item, isDefault: false }
              : item
          ),
          {
            id: ref.id,
            ...addressData,
            isDefault: shouldBeDefault,
          },
        ]);

        showToast("Address saved successfully.");
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save address:", error);
      showToast(
        "We couldn't save your address. Please try again.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * Delete address
   * ------------------------------------------------------------
   */

  async function removeAddress() {
    if (!currentUser || !deleteTarget) return;

    try {
      const addressRef = doc(
        db,
        "users",
        currentUser.uid,
        "addresses",
        deleteTarget.id
      );

      await deleteDoc(addressRef);

      const remaining = addresses.filter(
        (item) => item.id !== deleteTarget.id
      );

      /*
       * If the deleted address was default, promote the first
       * remaining address.
       */

      if (
        deleteTarget.isDefault &&
        remaining.length > 0
      ) {
        const newDefault = remaining[0];

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            newDefault.id
          ),
          {
            isDefault: true,
          }
        );

        remaining[0] = {
          ...remaining[0],
          isDefault: true,
        };
      }

      setAddresses(remaining);

      if (editingId === deleteTarget.id) {
        resetForm();
        setShowForm(false);
      }

      setDeleteTarget(null);

      showToast("Address removed.");
    } catch (error) {
      console.error("Failed to delete address:", error);

      showToast(
        "We couldn't remove this address.",
        "error"
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * Default address
   * ------------------------------------------------------------
   */

  async function setDefaultAddress(id) {
    if (!currentUser) return;

    const currentDefault = addresses.find(
      (item) => item.isDefault
    );

    if (currentDefault?.id === id) return;

    try {
      const batch = writeBatch(db);

      addresses.forEach((item) => {
        batch.update(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            item.id
          ),
          {
            isDefault: item.id === id,
          }
        );
      });

      await batch.commit();

      setAddresses((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === id,
        }))
      );

      showToast("Default address updated.");
    } catch (error) {
      console.error(
        "Failed to update default address:",
        error
      );

      showToast(
        "Couldn't update your default address.",
        "error"
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * Recently used
   * ------------------------------------------------------------
   *
   * Checkout/order flow can update lastUsedAt when an address
   * is actually selected for an order.
   *
   * Existing addresses without lastUsedAt fall back to
   * createdAt so the section isn't unnecessarily empty.
   */

  const recentAddresses = useMemo(() => {
    return [...addresses]
      .sort((a, b) => {
        const aTime =
          a.lastUsedAt?.seconds ||
          a.createdAt?.seconds ||
          0;

        const bTime =
          b.lastUsedAt?.seconds ||
          b.createdAt?.seconds ||
          0;

        return bTime - aTime;
      })
      .slice(0, 3);
  }, [addresses]);

  /*
   * ------------------------------------------------------------
   * Address icon
   * ------------------------------------------------------------
   */

  function AddressTypeIcon({ type, size = 18 }) {
    if (type === "Work") {
      return <BriefcaseBusiness size={size} />;
    }

    if (type === "Other") {
      return <MapPinned size={size} />;
    }

    return <Home size={size} />;
  }

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */

  return (
    <div style={styles.page}>
      {toast && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "error"
              ? styles.toastError
              : styles.toastSuccess),
          }}
        >
          {toast.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <Check size={18} />
          )}

          <span>{toast.message}</span>

          <button
            style={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main style={styles.container}>
        {/* HEADER */}

        <header style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => setPage("menu")}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <p style={styles.eyebrow}>DELIVERY</p>

            <h1 style={styles.title}>
              My Addresses
            </h1>

            <p style={styles.subtitle}>
              Your saved delivery locations
            </p>
          </div>
        </header>

        {/* ADD ADDRESS */}

        <button
          style={styles.addButton}
          onClick={openAddForm}
        >
          <span style={styles.addIcon}>
            {showForm && !editingId ? (
              <X size={18} />
            ) : (
              <Plus size={18} />
            )}
          </span>

          <span>
            {showForm && !editingId
              ? "Close Address Form"
              : "Add New Address"}
          </span>

          {!showForm && (
            <ChevronRight
              size={18}
              style={{ marginLeft: "auto" }}
            />
          )}
        </button>

        {/* FORM */}

        {showForm && (
          <section style={styles.formCard}>
            <div style={styles.formHeader}>
              <div>
                <p style={styles.formEyebrow}>
                  {editingId
                    ? "SAVED LOCATION"
                    : "NEW LOCATION"}
                </p>

                <h2 style={styles.formTitle}>
                  {editingId
                    ? "Edit address"
                    : "Where should we deliver?"}
                </h2>
              </div>

              <button
                style={styles.closeFormButton}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {/* LOCATION */}

            <div style={styles.formSection}>
              <div style={styles.sectionLabelRow}>
                <MapPin size={16} />
                <span>LOCATION</span>
              </div>

              <button
                style={styles.currentLocationButton}
                onClick={useCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <Loader2
                    size={18}
                    style={styles.spin}
                  />
                ) : (
                  <Navigation size={18} />
                )}

                {locationLoading
                  ? "Finding your location..."
                  : "Use current location"}
              </button>

              {locationError && (
                <div style={styles.inlineError}>
                  <AlertCircle size={16} />
                  <span>{locationError}</span>
                </div>
              )}

              <div style={styles.searchWrapper}>
                <Search
                  size={18}
                  style={styles.searchIcon}
                />

                <input
                  type="text"
                  placeholder="Search for an area, street or place"
                  value={searchText}
                  onChange={(event) =>
                    searchPlaces(event.target.value)
                  }
                  style={styles.searchInput}
                  autoComplete="off"
                />

                {searchText && (
                  <button
                    style={styles.clearSearch}
                    onClick={() => {
                      setSearchText("");
                      setSuggestions([]);
                    }}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {(suggestions.length > 0 ||
                loadingSuggestions) && (
                <div style={styles.suggestions}>
                  {loadingSuggestions ? (
                    <div style={styles.suggestionLoading}>
                      <Loader2
                        size={17}
                        style={styles.spin}
                      />
                      Searching locations...
                    </div>
                  ) : (
                    suggestions.map((place) => (
                      <button
                        key={place.place_id}
                        style={styles.suggestion}
                        onClick={() =>
                          selectPlace(place)
                        }
                      >
                        <span
                          style={styles.suggestionIcon}
                        >
                          <MapPin size={16} />
                        </span>

                        <span
                          style={
                            styles.suggestionContent
                          }
                        >
                          <strong>
                            {place.structured_formatting
                              ?.main_text ||
                              place.description}
                          </strong>

                          {place
                            .structured_formatting
                            ?.secondary_text && (
                            <small>
                              {
                                place
                                  .structured_formatting
                                  .secondary_text
                              }
                            </small>
                          )}
                        </span>

                        <ChevronRight
                          size={16}
                          style={{
                            marginLeft: "auto",
                            opacity: 0.45,
                          }}
                        />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* INTERACTIVE MAP */}

              <div style={styles.mapCard}>
                {googleReady ? (
                  <GoogleMap
                    mapContainerStyle={
                      MAP_CONTAINER_STYLE
                    }
                    center={mapCenter}
                    zoom={
                      markerPosition ? 17 : 13
                    }
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      clickableIcons: false,
                      gestureHandling: "greedy",
                    }}
                    onClick={(event) => {
                      if (!event.latLng) return;

                      handleMarkerDragEnd({
                        latLng: event.latLng,
                      });
                    }}
                  >
                    {markerPosition && (
                      <MarkerF
                        position={markerPosition}
                        draggable
                        onDragEnd={
                          handleMarkerDragEnd
                        }
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div style={styles.mapPlaceholder}>
                    <MapPinned size={30} />
                    <span>
                      Loading map...
                    </span>
                  </div>
                )}

                {mapLoading && (
                  <div style={styles.mapLoading}>
                    <Loader2
                      size={17}
                      style={styles.spin}
                    />
                    Updating address...
                  </div>
                )}

                {!markerPosition &&
                  googleReady && (
                    <div style={styles.mapHint}>
                      <MapPin size={15} />
                      Select a location or tap the map
                      to place your pin
                    </div>
                  )}
              </div>

              {markerPosition && (
                <p style={styles.mapInstruction}>
                  Drag the pin to fine-tune your
                  delivery location.
                </p>
              )}
            </div>

            {/* CONTACT */}

            <div style={styles.formSection}>
              <div style={styles.sectionLabelRow}>
                <span>CONTACT DETAILS</span>
              </div>

              <div style={styles.fieldGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Full name
                  </label>

                  <input
                    name="name"
                    value={cleanedForm.name}
                    onChange={handleChange}
                    placeholder="Recipient name"
                    style={styles.input}
                    autoComplete="name"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Phone number
                  </label>

                  <input
                    name="phone"
                    value={cleanedForm.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                    style={styles.input}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* ADDRESS DETAILS */}

            <div style={styles.formSection}>
              <div style={styles.sectionLabelRow}>
                <span>ADDRESS DETAILS</span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  House / Flat number
                </label>

                <input
                  name="house"
                  value={cleanedForm.house}
                  onChange={handleChange}
                  placeholder="e.g. Flat 4B, 12A"
                  style={styles.input}
                  autoComplete="address-line1"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Street / Area
                </label>

                <input
                  name="street"
                  value={cleanedForm.street}
                  onChange={handleChange}
                  placeholder="Street, locality or area"
                  style={styles.input}
                  autoComplete="address-line2"
                />
              </div>

              <div style={styles.fieldGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    City
                  </label>

                  <input
                    name="city"
                    value={cleanedForm.city}
                    onChange={handleChange}
                    placeholder="City"
                    style={styles.input}
                    autoComplete="address-level2"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    State
                  </label>

                  <input
                    name="state"
                    value={cleanedForm.state}
                    onChange={handleChange}
                    placeholder="State"
                    style={styles.input}
                    autoComplete="address-level1"
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Pincode
                </label>

                <input
                  name="pincode"
                  value={cleanedForm.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  inputMode="numeric"
                  style={styles.input}
                  autoComplete="postal-code"
                />
              </div>

              {/* DELIVERY STATUS */}

              {checkingDelivery && (
                <div style={styles.deliveryChecking}>
                  <Loader2
                    size={17}
                    style={styles.spin}
                  />
                  Checking delivery availability...
                </div>
              )}

              {deliveryAvailable === true && (
                <div style={styles.deliverySuccess}>
                  <span
                    style={styles.deliveryIcon}
                  >
                    <Check size={16} />
                  </span>

                  <div>
                    <strong>
                      Delivery available
                    </strong>

                    {deliveryInfo && (
                      <span>
                        {typeof deliveryInfo ===
                        "string"
                          ? deliveryInfo
                          : deliveryInfo.message ||
                            deliveryInfo.estimatedTime ||
                            "This location is within our delivery area."}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {deliveryAvailable === false && (
                <div style={styles.deliveryError}>
                  <AlertCircle size={17} />

                  <span>
                    Sorry, Brewed doesn't deliver to
                    this location yet.
                  </span>
                </div>
              )}
            </div>

            {/* ADDRESS TYPE */}

            <div style={styles.formSection}>
              <div style={styles.sectionLabelRow}>
                <span>SAVE AS</span>
              </div>

              <div style={styles.typeSelector}>
                {["Home", "Work", "Other"].map(
                  (type) => {
                    const selected =
                      cleanedForm.type === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        style={{
                          ...styles.typeOption,
                          ...(selected
                            ? styles.typeOptionActive
                            : {}),
                        }}
                        onClick={() =>
                          setCleanedForm(
                            (prev) => ({
                              ...prev,
                              type,
                            })
                          )
                        }
                      >
                        <AddressTypeIcon
                          type={type}
                          size={17}
                        />

                        {type}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* SAVE */}

            <button
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.7 : 1,
              }}
              onClick={saveAddress}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    style={styles.spin}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  {editingId
                    ? "Update Address"
                    : "Save Address"}
                </>
              )}
            </button>
          </section>
        )}

        {/* RECENT ADDRESSES */}

        {!loading &&
          recentAddresses.length > 0 && (
            <section style={styles.recentSection}>
              <div style={styles.sectionHeading}>
                <div>
                  <p style={styles.eyebrow}>
                    QUICK ACCESS
                  </p>

                  <h2 style={styles.sectionTitle}>
                    Recently Used
                  </h2>
                </div>

                <Clock3
                  size={20}
                  color="#C4956A"
                />
              </div>

              <div style={styles.recentList}>
                {recentAddresses.map((address) => (
                  <button
                    key={address.id}
                    style={styles.recentCard}
                    onClick={() =>
                      editAddress(address)
                    }
                  >
                    <span style={styles.recentIcon}>
                      <AddressTypeIcon
                        type={address.type}
                        size={18}
                      />
                    </span>

                    <span
                      style={styles.recentContent}
                    >
                      <strong>
                        {address.type || "Address"}
                      </strong>

                      <span>
                        {[
                          address.house,
                          address.street,
                          address.city,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </span>

                    <ChevronRight
                      size={18}
                      color="#A49B93"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

        {/* SAVED ADDRESSES */}

        <section style={styles.savedSection}>
          <div style={styles.sectionHeading}>
            <div>
              <p style={styles.eyebrow}>
                YOUR LOCATIONS
              </p>

              <h2 style={styles.sectionTitle}>
                Saved Addresses
              </h2>
            </div>

            {!loading &&
              addresses.length > 0 && (
                <span style={styles.countBadge}>
                  {addresses.length}
                </span>
              )}
          </div>

          {/* LOADING */}

          {loading && (
            <div style={styles.loadingBox}>
              <Loader2
                size={24}
                style={styles.spin}
              />

              <span>
                Loading your addresses...
              </span>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            addresses.length === 0 && (
              <div style={styles.emptyBox}>
                <div style={styles.emptyIcon}>
                  <MapPin size={27} />
                </div>

                <h2 style={styles.emptyTitle}>
                  No saved addresses
                </h2>

                <p style={styles.emptyText}>
                  Add your first delivery address
                  and make checkout faster.
                </p>

                <button
                  style={styles.emptyButton}
                  onClick={openAddForm}
                >
                  <Plus size={17} />
                  Add Address
                </button>
              </div>
            )}

          {/* ADDRESS CARDS */}

          {!loading &&
            addresses.length > 0 && (
              <div style={styles.list}>
                {[...addresses]
                  .sort(
                    (a, b) =>
                      Number(b.isDefault) -
                      Number(a.isDefault)
                  )
                  .map((address) => (
                    <article
                      key={address.id}
                      style={{
                        ...styles.card,
                        ...(address.isDefault
                          ? styles.defaultCard
                          : {}),
                      }}
                    >
                      <div
                        style={styles.cardTop}
                      >
                        <div
                          style={
                            styles.typeContainer
                          }
                        >
                          <span
                            style={
                              styles.addressTypeIcon
                            }
                          >
                            <AddressTypeIcon
                              type={address.type}
                              size={18}
                            />
                          </span>

                          <div>
                            <div
                              style={
                                styles.typeRow
                              }
                            >
                              <span
                                style={
                                  styles.typeText
                                }
                              >
                                {address.type ||
                                  "Address"}
                              </span>

                              {address.isDefault && (
                                <span
                                  style={
                                    styles.defaultBadge
                                  }
                                >
                                  <Star
                                    size={12}
                                    fill="currentColor"
                                  />
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          style={styles.actions}
                        >
                          <button
                            style={
                              styles.iconButton
                            }
                            onClick={() =>
                              editAddress(
                                address
                              )
                            }
                            aria-label="Edit address"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            style={{
                              ...styles.iconButton,
                              color: "#A34B43",
                            }}
                            onClick={() =>
                              setDeleteTarget(
                                address
                              )
                            }
                            aria-label="Delete address"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>

                      <div
                        style={styles.addressInfo}
                      >
                        <h3
                          style={styles.name}
                        >
                          {address.name}
                        </h3>

                        <p
                          style={styles.phone}
                        >
                          {address.phone}
                        </p>

                        <p
                          style={styles.address}
                        >
                          {[
                            address.house,
                            address.street,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                        <p
                          style={styles.address}
                        >
                          {[
                            address.city,
                            address.state,
                            address.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>

                      {!address.isDefault && (
                        <button
                          style={
                            styles.defaultButton
                          }
                          onClick={() =>
                            setDefaultAddress(
                              address.id
                            )
                          }
                        >
                          <Star size={15} />
                          Set as default
                        </button>
                      )}

                      {address.isDefault && (
                        <div
                          style={
                            styles.defaultFooter
                          }
                        >
                          <Check size={15} />
                          This is your default
                          delivery address
                        </div>
                      )}
                    </article>
                  ))}
              </div>
            )}
        </section>
      </main>

      {/* DELETE MODAL */}

      {deleteTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>
              <Trash2 size={21} />
            </div>

            <h2 style={styles.modalTitle}>
              Remove this address?
            </h2>

            <p style={styles.modalText}>
              This saved address will be permanently
              removed from your account.
            </p>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Cancel
              </button>

              <button
                style={styles.deleteButton}
                onClick={removeAddress}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FDFAF5",
    color: "#1A0B05",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "32px 20px 70px",
    boxSizing: "border-box",
  },

  container: {
    width: "100%",
    maxWidth: "860px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "26px",
  },

  backButton: {
    flexShrink: 0,
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "1px solid #EDE5DC",
    background: "#FFFFFF",
    color: "#1A0B05",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(26, 11, 5, 0.05)",
  },

  eyebrow: {
    margin: "0 0 5px",
    fontSize: "10px",
    letterSpacing: "0.18em",
    fontWeight: "800",
    color: "#C4956A",
  },

  title: {
    margin: 0,
    fontFamily:
      "'Playfair Display', Georgia, serif",
    fontSize: "clamp(28px, 5vw, 38px)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    fontWeight: "700",
    color: "#1A0B05",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#8A817A",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  addButton: {
    width: "100%",
    minHeight: "58px",
    border: "1px solid #C4956A",
    borderRadius: "16px",
    background: "#1A0B05",
    color: "#FFFFFF",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.01em",
    cursor: "pointer",
    boxShadow:
      "0 12px 28px rgba(26, 11, 5, 0.12)",
    marginBottom: "30px",
  },

  addIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "9px",
    background: "#C4956A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  formCard: {
    background: "#FFFFFF",
    border: "1px solid #EDE5DC",
    borderRadius: "24px",
    padding: "24px",
    marginBottom: "36px",
    boxShadow:
      "0 18px 50px rgba(26, 11, 5, 0.07)",
  },

  formHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    paddingBottom: "22px",
    borderBottom: "1px solid #F0EBE5",
    marginBottom: "24px",
  },

  formEyebrow: {
    margin: "0 0 5px",
    color: "#C4956A",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "0.16em",
  },

  formTitle: {
    margin: 0,
    fontFamily:
      "'Playfair Display', Georgia, serif",
    fontSize: "25px",
    lineHeight: 1.2,
    color: "#1A0B05",
  },

  closeFormButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "1px solid #EDE5DC",
    background: "#FAF7F3",
    color: "#1A0B05",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  formSection: {
    marginBottom: "28px",
  },

  sectionLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "13px",
    color: "#8A817A",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "0.15em",
  },

  currentLocationButton: {
    width: "100%",
    minHeight: "48px",
    border: "1px solid #E4D5C7",
    borderRadius: "13px",
    background: "#FBF6F0",
    color: "#6F4932",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "12px",
  },

  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginBottom: "8px",
  },

  searchIcon: {
    position: "absolute",
    left: "15px",
    color: "#9B9188",
    pointerEvents: "none",
  },

  searchInput: {
    width: "100%",
    minHeight: "50px",
    boxSizing: "border-box",
    border: "1px solid #E6DED6",
    borderRadius: "13px",
    background: "#FFFFFF",
    color: "#1A0B05",
    padding: "0 44px",
    fontSize: "14px",
    outline: "none",
  },

  clearSearch: {
    position: "absolute",
    right: "10px",
    width: "30px",
    height: "30px",
    border: "none",
    borderRadius: "50%",
    background: "#F5F1EC",
    color: "#756B63",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  suggestions: {
    position: "relative",
    zIndex: 20,
    background: "#FFFFFF",
    border: "1px solid #EDE5DC",
    borderRadius: "14px",
    overflow: "hidden",
    marginBottom: "12px",
    boxShadow:
      "0 14px 35px rgba(26, 11, 5, 0.10)",
  },

  suggestion: {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #F1ECE7",
    background: "#FFFFFF",
    color: "#1A0B05",
    padding: "13px 14px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    textAlign: "left",
    cursor: "pointer",
  },

  suggestionIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "#FBF5EF",
    color: "#C4956A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  suggestionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
  },

  suggestionLoading: {
    padding: "16px",
    color: "#81776E",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    fontSize: "13px",
  },

  mapCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "17px",
    border: "1px solid #E6DED6",
    background: "#F5F0EA",
    marginTop: "12px",
  },

  mapPlaceholder: {
    height: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#9A9088",
    fontSize: "13px",
  },

  mapLoading: {
    position: "absolute",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #E8DFD7",
    borderRadius: "999px",
    padding: "8px 13px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#6E6259",
    fontSize: "12px",
    fontWeight: "700",
    boxShadow:
      "0 5px 16px rgba(26, 11, 5, 0.10)",
    zIndex: 5,
  },

  mapHint: {
    position: "absolute",
    bottom: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "max-content",
    maxWidth: "calc(100% - 24px)",
    background: "rgba(26, 11, 5, 0.86)",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "600",
    zIndex: 5,
  },

  mapInstruction: {
    margin: "8px 2px 0",
    color: "#8C8178",
    fontSize: "11px",
  },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  field: {
    marginBottom: "14px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#665C54",
    fontSize: "12px",
    fontWeight: "700",
  },

  input: {
    width: "100%",
    minHeight: "48px",
    boxSizing: "border-box",
    border: "1px solid #E6DED6",
    borderRadius: "12px",
    background: "#FFFFFF",
    color: "#1A0B05",
    padding: "0 14px",
    fontSize: "14px",
    outline: "none",
  },

  inlineError: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 12px",
    borderRadius: "11px",
    background: "#FFF3F1",
    color: "#A34B43",
    fontSize: "12px",
    marginBottom: "10px",
  },

  deliveryChecking: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 13px",
    borderRadius: "12px",
    background: "#F8F4EF",
    color: "#796D64",
    fontSize: "12px",
    fontWeight: "600",
  },

  deliverySuccess: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 13px",
    borderRadius: "12px",
    background: "#F1F8F1",
    color: "#477047",
    fontSize: "12px",
  },

  deliveryIcon: {
    width: "27px",
    height: "27px",
    borderRadius: "50%",
    background: "#DDEEDB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  deliveryError: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 13px",
    borderRadius: "12px",
    background: "#FFF3F1",
    color: "#A34B43",
    fontSize: "12px",
    fontWeight: "600",
  },

  typeSelector: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "9px",
  },

  typeOption: {
    minHeight: "48px",
    border: "1px solid #E6DED6",
    borderRadius: "12px",
    background: "#FFFFFF",
    color: "#665C54",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  typeOptionActive: {
    borderColor: "#C4956A",
    background: "#FBF3EA",
    color: "#8A5B3B",
  },

  saveButton: {
    width: "100%",
    minHeight: "54px",
    border: "none",
    borderRadius: "14px",
    background: "#1A0B05",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontSize: "14px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow:
      "0 10px 25px rgba(26, 11, 5, 0.15)",
  },

  sectionHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontFamily:
      "'Playfair Display', Georgia, serif",
    fontSize: "23px",
    color: "#1A0B05",
  },

  recentSection: {
    marginBottom: "36px",
  },

  recentList: {
    display: "grid",
    gap: "9px",
  },

  recentCard: {
    width: "100%",
    border: "1px solid #EDE5DC",
    borderRadius: "15px",
    background: "#FFFFFF",
    padding: "12px 13px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    textAlign: "left",
    cursor: "pointer",
    color: "#1A0B05",
  },

  recentIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    background: "#FBF4EC",
    color: "#C4956A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  recentContent: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
    flex: 1,
  },

  savedSection: {
    marginTop: "4px",
  },

  countBadge: {
    minWidth: "28px",
    height: "28px",
    padding: "0 8px",
    borderRadius: "999px",
    background: "#F4E9DE",
    color: "#8A5B3B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "800",
  },

  loadingBox: {
    minHeight: "180px",
    borderRadius: "20px",
    background: "#FFFFFF",
    border: "1px solid #EDE5DC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "#81776E",
    fontSize: "13px",
  },

  emptyBox: {
    textAlign: "center",
    background: "#FFFFFF",
    border: "1px solid #EDE5DC",
    borderRadius: "22px",
    padding: "48px 24px",
  },

  emptyIcon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 17px",
    borderRadius: "18px",
    background: "#FBF0E6",
    color: "#C4956A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    margin: "0 0 8px",
    fontFamily:
      "'Playfair Display', Georgia, serif",
    fontSize: "23px",
  },

  emptyText: {
    maxWidth: "340px",
    margin: "0 auto 20px",
    color: "#8A817A",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  emptyButton: {
    border: "1px solid #C4956A",
    borderRadius: "11px",
    background: "#1A0B05",
    color: "#FFFFFF",
    padding: "11px 17px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  list: {
    display: "grid",
    gap: "14px",
  },

  card: {
    background: "#FFFFFF",
    border: "1px solid #EDE5DC",
    borderRadius: "20px",
    padding: "20px",
    boxShadow:
      "0 8px 25px rgba(26, 11, 5, 0.045)",
  },

  defaultCard: {
    borderColor: "#DCC4AE",
    boxShadow:
      "0 10px 30px rgba(196, 149, 106, 0.10)",
  },

  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "18px",
  },

  typeContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  addressTypeIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: "#FBF4EC",
    color: "#C4956A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  typeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },

  typeText: {
    color: "#1A0B05",
    fontSize: "14px",
    fontWeight: "800",
  },

  defaultBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "999px",
    padding: "4px 8px",
    background: "#C4956A",
    color: "#FFFFFF",
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "0.03em",
  },

  actions: {
    display: "flex",
    gap: "7px",
  },

  iconButton: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: "1px solid #EDE5DC",
    background: "#FAF7F3",
    color: "#3B2B23",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  addressInfo: {
    paddingLeft: "50px",
  },

  name: {
    margin: "0 0 4px",
    fontSize: "17px",
    fontWeight: "800",
    color: "#1A0B05",
  },

  phone: {
    margin: "0 0 12px",
    color: "#8A817A",
    fontSize: "12px",
  },

  address: {
    margin: "4px 0",
    color: "#5D554F",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  defaultButton: {
    width: "calc(100% - 50px)",
    marginLeft: "50px",
    marginTop: "17px",
    minHeight: "42px",
    border: "1px solid #DCC4AE",
    borderRadius: "11px",
    background: "#FFFDFB",
    color: "#8A5B3B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  },

  defaultFooter: {
    width: "calc(100% - 50px)",
    marginLeft: "50px",
    marginTop: "17px",
    paddingTop: "13px",
    borderTop: "1px solid #F0EBE5",
    color: "#789070",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },

  toast: {
    position: "fixed",
    zIndex: 1000,
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(420px, calc(100vw - 30px))",
    boxSizing: "border-box",
    minHeight: "48px",
    borderRadius: "13px",
    padding: "11px 12px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    boxShadow:
      "0 14px 40px rgba(26, 11, 5, 0.18)",
    fontSize: "13px",
    fontWeight: "700",
  },

  toastSuccess: {
    background: "#1A0B05",
    color: "#FFFFFF",
  },

  toastError: {
    background: "#A34B43",
    color: "#FFFFFF",
  },

  toastClose: {
    marginLeft: "auto",
    width: "27px",
    height: "27px",
    border: "none",
    background: "rgba(255,255,255,0.12)",
    color: "inherit",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    background: "rgba(20, 10, 5, 0.55)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "min(400px, 100%)",
    background: "#FFFFFF",
    borderRadius: "22px",
    padding: "27px",
    boxShadow:
      "0 25px 70px rgba(0,0,0,0.25)",
  },

  modalIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    background: "#FFF0EE",
    color: "#A34B43",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "17px",
  },

  modalTitle: {
    margin: "0 0 8px",
    fontFamily:
      "'Playfair Display', Georgia, serif",
    fontSize: "23px",
    color: "#1A0B05",
  },

  modalText: {
    margin: "0 0 23px",
    color: "#81776E",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  modalActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "9px",
  },

  cancelButton: {
    minHeight: "45px",
    border: "1px solid #E5DDD5",
    borderRadius: "11px",
    background: "#FAF7F3",
    color: "#4E443D",
    fontWeight: "700",
    cursor: "pointer",
  },

  deleteButton: {
    minHeight: "45px",
    border: "none",
    borderRadius: "11px",
    background: "#A34B43",
    color: "#FFFFFF",
    fontWeight: "800",
    cursor: "pointer",
  },

  spin: {
    animation: "addressPageSpin 1s linear infinite",
  },
};
