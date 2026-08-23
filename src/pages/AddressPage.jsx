import { useEffect, useMemo, useRef, useState } from "react";
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
  writeBatch,
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
  MapPinned,
  Clock3,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

const GOOGLE_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

const DEFAULT_MAP_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
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
  formattedAddress: "",
  placeId: "",
};

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  /* -------------------------------------------------------------------------- */
  /*                                   STATE                                    */
  /* -------------------------------------------------------------------------- */

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

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const [mapReady, setMapReady] = useState(false);

  const [toast, setToast] = useState(null);

  /* -------------------------------------------------------------------------- */
  /*                                   REFS                                     */
  /* -------------------------------------------------------------------------- */

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const autocompleteDebounceRef = useRef(null);
  const deliveryDebounceRef = useRef(null);

  /* -------------------------------------------------------------------------- */
  /*                                  HELPERS                                   */
  /* -------------------------------------------------------------------------- */

  const addressesCollection = useMemo(() => {
    if (!currentUser) return null;

    return collection(db, "users", currentUser.uid, "addresses");
  }, [currentUser]);

  function showToast(message, type = "success") {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  function getTimestampValue(timestamp) {
    if (!timestamp) return 0;

    if (typeof timestamp?.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }

    if (typeof timestamp === "number") {
      return timestamp;
    }

    return 0;
  }

  function sortAddresses(data) {
    return [...data].sort((a, b) => {
      if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
        return Number(b.isDefault) - Number(a.isDefault);
      }

      const recentA = Math.max(
        getTimestampValue(a.lastUsedAt),
        getTimestampValue(a.updatedAt),
        getTimestampValue(a.createdAt)
      );

      const recentB = Math.max(
        getTimestampValue(b.lastUsedAt),
        getTimestampValue(b.updatedAt),
        getTimestampValue(b.createdAt)
      );

      return recentB - recentA;
    });
  }

  function getAddressIcon(type) {
    if (type === "Work") return <Briefcase size={18} />;
    if (type === "Other") return <MapPin size={18} />;
    return <Home size={18} />;
  }

  function resetForm() {
    setCleanedForm({
      ...emptyForm,
      name: cleanedForm.name,
      phone: cleanedForm.phone,
    });

    setSearchText("");
    setSuggestions([]);
    setEditingId(null);
    setDeliveryAvailable(null);
    setDeliveryInfo(null);
    setLocationError("");

    clearMapMarker();
  }

  /* -------------------------------------------------------------------------- */
  /*                              LOAD ADDRESSES                                */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!currentUser) return;

    loadAddresses();
  }, [currentUser]);

  async function loadAddresses() {
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

      setAddresses(sortAddresses(data));
    } catch (error) {
      console.error("Failed to load addresses:", error);
      showToast("Unable to load your addresses.", "error");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              LOAD USER DETAILS                             */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!currentUser) return;

    async function loadUserDetails() {
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

  /* -------------------------------------------------------------------------- */
  /*                             LOAD GOOGLE MAPS                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      console.error(
        "Missing VITE_GOOGLE_MAPS_API_KEY environment variable."
      );
      setLocationError("Google Maps is not configured.");
      return;
    }

    let cancelled = false;

    loadGoogleMaps(GOOGLE_API_KEY)
      .then((google) => {
        if (cancelled || !google?.maps?.places) return;

        setGoogleReady(true);

        const autocomplete =
          new google.maps.places.AutocompleteService();

        setAutocompleteService(autocomplete);
      })
      .catch((error) => {
        console.error("Google Maps failed to load:", error);
        setLocationError("Google Maps could not be loaded.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                              INITIALIZE MAP                                */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!googleReady || !mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: 5,
      minZoom: 4,
      maxZoom: 20,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    mapRef.current = map;

    const service = new window.google.maps.places.PlacesService(map);

    setPlacesService(service);
    setMapReady(true);

    map.addListener("click", (event) => {
      if (!event.latLng) return;

      const latitude = event.latLng.lat();
      const longitude = event.latLng.lng();

      updateMapLocation(latitude, longitude, true);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      mapRef.current = null;
      setMapReady(false);
    };
  }, [googleReady, showForm]);

  /* -------------------------------------------------------------------------- */
  /*                              MAP FUNCTIONS                                 */
  /* -------------------------------------------------------------------------- */

  function clearMapMarker() {
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }

  function setMapMarker(latitude, longitude, shouldPan = true) {
    if (!mapRef.current || !window.google?.maps) return;

    const position = {
      lat: Number(latitude),
      lng: Number(longitude),
    };

    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position,
        draggable: true,
        title: "Delivery location",
        animation: window.google.maps.Animation.DROP,
      });

      markerRef.current.addListener("dragend", (event) => {
        if (!event.latLng) return;

        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        updateMapLocation(lat, lng, true);
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }

    if (shouldPan) {
      mapRef.current.panTo(position);

      const currentZoom = mapRef.current.getZoom();

      if (!currentZoom || currentZoom < 16) {
        mapRef.current.setZoom(16);
      }
    }
  }

  async function updateMapLocation(latitude, longitude, reverseGeocode = true) {
    setCleanedForm((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));

    setMapMarker(latitude, longitude);

    if (!reverseGeocode) return;

    await reverseGeocodeLocation(latitude, longitude);
  }

  async function reverseGeocodeLocation(latitude, longitude) {
    if (!GOOGLE_API_KEY) return;

    try {
      setLocationLoading(true);
      setLocationError("");

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
      );

      const data = await response.json();

      if (data.status !== "OK" || !data.results?.length) {
        throw new Error("No address found for this location.");
      }

      const result = data.results[0];

      const parsed = parseAddressComponents(result.address_components);

      setCleanedForm((prev) => ({
        ...prev,
        ...parsed,
        latitude,
        longitude,
        formattedAddress: result.formatted_address || "",
        placeId: result.place_id || "",
      }));

      setSearchText(result.formatted_address || "");

      if (/^\d{6}$/.test(parsed.pincode)) {
        checkDelivery(parsed.pincode);
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      setLocationError(
        "We couldn't identify the address at this location. You can enter it manually."
      );
    } finally {
      setLocationLoading(false);
    }
  }

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

      if (types.includes("premise") && !house) {
        house = component.long_name;
      }

      if (types.includes("route")) {
        street = component.long_name;
      }

      if (types.includes("sublocality_level_1") && !street) {
        street = component.long_name;
      }

      if (types.includes("sublocality") && !street) {
        street = component.long_name;
      }

      if (types.includes("locality")) {
        city = component.long_name;
      }

      if (types.includes("administrative_area_level_2") && !city) {
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

  /* -------------------------------------------------------------------------- */
  /*                           CURRENT LOCATION                                 */
  /* -------------------------------------------------------------------------- */

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

        try {
          await updateMapLocation(latitude, longitude, true);

          showToast("Current location detected.");
        } catch (error) {
          console.error(error);
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);

        let message = "Couldn't get your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission was denied. Please allow location access or enter the address manually.";
            break;

          case error.POSITION_UNAVAILABLE:
            message = "Your current location is unavailable.";
            break;

          case error.TIMEOUT:
            message = "Location request timed out. Please try again.";
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
  }

  /* -------------------------------------------------------------------------- */
  /*                            PLACE SEARCH                                    */
  /* -------------------------------------------------------------------------- */

  function searchPlaces(text) {
    setSearchText(text);

    if (autocompleteDebounceRef.current) {
      clearTimeout(autocompleteDebounceRef.current);
    }

    if (!autocompleteService || text.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    autocompleteDebounceRef.current = setTimeout(() => {
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
    }, 300);
  }

  function selectSuggestion(place) {
    if (!placesService || !place?.place_id) return;

    setSuggestions([]);
    setSearchText(place.description || "");
    setLocationLoading(true);

    placesService.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "place_id",
          "formatted_address",
          "geometry",
          "address_components",
        ],
      },
      (result, status) => {
        if (
          status !==
            window.google.maps.places.PlacesServiceStatus.OK ||
          !result
        ) {
          setLocationLoading(false);
          showToast("Unable to load this location.", "error");
          return;
        }

        const location = result.geometry?.location;

        if (!location) {
          setLocationLoading(false);
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
          formattedAddress: result.formatted_address || "",
          placeId: result.place_id || "",
        }));

        setMapMarker(latitude, longitude);

        if (/^\d{6}$/.test(parsed.pincode)) {
          checkDelivery(parsed.pincode);
        }

        setLocationLoading(false);
      }
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                             DELIVERY CHECK                                 */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    const pincode = cleanedForm.pincode;

    if (deliveryDebounceRef.current) {
      clearTimeout(deliveryDebounceRef.current);
    }

    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      setCheckingDelivery(false);
      return;
    }

    deliveryDebounceRef.current = setTimeout(() => {
      checkDelivery(pincode);
    }, 350);

    return () => {
      if (deliveryDebounceRef.current) {
        clearTimeout(deliveryDebounceRef.current);
      }
    };
  }, [cleanedForm.pincode]);

  async function checkDelivery(pincode) {
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      return false;
    }

    setCheckingDelivery(true);

    try {
      const result = await checkDeliveryService(pincode);

      if (result?.available) {
        setDeliveryAvailable(true);
        setDeliveryInfo(result.info || null);
        return true;
      }

      setDeliveryAvailable(false);
      setDeliveryInfo(null);

      return false;
    } catch (error) {
      console.error("Delivery check failed:", error);

      setDeliveryAvailable(null);
      setDeliveryInfo(null);

      return false;
    } finally {
      setCheckingDelivery(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              FORM HANDLING                                 */
  /* -------------------------------------------------------------------------- */

  function handleChange(event) {
    let { name, value } = event.target;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }

    setCleanedForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* -------------------------------------------------------------------------- */
  /*                             OPEN NEW FORM                                  */
  /* -------------------------------------------------------------------------- */

  function openNewAddressForm() {
    setEditingId(null);

    setCleanedForm({
      ...emptyForm,
      name: cleanedForm.name || "",
      phone: cleanedForm.phone || "",
    });

    setSearchText("");
    setSuggestions([]);
    setDeliveryAvailable(null);
    setDeliveryInfo(null);
    setLocationError("");

    setShowForm(true);

    window.setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setCenter(DEFAULT_MAP_CENTER);
        mapRef.current.setZoom(5);
      }
    }, 100);
  }

  /* -------------------------------------------------------------------------- */
  /*                              EDIT ADDRESS                                  */
  /* -------------------------------------------------------------------------- */

  function editAddress(address) {
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
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      formattedAddress: address.formattedAddress || "",
      placeId: address.placeId || "",
    });

    setSearchText(address.formattedAddress || "");

    setEditingId(address.id);
    setShowForm(true);

    setDeliveryAvailable(null);
    setDeliveryInfo(null);

    window.setTimeout(() => {
      if (
        Number.isFinite(Number(address.latitude)) &&
        Number.isFinite(Number(address.longitude))
      ) {
        setMapMarker(
          Number(address.latitude),
          Number(address.longitude)
        );
      }
    }, 150);

    if (/^\d{6}$/.test(address.pincode)) {
      checkDelivery(address.pincode);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              SAVE ADDRESS                                  */
  /* -------------------------------------------------------------------------- */

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
      showToast("Please enter your full name.", "error");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      showToast("Phone number must contain exactly 10 digits.", "error");
      return;
    }

    if (!house) {
      showToast("Please enter your house or flat number.", "error");
      return;
    }

    if (!street) {
      showToast("Please enter your street or area.", "error");
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
      showToast("Pincode must contain exactly 6 digits.", "error");
      return;
    }

    if (deliveryAvailable === false) {
      showToast(
        "This address is outside our current delivery area.",
        "error"
      );
      return;
    }

    if (checkingDelivery) {
      showToast("Please wait while we verify delivery availability.", "error");
      return;
    }

    if (deliveryAvailable !== true) {
      const available = await checkDelivery(pincode);

      if (!available) {
        showToast(
          "We couldn't confirm delivery availability for this address.",
          "error"
        );
        return;
      }
    }

    const normalizedHouse = house.toLowerCase();
    const normalizedStreet = street.toLowerCase();
    const normalizedCity = city.toLowerCase();

    const duplicate = addresses.some(
      (item) =>
        item.id !== editingId &&
        (item.house || "").trim().toLowerCase() === normalizedHouse &&
        (item.street || "").trim().toLowerCase() === normalizedStreet &&
        (item.city || "").trim().toLowerCase() === normalizedCity &&
        (item.pincode || "") === pincode
    );

    if (duplicate) {
      showToast("This address is already saved.", "error");
      return;
    }

    setSaving(true);

    try {
      const shouldBeDefault =
        Boolean(cleanedForm.isDefault) || addresses.length === 0;

      const addressData = {
        name,
        phone,
        house,
        street,
        city,
        state,
        pincode,
        type: cleanedForm.type || "Home",
        isDefault: shouldBeDefault,
        latitude:
          cleanedForm.latitude !== null
            ? Number(cleanedForm.latitude)
            : null,
        longitude:
          cleanedForm.longitude !== null
            ? Number(cleanedForm.longitude)
            : null,
        formattedAddress: cleanedForm.formattedAddress || "",
        placeId: cleanedForm.placeId || "",
        updatedAt: serverTimestamp(),
      };

      /* ------------------------------- EDIT -------------------------------- */

      if (editingId) {
        const addressRef = doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          editingId
        );

        const batch = writeBatch(db);

        if (shouldBeDefault) {
          addresses.forEach((item) => {
            if (item.id !== editingId && item.isDefault) {
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
                  updatedAt: serverTimestamp(),
                }
              );
            }
          });
        }

        batch.update(addressRef, addressData);

        await batch.commit();

        setAddresses((prev) =>
          sortAddresses(
            prev.map((item) =>
              item.id === editingId
                ? {
                    ...item,
                    ...addressData,
                    isDefault: shouldBeDefault,
                  }
                : shouldBeDefault
                ? { ...item, isDefault: false }
                : item
            )
          )
        );

        showToast("Address updated successfully.");
      }

      /* ------------------------------- CREATE ------------------------------- */

      else {
        const batch = writeBatch(db);

        if (shouldBeDefault) {
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
                  updatedAt: serverTimestamp(),
                }
              );
            }
          });
        }

        const newAddressRef = doc(
          collection(db, "users", currentUser.uid, "addresses")
        );

        batch.set(newAddressRef, {
          ...addressData,
          createdAt: serverTimestamp(),
          lastUsedAt: serverTimestamp(),
        });

        await batch.commit();

        setAddresses((prev) =>
          sortAddresses([
            ...prev.map((item) =>
              shouldBeDefault
                ? { ...item, isDefault: false }
                : item
            ),
            {
              id: newAddressRef.id,
              ...addressData,
              isDefault: shouldBeDefault,
            },
          ])
        );

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

  /* -------------------------------------------------------------------------- */
  /*                             DELETE ADDRESS                                */
  /* -------------------------------------------------------------------------- */

  async function removeAddress(id) {
    if (!currentUser) return;

    const address = addresses.find((item) => item.id === id);

    if (!address) return;

    const confirmed = window.confirm(
      address.isDefault
        ? "This is your default address. Delete it anyway?"
        : "Delete this saved address?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "users", currentUser.uid, "addresses", id)
      );

      let remaining = addresses.filter((item) => item.id !== id);

      if (address.isDefault && remaining.length > 0) {
        const nextDefault = remaining[0];

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            nextDefault.id
          ),
          {
            isDefault: true,
            updatedAt: serverTimestamp(),
          }
        );

        remaining = remaining.map((item) => ({
          ...item,
          isDefault: item.id === nextDefault.id,
        }));
      }

      setAddresses(sortAddresses(remaining));

      showToast("Address deleted.");
    } catch (error) {
      console.error("Failed to delete address:", error);
      showToast(
        "Unable to delete this address. Please try again.",
        "error"
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             DEFAULT ADDRESS                                */
  /* -------------------------------------------------------------------------- */

  async function setDefaultAddress(id) {
    if (!currentUser) return;

    const target = addresses.find((item) => item.id === id);

    if (!target || target.isDefault) return;

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
            updatedAt: serverTimestamp(),
          }
        );
      });

      await batch.commit();

      setAddresses(
        sortAddresses(
          addresses.map((item) => ({
            ...item,
            isDefault: item.id === id,
          }))
        )
      );

      showToast("Default address updated.");
    } catch (error) {
      console.error("Failed to set default address:", error);
      showToast(
        "Unable to update the default address.",
        "error"
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             USE ADDRESS                                   */
  /* -------------------------------------------------------------------------- */

  async function useAddress(address) {
    if (!currentUser) return;

    try {
      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          address.id
        ),
        {
          lastUsedAt: serverTimestamp(),
        }
      );

      setAddresses((prev) =>
        sortAddresses(
          prev.map((item) =>
            item.id === address.id
              ? { ...item, lastUsedAt: Date.now() }
              : item
          )
        )
      );

      showToast("Address selected.");
    } catch (error) {
      console.error("Failed to mark address as recent:", error);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                CLEANUP                                    */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current);
      }

      if (deliveryDebounceRef.current) {
        clearTimeout(deliveryDebounceRef.current);
      }
    };
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                                  RENDER                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="address-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .address-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(196, 149, 106, 0.10),
              transparent 30%
            ),
            #FDFAF5;
          color: #1A0B05;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding: 28px;
        }

        .address-shell {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }

        .address-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 30px;
        }

        .address-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .back-button {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border: 1px solid rgba(26, 11, 5, 0.08);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          color: #1A0B05;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 6px 18px rgba(26, 11, 5, 0.06);
        }

        .back-button:hover {
          transform: translateX(-2px);
          background: #fff;
          box-shadow: 0 8px 22px rgba(26, 11, 5, 0.10);
        }

        .page-eyebrow {
          margin: 0 0 5px;
          color: #C4956A;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .page-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.05;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          margin: 7px 0 0;
          color: #77716C;
          font-size: 14px;
        }

        .add-address-button {
          border: none;
          border-radius: 14px;
          background: #1A0B05;
          color: #fff;
          padding: 13px 18px;
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(26, 11, 5, 0.14);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .add-address-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 13px 28px rgba(26, 11, 5, 0.20);
        }

        .address-form-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #EEE7DE;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 28px;
          box-shadow: 0 18px 50px rgba(26, 11, 5, 0.08);
          animation: addressFadeIn 0.25s ease;
        }

        @keyframes addressFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .form-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
        }

        .form-description {
          margin: 5px 0 0;
          color: #817A74;
          font-size: 13px;
        }

        .close-form-button {
          width: 36px;
          height: 36px;
          border: 1px solid #EEE7DE;
          border-radius: 50%;
          background: #FAF7F2;
          color: #5F5852;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .location-button {
          width: 100%;
          border: 1px solid rgba(196, 149, 106, 0.35);
          border-radius: 14px;
          background: #FFF8F0;
          color: #7B5030;
          min-height: 48px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 14px;
        }

        .location-button:hover {
          background: #FFF2E3;
          border-color: rgba(196, 149, 106, 0.55);
        }

        .location-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .search-wrapper {
          position: relative;
          margin-bottom: 14px;
        }

        .search-input-wrap {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9B9188;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 48px;
          border: 1px solid #E4DDD4;
          border-radius: 13px;
          padding: 0 44px;
          background: #fff;
          color: #1A0B05;
          outline: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #C4956A;
          box-shadow: 0 0 0 4px rgba(196, 149, 106, 0.10);
        }

        .search-loading {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #C4956A;
        }

        .suggestions {
          position: absolute;
          z-index: 30;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          overflow: hidden;
          border: 1px solid #E7E0D7;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 16px 35px rgba(26, 11, 5, 0.14);
        }

        .suggestion {
          width: 100%;
          border: none;
          border-bottom: 1px solid #F1ECE6;
          background: #fff;
          padding: 13px 15px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          color: #3E3833;
          font-size: 13px;
          line-height: 1.45;
        }

        .suggestion:last-child {
          border-bottom: none;
        }

        .suggestion:hover {
          background: #FCF8F3;
        }

        .suggestion-icon {
          color: #C4956A;
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .map-section {
          border: 1px solid #E8E0D7;
          border-radius: 18px;
          overflow: hidden;
          background: #F5F1EC;
          margin-bottom: 20px;
        }

        .map-header {
          min-height: 52px;
          padding: 12px 15px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #EEE7DE;
        }

        .map-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 750;
          color: #1A0B05;
        }

        .map-header-hint {
          color: #8B827A;
          font-size: 11px;
          text-align: right;
        }

        .map-container {
          width: 100%;
          height: 310px;
          background: #EEE9E2;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field-group {
          min-width: 0;
        }

        .field-group.full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: block;
          margin: 0 0 7px;
          color: #4C4540;
          font-size: 12px;
          font-weight: 700;
        }

        .required {
          color: #B45F43;
        }

        .input {
          width: 100%;
          height: 48px;
          border: 1px solid #E4DDD4;
          border-radius: 12px;
          padding: 0 14px;
          background: #fff;
          color: #1A0B05;
          outline: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .input:focus {
          border-color: #C4956A;
          box-shadow: 0 0 0 4px rgba(196, 149, 106, 0.10);
        }

        .select-input {
          appearance: none;
          background:
            linear-gradient(45deg, transparent 50%, #8D8278 50%) calc(100% - 18px) 21px / 5px 5px no-repeat,
            linear-gradient(135deg, #8D8278 50%, transparent 50%) calc(100% - 13px) 21px / 5px 5px no-repeat,
            #fff;
          padding-right: 36px;
        }

        .delivery-status {
          margin-top: 15px;
          border-radius: 13px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 650;
        }

        .delivery-success {
          background: #F0F8F1;
          color: #397246;
          border: 1px solid #D8EBD9;
        }

        .delivery-error {
          background: #FFF3F0;
          color: #9B4D3C;
          border: 1px solid #F0D9D3;
        }

        .delivery-info {
          margin-top: 4px;
          color: #6F6861;
          font-size: 11px;
          font-weight: 500;
        }

        .location-error {
          margin: 10px 0 14px;
          padding: 11px 13px;
          border-radius: 12px;
          background: #FFF3F0;
          color: #9B4D3C;
          border: 1px solid #F0D9D3;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          line-height: 1.45;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .secondary-button,
        .primary-button {
          min-height: 46px;
          padding: 0 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-button {
          border: 1px solid #E4DDD4;
          background: #fff;
          color: #4E4741;
        }

        .secondary-button:hover {
          background: #FAF7F2;
        }

        .primary-button {
          border: none;
          background: #1A0B05;
          color: #fff;
          box-shadow: 0 9px 20px rgba(26, 11, 5, 0.14);
        }

        .primary-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(26, 11, 5, 0.20);
        }

        .primary-button:disabled,
        .secondary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .button-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .addresses-section {
          margin-top: 8px;
        }

        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 24px;
        }

        .section-count {
          color: #8A8179;
          font-size: 12px;
          font-weight: 650;
        }

        .address-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .address-card {
          position: relative;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #EDE5DC;
          border-radius: 20px;
          padding: 19px;
          box-shadow: 0 10px 28px rgba(26, 11, 5, 0.055);
          transition: all 0.22s ease;
        }

        .address-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(26, 11, 5, 0.09);
        }

        .address-card.default-card {
          border-color: rgba(196, 149, 106, 0.45);
          box-shadow: 0 12px 30px rgba(196, 149, 106, 0.10);
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .address-type {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #6E4A30;
          font-size: 13px;
          font-weight: 800;
        }

        .type-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #FFF4E8;
          color: #C4956A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 6px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
        }

        .default-badge {
          background: #C4956A;
          color: #fff;
        }

        .recent-badge {
          background: #F2EEE9;
          color: #71685F;
        }

        .card-actions {
          display: flex;
          gap: 7px;
        }

        .icon-button {
          width: 34px;
          height: 34px;
          border: 1px solid #EEE7DE;
          border-radius: 10px;
          background: #FBF8F4;
          color: #514941;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .icon-button:hover {
          background: #F3EDE6;
          color: #1A0B05;
        }

        .icon-button.danger:hover {
          background: #FFF1EE;
          color: #A64D3B;
          border-color: #F0D5CE;
        }

        .address-name {
          margin: 0;
          color: #1A0B05;
          font-size: 17px;
          font-weight: 800;
        }

        .address-phone {
          margin: 5px 0 12px;
          color: #817A73;
          font-size: 12px;
        }

        .address-lines {
          color: #4D4640;
          font-size: 13px;
          line-height: 1.65;
        }

        .address-formatted {
          margin-top: 7px;
          color: #8A8179;
          font-size: 11px;
          line-height: 1.5;
        }

        .card-bottom {
          display: flex;
          gap: 8px;
          margin-top: 17px;
        }

        .default-button,
        .use-address-button {
          flex: 1;
          min-height: 39px;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .default-button {
          border: 1px solid #E1D7CC;
          background: #FBF8F4;
          color: #6D635A;
        }

        .default-button:hover:not(:disabled) {
          background: #F4EDE5;
          border-color: #C4956A;
          color: #704A2D;
        }

        .default-button:disabled {
          cursor: default;
        }

        .use-address-button {
          border: none;
          background: #1A0B05;
          color: #fff;
        }

        .use-address-button:hover {
          background: #2C160D;
        }

        .loading-state,
        .empty-state {
          border: 1px solid #EDE5DC;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.92);
          text-align: center;
          padding: 55px 20px;
        }

        .loading-state {
          color: #7E766E;
          font-size: 13px;
        }

        .empty-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 17px;
          border-radius: 18px;
          background: #FFF3E6;
          color: #C4956A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 23px;
        }

        .empty-description {
          max-width: 360px;
          margin: 9px auto 19px;
          color: #817A73;
          font-size: 13px;
          line-height: 1.6;
        }

        .empty-add-button {
          min-height: 42px;
          border: none;
          border-radius: 11px;
          padding: 0 17px;
          background: #1A0B05;
          color: #fff;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .toast {
          position: fixed;
          z-index: 100;
          right: 22px;
          bottom: 22px;
          max-width: min(390px, calc(100vw - 44px));
          border-radius: 14px;
          padding: 13px 15px;
          display: flex;
          align-items: center;
          gap: 9px;
          background: #1A0B05;
          color: #fff;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.20);
          font-size: 13px;
          font-weight: 650;
          animation: toastIn 0.22s ease;
        }

        .toast.error {
          background: #8E3F31;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .spinner {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 820px) {
          .address-page {
            padding: 20px 16px;
          }

          .address-header {
            align-items: flex-start;
          }

          .address-header .add-address-button {
            display: none;
          }

          .address-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .address-page {
            padding: 16px 13px 28px;
          }

          .address-header {
            margin-bottom: 22px;
          }

          .page-title {
            font-size: 29px;
          }

          .page-subtitle {
            font-size: 12px;
          }

          .address-form-card {
            padding: 17px;
            border-radius: 19px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .field-group.full {
            grid-column: auto;
          }

          .map-container {
            height: 255px;
          }

          .map-header-hint {
            display: none;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .secondary-button,
          .primary-button {
            width: 100%;
          }

          .card-bottom {
            flex-direction: column;
          }

          .default-button,
          .use-address-button {
            width: 100%;
          }

          .toast {
            right: 13px;
            bottom: 13px;
            max-width: calc(100vw - 26px);
          }
        }
      `}</style>

      <div className="address-shell">
        {/* ------------------------------------------------------------------ */}
        {/* HEADER                                                             */}
        {/* ------------------------------------------------------------------ */}

        <header className="address-header">
          <div className="address-header-left">
            <button
              type="button"
              className="back-button"
              onClick={() => setPage("menu")}
              aria-label="Back to menu"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="page-eyebrow">Delivery</p>

              <h1 className="page-title">My Addresses</h1>

              <p className="page-subtitle">
                Save your favourite delivery locations.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="add-address-button"
            onClick={openNewAddressForm}
          >
            <Plus size={17} />
            Add Address
          </button>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* MOBILE / MAIN ADD BUTTON                                           */}
        {/* ------------------------------------------------------------------ */}

        {!showForm && (
          <button
            type="button"
            className="add-address-button mobile-add-button"
            onClick={openNewAddressForm}
            style={{
              width: "100%",
              marginBottom: "22px",
            }}
          >
            <Plus size={17} />
            Add New Address
          </button>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ADDRESS FORM                                                       */}
        {/* ------------------------------------------------------------------ */}

        {showForm && (
          <section className="address-form-card">
            <div className="form-header">
              <div>
                <h2 className="form-title">
                  {editingId ? "Edit Address" : "Add New Address"}
                </h2>

                <p className="form-description">
                  Choose a location on the map or enter your address manually.
                </p>
              </div>

              <button
                type="button"
                className="close-form-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                aria-label="Close address form"
              >
                <X size={17} />
              </button>
            </div>

            {/* CURRENT LOCATION */}

            <button
              type="button"
              className="location-button"
              onClick={useCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <Loader2 size={17} className="spinner" />
              ) : (
                <Navigation size={17} />
              )}

              {locationLoading
                ? "Finding your location..."
                : "Use Current Location"}
            </button>

            {locationError && (
              <div className="location-error">
                <AlertCircle size={16} />
                <span>{locationError}</span>
              </div>
            )}

            {/* GOOGLE SEARCH */}

            <div className="search-wrapper">
              <div className="search-input-wrap">
                <Search size={17} className="search-icon" />

                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for your address..."
                  value={searchText}
                  onChange={(event) =>
                    searchPlaces(event.target.value)
                  }
                  autoComplete="off"
                />

                {loadingSuggestions && (
                  <Loader2
                    size={16}
                    className="search-loading spinner"
                  />
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((place) => (
                    <button
                      type="button"
                      key={place.place_id}
                      className="suggestion"
                      onClick={() => selectSuggestion(place)}
                    >
                      <MapPin
                        size={16}
                        className="suggestion-icon"
                      />

                      <span>{place.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* INTERACTIVE MAP */}

            <div className="map-section">
              <div className="map-header">
                <div className="map-header-title">
                  <MapPinned size={16} color="#C4956A" />
                  Pin your delivery location
                </div>

                <span className="map-header-hint">
                  Click or drag the pin to adjust
                </span>
              </div>

              <div
                ref={mapContainerRef}
                className="map-container"
              />
            </div>

            {/* ADDRESS DETAILS */}

            <div className="form-grid">
              <div className="field-group">
                <label className="field-label">
                  Full Name <span className="required">*</span>
                </label>

                <input
                  name="name"
                  className="input"
                  placeholder="Enter recipient name"
                  value={cleanedForm.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Phone Number <span className="required">*</span>
                </label>

                <input
                  name="phone"
                  className="input"
                  placeholder="10-digit phone number"
                  value={cleanedForm.phone}
                  onChange={handleChange}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  House / Flat No. <span className="required">*</span>
                </label>

                <input
                  name="house"
                  className="input"
                  placeholder="Flat, house or building"
                  value={cleanedForm.house}
                  onChange={handleChange}
                  autoComplete="address-line1"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Street / Area <span className="required">*</span>
                </label>

                <input
                  name="street"
                  className="input"
                  placeholder="Street, locality or area"
                  value={cleanedForm.street}
                  onChange={handleChange}
                  autoComplete="address-line2"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  City <span className="required">*</span>
                </label>

                <input
                  name="city"
                  className="input"
                  placeholder="City"
                  value={cleanedForm.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  State <span className="required">*</span>
                </label>

                <input
                  name="state"
                  className="input"
                  placeholder="State"
                  value={cleanedForm.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Pincode <span className="required">*</span>
                </label>

                <input
                  name="pincode"
                  className="input"
                  placeholder="6-digit pincode"
                  value={cleanedForm.pincode}
                  onChange={handleChange}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Address Type
                </label>

                <select
                  name="type"
                  className="input select-input"
                  value={cleanedForm.type}
                  onChange={handleChange}
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* DELIVERY STATUS */}

            {checkingDelivery && (
              <div className="delivery-status">
                <Loader2 size={16} className="spinner" />
                Checking delivery availability...
              </div>
            )}

            {!checkingDelivery && deliveryAvailable === true && (
              <div className="delivery-status delivery-success">
                <Check size={16} />

                <div>
                  <div>Delivery available</div>

                  {deliveryInfo && (
                    <div className="delivery-info">
                      {typeof deliveryInfo === "string"
                        ? deliveryInfo
                        : deliveryInfo.message ||
                          deliveryInfo.estimatedTime ||
                          "This address is within our delivery area."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!checkingDelivery && deliveryAvailable === false && (
              <div className="delivery-status delivery-error">
                <AlertCircle size={16} />

                <span>
                  Sorry, we don't currently deliver to this pincode.
                </span>
              </div>
            )}

            {/* FORM ACTIONS */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveAddress}
                disabled={saving || checkingDelivery}
              >
                <span className="button-content">
                  {saving && (
                    <Loader2 size={16} className="spinner" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Address"
                    : "Save Address"}
                </span>
              </button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SAVED ADDRESSES                                                    */}
        {/* ------------------------------------------------------------------ */}

        <section className="addresses-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Saved Addresses</h2>

              {!loading && addresses.length > 0 && (
                <span className="section-count">
                  {addresses.length}{" "}
                  {addresses.length === 1 ? "address" : "addresses"}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              Loading your saved addresses...
            </div>
          ) : addresses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MapPin size={29} />
              </div>

              <h3 className="empty-title">
                No saved addresses
              </h3>

              <p className="empty-description">
                Save your home, work, or favourite delivery location
                for a faster checkout experience.
              </p>

              <button
                type="button"
                className="empty-add-button"
                onClick={openNewAddressForm}
              >
                Add Your First Address
              </button>
            </div>
          ) : (
            <div className="address-list">
              {addresses.map((address, index) => {
                const recent =
                  index === 0 &&
                  !address.isDefault &&
                  addresses.length > 1;

                return (
                  <article
                    key={address.id}
                    className={`address-card ${
                      address.isDefault ? "default-card" : ""
                    }`}
                  >
                    <div className="card-top">
                      <div className="address-type">
                        <span className="type-icon">
                          {getAddressIcon(address.type)}
                        </span>

                        {address.type || "Home"}
                      </div>

                      <div className="badges">
                        {address.isDefault && (
                          <span className="badge default-badge">
                            <Star
                              size={11}
                              fill="currentColor"
                            />
                            Default
                          </span>
                        )}

                        {recent && (
                          <span className="badge recent-badge">
                            <Clock3 size={11} />
                            Recent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-top">
                      <div>
                        <h3 className="address-name">
                          {address.name}
                        </h3>

                        <p className="address-phone">
                          {address.phone}
                        </p>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => editAddress(address)}
                          aria-label="Edit address"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() =>
                            removeAddress(address.id)
                          }
                          aria-label="Delete address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="address-lines">
                      <div>
                        {address.house}, {address.street}
                      </div>

                      <div>
                        {address.city}, {address.state}{" "}
                        {address.pincode}
                      </div>
                    </div>

                    {address.formattedAddress && (
                      <div className="address-formatted">
                        {address.formattedAddress}
                      </div>
                    )}

                    <div className="card-bottom">
                      <button
                        type="button"
                        className="default-button"
                        onClick={() =>
                          setDefaultAddress(address.id)
                        }
                        disabled={address.isDefault}
                      >
                        {address.isDefault
                          ? "✓ Default Address"
                          : "Set as Default"}
                      </button>

                      <button
                        type="button"
                        className="use-address-button"
                        onClick={() => useAddress(address)}
                      >
                        Use This Address
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TOAST                                                               */}
      {/* -------------------------------------------------------------------- */}

      {toast && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Check size={16} />
          )}

          {toast.message}
        </div>
      )}
    </div>
  );
}
