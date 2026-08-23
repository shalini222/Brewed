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
  MapPinned,
  Clock3,
  ChevronRight,
  LocateFixed,
  AlertCircle,
} from "lucide-react";

const GOOGLE_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

const RECENT_STORAGE_KEY = "brewed_recent_addresses";

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

const DEFAULT_MAP_CENTER = {
  lat: 22.5726,
  lng: 88.3639,
};

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  /* ---------------------------------------------
     STATE
  --------------------------------------------- */

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const [autocompleteService, setAutocompleteService] = useState(null);
  const [placesService, setPlacesService] = useState(null);
  const [geocoder, setGeocoder] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [mapReady, setMapReady] = useState(false);
  const [mapDragging, setMapDragging] = useState(false);

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [recentIds, setRecentIds] = useState([]);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteDebounceRef = useRef(null);

  /* ---------------------------------------------
     RECENT ADDRESS HELPERS
  --------------------------------------------- */

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(RECENT_STORAGE_KEY) || "[]"
      );

      if (Array.isArray(stored)) {
        setRecentIds(stored);
      }
    } catch {
      setRecentIds([]);
    }
  }, []);

  const markAddressRecent = useCallback((id) => {
    if (!id) return;

    setRecentIds((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 5);

      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }

      return next;
    });
  }, []);

  /* ---------------------------------------------
     LOAD ADDRESSES
  --------------------------------------------- */

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

      data.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;

        const aRecent = recentIds.indexOf(a.id);
        const bRecent = recentIds.indexOf(b.id);

        if (aRecent !== -1 && bRecent !== -1) {
          return aRecent - bRecent;
        }

        if (aRecent !== -1) return -1;
        if (bRecent !== -1) return 1;

        return 0;
      });

      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, recentIds]);

  useEffect(() => {
    if (currentUser) {
      loadAddresses();
    }
  }, [currentUser, loadAddresses]);

  /* ---------------------------------------------
     LOAD USER DETAILS
  --------------------------------------------- */

  useEffect(() => {
    if (!currentUser) return;

    async function loadUserDetails() {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        setForm((prev) => ({
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

  /* ---------------------------------------------
     GOOGLE MAPS INITIALIZATION
  --------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function initializeGoogle() {
      if (!GOOGLE_API_KEY) {
        setGoogleError(
          "Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to your environment."
        );
        return;
      }

      try {
        const google = await loadGoogleMaps(GOOGLE_API_KEY);

        if (cancelled) return;

        if (!google?.maps) {
          throw new Error("Google Maps failed to initialize.");
        }

        setGoogleReady(true);

        setAutocompleteService(
          new google.maps.places.AutocompleteService()
        );

        setGeocoder(new google.maps.Geocoder());
      } catch (error) {
        console.error("Google Maps initialization failed:", error);

        if (!cancelled) {
          setGoogleError(
            "Google Maps couldn't load. Please try again later."
          );
        }
      }
    }

    initializeGoogle();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------
     PLACES SERVICE
  --------------------------------------------- */

  useEffect(() => {
    if (!googleReady || !window.google?.maps) return;

    const serviceContainer = document.createElement("div");

    const service = new window.google.maps.places.PlacesService(
      serviceContainer
    );

    setPlacesService(service);
  }, [googleReady]);

  /* ---------------------------------------------
     DELIVERY CHECK
  --------------------------------------------- */

  useEffect(() => {
    const pincode = form.pincode.trim();

    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      return;
    }

    checkDelivery(pincode);
  }, [form.pincode]);

  async function checkDelivery(pincode) {
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
  }

  /* ---------------------------------------------
     MAP INITIALIZATION
  --------------------------------------------- */

  const initializeMap = useCallback(
    (latitude, longitude) => {
      if (!googleReady || !window.google?.maps || !mapContainerRef.current) {
        return;
      }

      const position = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      if (
        !Number.isFinite(position.lat) ||
        !Number.isFinite(position.lng)
      ) {
        return;
      }

      if (!mapRef.current) {
        mapRef.current = new window.google.maps.Map(
          mapContainerRef.current,
          {
            center: position,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
            styles: [
              {
                featureType: "poi",
                stylers: [{ visibility: "off" }],
              },
            ],
          }
        );

        markerRef.current = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current.addListener("dragstart", () => {
          setMapDragging(true);
        });

        markerRef.current.addListener("dragend", () => {
          setMapDragging(false);

          const markerPosition = markerRef.current.getPosition();

          if (!markerPosition) return;

          const lat = markerPosition.lat();
          const lng = markerPosition.lng();

          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));

          reverseGeocode(lat, lng);
        });

        mapRef.current.addListener("click", (event) => {
          if (!event.latLng || !markerRef.current) return;

          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          markerRef.current.setPosition({
            lat,
            lng,
          });

          mapRef.current.panTo({
            lat,
            lng,
          });

          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));

          reverseGeocode(lat, lng);
        });
      } else {
        mapRef.current.setCenter(position);
        mapRef.current.setZoom(16);

        if (markerRef.current) {
          markerRef.current.setPosition(position);
        }
      }

      setMapReady(true);
    },
    [googleReady]
  );

  useEffect(() => {
    if (!showForm || !form.latitude || !form.longitude) return;

    initializeMap(form.latitude, form.longitude);
  }, [
    showForm,
    form.latitude,
    form.longitude,
    initializeMap,
  ]);

  /* ---------------------------------------------
     REVERSE GEOCODING
  --------------------------------------------- */

  const reverseGeocode = useCallback(
    (latitude, longitude) => {
      if (!geocoder) return;

      geocoder.geocode(
        {
          location: {
            lat: Number(latitude),
            lng: Number(longitude),
          },
        },
        (results, status) => {
          if (
            status !== "OK" ||
            !results ||
            !results.length
          ) {
            return;
          }

          const result = results[0];
          const components = result.address_components || [];

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
              types.includes("sublocality_level_1") ||
              types.includes("sublocality")
            ) {
              if (!street) {
                street = component.long_name;
              }
            }

            if (
              types.includes("locality") ||
              types.includes("postal_town")
            ) {
              city = component.long_name;
            }

            if (
              types.includes("administrative_area_level_1")
            ) {
              state = component.long_name;
            }

            if (types.includes("postal_code")) {
              pincode = component.long_name;
            }
          });

          setForm((prev) => ({
            ...prev,
            house: house || prev.house,
            street: street || prev.street,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
            latitude: Number(latitude),
            longitude: Number(longitude),
          }));
        }
      );
    },
    [geocoder]
  );

  /* ---------------------------------------------
     CURRENT LOCATION
  --------------------------------------------- */

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

        setForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        initializeMap(latitude, longitude);

        if (geocoder) {
          reverseGeocode(latitude, longitude);
        }

        setLocationLoading(false);
      },
      (error) => {
        let message = "Couldn't get your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission was denied. Please enable it in your browser settings.";
            break;

          case error.POSITION_UNAVAILABLE:
            message = "Your location is currently unavailable.";
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

  /* ---------------------------------------------
     PLACE SEARCH
  --------------------------------------------- */

  const searchPlaces = (text) => {
    setSearchText(text);

    if (autocompleteDebounceRef.current) {
      clearTimeout(autocompleteDebounceRef.current);
    }

    if (!autocompleteService || text.trim().length < 3) {
      setSuggestions([]);
      setSearchingPlaces(false);
      return;
    }

    setSearchingPlaces(true);

    autocompleteDebounceRef.current = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: text.trim(),
          componentRestrictions: {
            country: "in",
          },
        },
        (predictions, status) => {
          setSearchingPlaces(false);

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
  };

  /* ---------------------------------------------
     SELECT PLACE
  --------------------------------------------- */

  const selectPlace = (place) => {
    if (!placesService || !place?.place_id) return;

    setSearchText(place.description || "");
    setSuggestions([]);

    placesService.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "address_components",
          "formatted_address",
          "geometry",
          "name",
        ],
      },
      (result, status) => {
        if (
          status !==
            window.google.maps.places.PlacesServiceStatus.OK ||
          !result?.geometry?.location
        ) {
          return;
        }

        const location = result.geometry.location;

        const latitude = location.lat();
        const longitude = location.lng();

        let house = "";
        let street = "";
        let city = "";
        let state = "";
        let pincode = "";

        (result.address_components || []).forEach(
          (component) => {
            const types = component.types || [];

            if (types.includes("street_number")) {
              house = component.long_name;
            }

            if (types.includes("route")) {
              street = component.long_name;
            }

            if (
              types.includes("sublocality_level_1") ||
              types.includes("sublocality")
            ) {
              if (!street) {
                street = component.long_name;
              }
            }

            if (
              types.includes("locality") ||
              types.includes("postal_town")
            ) {
              city = component.long_name;
            }

            if (
              types.includes("administrative_area_level_1")
            ) {
              state = component.long_name;
            }

            if (types.includes("postal_code")) {
              pincode = component.long_name;
            }
          }
        );

        setForm((prev) => ({
          ...prev,
          house,
          street,
          city,
          state,
          pincode,
          latitude,
          longitude,
        }));

        initializeMap(latitude, longitude);
      }
    );
  };

  /* ---------------------------------------------
     FORM HELPERS
  --------------------------------------------- */

  function handleChange(event) {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "phone" || name === "pincode") {
      value = value.replace(/\D/g, "");
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      name: form.name,
      phone: form.phone,
    });

    setSearchText("");
    setSuggestions([]);
    setEditingId(null);

    setDeliveryAvailable(null);
    setDeliveryInfo(null);
    setLocationError("");

    setMapReady(false);

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    mapRef.current = null;
  };

  const openNewAddress = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  /* ---------------------------------------------
     SAVE ADDRESS
  --------------------------------------------- */

  async function saveAddress() {
    if (!currentUser || saving) return;

    const name = form.name.trim();
    const phone = form.phone.trim();
    const house = form.house.trim();
    const street = form.street.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pincode = form.pincode.trim();

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
        "This pincode is currently outside our delivery area."
      );
      return;
    }

    const isDuplicate = addresses.some(
      (item) =>
        item.id !== editingId &&
        (item.house || "").trim().toLowerCase() ===
          house.toLowerCase() &&
        (item.street || "").trim().toLowerCase() ===
          street.toLowerCase() &&
        (item.city || "").trim().toLowerCase() ===
          city.toLowerCase() &&
        (item.pincode || "") === pincode
    );

    if (isDuplicate) {
      alert("This address is already saved.");
      return;
    }

    setSaving(true);

    try {
      /*
       * If this is the first address, automatically make
       * it the default address.
       */
      const shouldBeDefault =
        addresses.length === 0 || form.isDefault;

      const addressData = {
        name,
        phone,
        house,
        street,
        city,
        state,
        pincode,
        type: form.type || "Home",
        isDefault: shouldBeDefault,
        latitude:
          typeof form.latitude === "number"
            ? form.latitude
            : null,
        longitude:
          typeof form.longitude === "number"
            ? form.longitude
            : null,
        formattedAddress:
          [
            house,
            street,
            city,
            state,
            pincode,
          ]
            .filter(Boolean)
            .join(", "),
        updatedAt: serverTimestamp(),
      };

      /*
       * If setting this address as default,
       * remove default from all other addresses.
       */
      if (shouldBeDefault) {
        const updates = addresses
          .filter((item) => item.id !== editingId && item.isDefault)
          .map((item) =>
            updateDoc(
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
            )
          );

        await Promise.all(updates);
      }

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

        setAddresses((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...addressData,
                }
              : shouldBeDefault
              ? {
                  ...item,
                  isDefault: false,
                }
              : item
          )
        );

        markAddressRecent(editingId);
      } else {
        const ref = await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          ),
          {
            ...addressData,
            createdAt: serverTimestamp(),
          }
        );

        const newAddress = {
          id: ref.id,
          ...addressData,
        };

        setAddresses((prev) => [
          ...(shouldBeDefault
            ? prev.map((item) => ({
                ...item,
                isDefault: false,
              }))
            : prev),
          newAddress,
        ]);

        markAddressRecent(ref.id);
      }

      closeForm();
    } catch (error) {
      console.error("Failed to save address:", error);
      alert(
        "We couldn't save this address. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------
     EDIT ADDRESS
  --------------------------------------------- */

  function editAddress(address) {
    setForm({
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
        typeof address.latitude === "number"
          ? address.latitude
          : null,
      longitude:
        typeof address.longitude === "number"
          ? address.longitude
          : null,
    });

    setEditingId(address.id);
    setSearchText(address.formattedAddress || "");
    setSuggestions([]);
    setLocationError("");

    setDeliveryAvailable(null);
    setDeliveryInfo(null);

    setShowForm(true);

    if (address.latitude && address.longitude) {
      setTimeout(() => {
        initializeMap(
          address.latitude,
          address.longitude
        );
      }, 100);
    }
  }

  /* ---------------------------------------------
     DELETE ADDRESS
  --------------------------------------------- */

  async function removeAddress(id) {
    if (!currentUser || deletingId) return;

    const address = addresses.find(
      (item) => item.id === id
    );

    const ok = window.confirm(
      `Delete this ${address?.type || ""} address?`
    );

    if (!ok) return;

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          id
        )
      );

      setAddresses((prev) =>
        prev.filter((item) => item.id !== id)
      );

      setRecentIds((prev) => {
        const next = prev.filter((item) => item !== id);

        try {
          localStorage.setItem(
            RECENT_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          // Ignore.
        }

        return next;
      });
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert(
        "We couldn't delete this address. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------------------------------
     DEFAULT ADDRESS
  --------------------------------------------- */

  async function setDefaultAddress(id) {
    if (!currentUser) return;

    const previous = addresses;

    const updated = addresses.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));

    setAddresses(updated);

    try {
      await Promise.all(
        updated.map((item) =>
          updateDoc(
            doc(
              db,
              "users",
              currentUser.uid,
              "addresses",
              item.id
            ),
            {
              isDefault: item.isDefault,
            }
          )
        )
      );

      markAddressRecent(id);
    } catch (error) {
      console.error(
        "Failed to update default address:",
        error
      );

      setAddresses(previous);

      alert(
        "We couldn't update your default address."
      );
    }
  }

  /* ---------------------------------------------
     RECENT ADDRESS LIST
  --------------------------------------------- */

  const recentAddresses = useMemo(() => {
    return recentIds
      .map((id) =>
        addresses.find((address) => address.id === id)
      )
      .filter(Boolean)
      .slice(0, 3);
  }, [recentIds, addresses]);

  const regularAddresses = useMemo(() => {
    const recentSet = new Set(
      recentAddresses.map((item) => item.id)
    );

    return [...addresses]
      .filter((address) => !recentSet.has(address.id))
      .sort(
        (a, b) =>
          Number(b.isDefault) - Number(a.isDefault)
      );
  }, [addresses, recentAddresses]);

  /* ---------------------------------------------
     ADDRESS CARD
  --------------------------------------------- */

  function AddressCard({ address, recent = false }) {
    const TypeIcon =
      address.type === "Work"
        ? Briefcase
        : address.type === "Other"
        ? MapPin
        : Home;

    return (
      <article
        className={`address-card ${
          address.isDefault ? "is-default" : ""
        }`}
      >
        <div className="address-card-top">
          <div className="address-type">
            <span className="type-icon">
              <TypeIcon size={17} strokeWidth={2} />
            </span>

            <span className="type-label">
              {address.type || "Home"}
            </span>

            {address.isDefault && (
              <span className="default-badge">
                <Star size={11} fill="currentColor" />
                Default
              </span>
            )}

            {recent && !address.isDefault && (
              <span className="recent-badge">
                <Clock3 size={11} />
                Recent
              </span>
            )}
          </div>

          <div className="address-actions">
            <button
              className="round-action"
              onClick={() => editAddress(address)}
              aria-label="Edit address"
              title="Edit address"
            >
              <Pencil size={16} />
            </button>

            <button
              className="round-action danger"
              onClick={() =>
                removeAddress(address.id)
              }
              disabled={deletingId === address.id}
              aria-label="Delete address"
              title="Delete address"
            >
              {deletingId === address.id ? (
                <Loader2
                  size={16}
                  className="spin"
                />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="address-content">
          <h3>{address.name}</h3>

          <p className="address-phone">
            {address.phone}
          </p>

          <p>
            {address.house}, {address.street}
          </p>

          <p>
            {address.city}, {address.state}{" "}
            {address.pincode}
          </p>
        </div>

        <div className="address-card-footer">
          <button
            className={
              address.isDefault
                ? "default-button active"
                : "default-button"
            }
            onClick={() =>
              !address.isDefault &&
              setDefaultAddress(address.id)
            }
            disabled={address.isDefault}
          >
            {address.isDefault ? (
              <>
                <Check size={15} />
                Default address
              </>
            ) : (
              <>
                <Star size={15} />
                Set as default
              </>
            )}
          </button>

          {address.latitude &&
            address.longitude && (
              <span className="map-verified">
                <MapPinned size={14} />
                Map location
              </span>
            )}
        </div>
      </article>
    );
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  return (
    <>
      <div className="address-page">
        <header className="address-header">
          <button
            className="back-button"
            onClick={() => setPage("menu")}
            aria-label="Back to menu"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="header-copy">
            <span className="eyebrow">
              DELIVERY DETAILS
            </span>

            <h1>My Addresses</h1>

            <p>
              Save your favourite delivery locations
              for a faster checkout.
            </p>
          </div>
        </header>

        <main className="address-shell">
          <section className="hero-row">
            <div>
              <span className="section-kicker">
                YOUR LOCATIONS
              </span>

              <h2>Where should we deliver?</h2>
            </div>

            <button
              className="add-address-button"
              onClick={
                showForm ? closeForm : openNewAddress
              }
            >
              {showForm ? (
                <>
                  <X size={18} />
                  Close
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add address
                </>
              )}
            </button>
          </section>

          {googleError && (
            <div className="notice error-notice">
              <AlertCircle size={18} />
              <span>{googleError}</span>
            </div>
          )}

          {/* -----------------------------------------
              FORM
          ----------------------------------------- */}

          {showForm && (
            <section className="form-card">
              <div className="form-heading">
                <div>
                  <span className="section-kicker">
                    {editingId
                      ? "UPDATE LOCATION"
                      : "NEW LOCATION"}
                  </span>

                  <h2>
                    {editingId
                      ? "Edit your address"
                      : "Add a delivery address"}
                  </h2>
                </div>

                <button
                  className="close-form"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* LOCATION TOOLS */}

              <div className="location-tools">
                <button
                  className="location-button"
                  onClick={useCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2
                      size={18}
                      className="spin"
                    />
                  ) : (
                    <LocateFixed size={18} />
                  )}

                  {locationLoading
                    ? "Detecting location..."
                    : "Use current location"}
                </button>

                <span className="location-or">
                  OR
                </span>

                <div className="search-wrapper">
                  <Search
                    size={18}
                    className="search-icon"
                  />

                  <input
                    value={searchText}
                    placeholder="Search your address"
                    onChange={(event) =>
                      searchPlaces(event.target.value)
                    }
                    autoComplete="off"
                  />

                  {searchingPlaces && (
                    <Loader2
                      size={17}
                      className="search-loader spin"
                    />
                  )}

                  {searchText && !searchingPlaces && (
                    <button
                      className="clear-search"
                      onClick={() => {
                        setSearchText("");
                        setSuggestions([]);
                      }}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}

                  {suggestions.length > 0 && (
                    <div className="suggestions">
                      {suggestions.map((place) => (
                        <button
                          key={place.place_id}
                          className="suggestion"
                          onClick={() =>
                            selectPlace(place)
                          }
                        >
                          <span className="suggestion-icon">
                            <MapPin size={16} />
                          </span>

                          <span>
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
                            className="suggestion-arrow"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {locationError && (
                <div className="field-error">
                  <AlertCircle size={15} />
                  {locationError}
                </div>
              )}

              {/* MAP */}

              <div className="map-section">
                <div className="map-heading">
                  <div>
                    <span className="map-title">
                      Pin your exact location
                    </span>

                    <span className="map-subtitle">
                      Drag the pin or tap anywhere on
                      the map.
                    </span>
                  </div>

                  {mapDragging && (
                    <span className="map-status">
                      Moving pin...
                    </span>
                  )}
                </div>

                <div className="map-wrapper">
                  {form.latitude &&
                  form.longitude &&
                  googleReady ? (
                    <>
                      <div
                        ref={mapContainerRef}
                        className="google-map"
                      />

                      <div className="map-hint">
                        <MapPinned size={14} />
                        Drag the pin to adjust your
                        delivery point
                      </div>
                    </>
                  ) : (
                    <div className="map-placeholder">
                      <div className="map-placeholder-icon">
                        <MapPinned size={25} />
                      </div>

                      <strong>
                        Choose your location
                      </strong>

                      <span>
                        Search for your address or use
                        your current location to place
                        the map pin.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ADDRESS DETAILS */}

              <div className="form-section">
                <div className="form-section-title">
                  <span>01</span>
                  Contact details
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Full name</span>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Shalini Dutta"
                      autoComplete="name"
                    />
                  </label>

                  <label className="field">
                    <span>Phone number</span>

                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">
                  <span>02</span>
                  Delivery address
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>House / flat number</span>

                    <input
                      name="house"
                      value={form.house}
                      onChange={handleChange}
                      placeholder="Flat 4B / 24A"
                      autoComplete="address-line1"
                    />
                  </label>

                  <label className="field">
                    <span>Street / area</span>

                    <input
                      name="street"
                      value={form.street}
                      onChange={handleChange}
                      placeholder="Street, locality or area"
                      autoComplete="address-line2"
                    />
                  </label>

                  <label className="field">
                    <span>City</span>

                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="City"
                      autoComplete="address-level2"
                    />
                  </label>

                  <label className="field">
                    <span>State</span>

                    <input
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="State"
                      autoComplete="address-level1"
                    />
                  </label>

                  <label className="field">
                    <span>Pincode</span>

                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                  </label>

                  <label className="field">
                    <span>Address type</span>

                    <select
                      name="type"
                      value={form.type}
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
                  </label>
                </div>

                {/* DELIVERY RESULT */}

                {checkingDelivery && (
                  <div className="delivery-check checking">
                    <Loader2
                      size={16}
                      className="spin"
                    />
                    Checking delivery availability...
                  </div>
                )}

                {!checkingDelivery &&
                  deliveryAvailable === true && (
                    <div className="delivery-check available">
                      <span className="delivery-icon">
                        <Check size={15} />
                      </span>

                      <div>
                        <strong>
                          Delivery available
                        </strong>

                        {deliveryInfo && (
                          <small>
                            {typeof deliveryInfo ===
                            "string"
                              ? deliveryInfo
                              : deliveryInfo.message ||
                                "We deliver to this area."}
                          </small>
                        )}
                      </div>
                    </div>
                  )}

                {!checkingDelivery &&
                  deliveryAvailable === false && (
                    <div className="delivery-check unavailable">
                      <span className="delivery-icon">
                        <X size={15} />
                      </span>

                      <div>
                        <strong>
                          Delivery unavailable
                        </strong>

                        <small>
                          We don't deliver to this
                          pincode yet.
                        </small>
                      </div>
                    </div>
                  )}
              </div>

              <div className="form-bottom">
                <label className="default-toggle">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isDefault:
                          event.target.checked,
                      }))
                    }
                  />

                  <span className="custom-checkbox">
                    <Check size={13} />
                  </span>

                  <span>
                    <strong>
                      Make this my default address
                    </strong>
                    <small>
                      Use this address automatically
                      during checkout.
                    </small>
                  </span>
                </label>

                <button
                  className="save-button"
                  onClick={saveAddress}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      {editingId
                        ? "Update address"
                        : "Save address"}
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* -----------------------------------------
              RECENT ADDRESSES
          ----------------------------------------- */}

          {!loading &&
            !showForm &&
            recentAddresses.length > 0 && (
              <section className="address-section">
                <div className="section-header">
                  <div>
                    <span className="section-kicker">
                      QUICK ACCESS
                    </span>

                    <h2>Recent addresses</h2>
                  </div>
                </div>

                <div className="address-grid">
                  {recentAddresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      recent
                    />
                  ))}
                </div>
              </section>
            )}

          {/* -----------------------------------------
              ALL ADDRESSES
          ----------------------------------------- */}

          <section className="address-section">
            <div className="section-header">
              <div>
                <span className="section-kicker">
                  SAVED LOCATIONS
                </span>

                <h2>
                  {addresses.length
                    ? "Your addresses"
                    : "No saved addresses"}
                </h2>
              </div>

              {!showForm && addresses.length > 0 && (
                <span className="address-count">
                  {addresses.length}{" "}
                  {addresses.length === 1
                    ? "address"
                    : "addresses"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <Loader2
                  size={24}
                  className="spin"
                />

                <span>
                  Loading your addresses...
                </span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <MapPin size={27} />
                </div>

                <h3>Your address book is empty</h3>

                <p>
                  Add your home, work or favourite
                  delivery location and make your next
                  order effortless.
                </p>

                <button
                  className="empty-button"
                  onClick={openNewAddress}
                >
                  <Plus size={17} />
                  Add your first address
                </button>
              </div>
            ) : regularAddresses.length > 0 ? (
              <div className="address-grid">
                {regularAddresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                  />
                ))}
              </div>
            ) : (
              <div className="all-recent-note">
                Your saved addresses are shown above.
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ---------------------------------------------
          COMPLETE PAGE CSS
      --------------------------------------------- */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .address-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(196, 149, 106, 0.10),
              transparent 32%
            ),
            #fdfaf5;
          color: #1a0b05;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding-bottom: 80px;
        }

        .address-header {
          max-width: 1180px;
          margin: 0 auto;
          padding: 36px 28px 10px;
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }

        .back-button {
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border: 1px solid #eee4d9;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.88);
          color: #1a0b05;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: 0.2s ease;
          box-shadow: 0 5px 20px rgba(26, 11, 5, 0.06);
        }

        .back-button:hover {
          transform: translateY(-1px);
          background: #fff;
          border-color: #c4956a;
        }

        .header-copy {
          padding-top: 1px;
        }

        .eyebrow,
        .section-kicker {
          display: block;
          font-size: 10px;
          letter-spacing: 0.18em;
          font-weight: 800;
          color: #a97850;
        }

        .header-copy h1 {
          margin: 6px 0 5px;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(30px, 4vw, 43px);
          line-height: 1.05;
          letter-spacing: -0.025em;
          font-weight: 600;
        }

        .header-copy p {
          margin: 0;
          color: #81766e;
          font-size: 14px;
          line-height: 1.6;
        }

        .address-shell {
          width: min(1180px, calc(100% - 56px));
          margin: 30px auto 0;
        }

        .hero-row,
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .hero-row {
          margin-bottom: 22px;
        }

        .hero-row h2,
        .section-header h2,
        .form-heading h2 {
          margin: 6px 0 0;
          font-family: "Playfair Display", Georgia, serif;
          font-weight: 600;
          letter-spacing: -0.015em;
          color: #1a0b05;
        }

        .hero-row h2 {
          font-size: 25px;
        }

        .section-header h2 {
          font-size: 23px;
        }

        .add-address-button,
        .empty-button,
        .save-button {
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .add-address-button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          background: #1a0b05;
          color: #fff;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(26, 11, 5, 0.12);
        }

        .add-address-button:hover,
        .save-button:hover,
        .empty-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(26, 11, 5, 0.16);
        }

        .notice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          border-radius: 12px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .error-notice {
          background: #fff1f0;
          border: 1px solid #f1d1cd;
          color: #a23a31;
        }

        /* FORM */

        .form-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #eee5db;
          border-radius: 24px;
          padding: clamp(20px, 4vw, 32px);
          margin-bottom: 42px;
          box-shadow:
            0 20px 55px rgba(43, 26, 15, 0.08),
            0 2px 8px rgba(43, 26, 15, 0.03);
        }

        .form-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 25px;
        }

        .form-heading h2 {
          font-size: 27px;
        }

        .close-form {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #eee4d9;
          background: #faf7f3;
          color: #5c5048;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        /* LOCATION */

        .location-tools {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .location-button {
          min-height: 48px;
          padding: 0 17px;
          border: 1px solid #1a0b05;
          border-radius: 12px;
          background: #1a0b05;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .location-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .location-or {
          font-size: 10px;
          color: #a79c94;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-align: center;
        }

        .search-wrapper {
          position: relative;
        }

        .search-wrapper > input {
          width: 100%;
          height: 48px;
          padding: 0 42px;
          border: 1px solid #e4dbd2;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: #1a0b05;
          font-size: 14px;
          transition: 0.2s ease;
        }

        .search-wrapper > input:focus {
          border-color: #c4956a;
          box-shadow: 0 0 0 3px rgba(196, 149, 106, 0.12);
        }

        .search-icon {
          position: absolute;
          left: 15px;
          top: 15px;
          color: #9b8d83;
          pointer-events: none;
        }

        .search-loader {
          position: absolute;
          right: 14px;
          top: 15px;
          color: #c4956a;
        }

        .clear-search {
          position: absolute;
          right: 9px;
          top: 8px;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: #f6f1eb;
          color: #786b62;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .suggestions {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 7px);
          z-index: 50;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e8dfd6;
          border-radius: 14px;
          box-shadow: 0 18px 45px rgba(26, 11, 5, 0.15);
        }

        .suggestion {
          width: 100%;
          border: none;
          border-bottom: 1px solid #f0ebe5;
          background: #fff;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) 18px;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          color: #1a0b05;
        }

        .suggestion:last-child {
          border-bottom: none;
        }

        .suggestion:hover {
          background: #fcf8f3;
        }

        .suggestion-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: #f7eee5;
          color: #b37f55;
          display: grid;
          place-items: center;
        }

        .suggestion strong,
        .suggestion small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .suggestion strong {
          font-size: 13px;
          font-weight: 700;
        }

        .suggestion small {
          margin-top: 2px;
          color: #8c8178;
          font-size: 11px;
        }

        .suggestion-arrow {
          color: #b8aaa0;
        }

        .field-error {
          display: flex;
          align-items: center;
          gap: 7px;
          margin: 0 0 15px;
          color: #aa3d34;
          font-size: 12px;
        }

        /* MAP */

        .map-section {
          margin: 22px 0 28px;
        }

        .map-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 10px;
        }

        .map-title {
          display: block;
          font-size: 13px;
          font-weight: 800;
          color: #30231c;
        }

        .map-subtitle {
          display: block;
          margin-top: 3px;
          color: #958980;
          font-size: 11px;
        }

        .map-status {
          color: #a97850;
          font-size: 11px;
          font-weight: 700;
        }

        .map-wrapper {
          height: 330px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid #e8ded4;
          background: #f3eee8;
          position: relative;
        }

        .google-map {
          width: 100%;
          height: 100%;
        }

        .map-hint {
          position: absolute;
          bottom: 13px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(26, 11, 5, 0.86);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          pointer-events: none;
        }

        .map-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
          background:
            linear-gradient(
              rgba(255, 255, 255, 0.65),
              rgba(250, 245, 239, 0.9)
            );
        }

        .map-placeholder-icon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #f1e4d8;
          color: #b17c52;
          display: grid;
          place-items: center;
          margin-bottom: 13px;
        }

        .map-placeholder strong {
          font-size: 14px;
          margin-bottom: 6px;
        }

        .map-placeholder span {
          max-width: 330px;
          color: #8c8178;
          font-size: 12px;
          line-height: 1.6;
        }

        /* FORM FIELDS */

        .form-section {
          padding-top: 4px;
          margin-top: 25px;
        }

        .form-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          font-size: 12px;
          font-weight: 800;
          color: #3b2b22;
          letter-spacing: 0.04em;
        }

        .form-section-title > span {
          width: 27px;
          height: 27px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: #f4e9de;
          color: #aa754c;
          font-size: 10px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field > span {
          color: #62554d;
          font-size: 11px;
          font-weight: 700;
        }

        .field input,
        .field select {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1px solid #e4dbd2;
          border-radius: 11px;
          background: #fff;
          color: #1a0b05;
          outline: none;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .field input:focus,
        .field select:focus {
          border-color: #c4956a;
          box-shadow: 0 0 0 3px rgba(196, 149, 106, 0.11);
        }

        .field input::placeholder {
          color: #b5aaa2;
        }

        /* DELIVERY */

        .delivery-check {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }

        .delivery-check > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .delivery-check strong {
          font-size: 12px;
        }

        .delivery-check small {
          color: inherit;
          opacity: 0.75;
          font-size: 11px;
        }

        .delivery-check.checking {
          background: #f8f4ef;
          color: #806c5e;
        }

        .delivery-check.available {
          background: #edf8f0;
          border: 1px solid #d5ead9;
          color: #2e7041;
        }

        .delivery-check.unavailable {
          background: #fff1ef;
          border: 1px solid #f0d5d0;
          color: #a13e35;
        }

        .delivery-icon {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.7);
        }

        /* FORM FOOTER */

        .form-bottom {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid #eee7df;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .default-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .default-toggle input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .custom-checkbox {
          flex: 0 0 auto;
          width: 21px;
          height: 21px;
          border: 1px solid #d8cabe;
          border-radius: 6px;
          background: #fff;
          color: transparent;
          display: grid;
          place-items: center;
        }

        .default-toggle input:checked + .custom-checkbox {
          background: #c4956a;
          border-color: #c4956a;
          color: #fff;
        }

        .default-toggle > span:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .default-toggle strong {
          font-size: 12px;
          color: #34271f;
        }

        .default-toggle small {
          color: #9a8e85;
          font-size: 10px;
        }

        .save-button {
          min-height: 48px;
          min-width: 175px;
          padding: 0 20px;
          border-radius: 12px;
          background: #1a0b05;
          color: #fff;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(26, 11, 5, 0.13);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: wait;
          transform: none;
        }

        /* ADDRESS SECTIONS */

        .address-section {
          margin-top: 40px;
        }

        .section-header {
          margin-bottom: 16px;
        }

        .address-count {
          color: #a18f83;
          font-size: 11px;
          font-weight: 700;
        }

        .address-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        /* ADDRESS CARD */

        .address-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #eee5db;
          border-radius: 19px;
          padding: 19px;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .address-card:hover {
          transform: translateY(-2px);
          border-color: #e2d3c5;
          box-shadow: 0 14px 35px rgba(43, 26, 15, 0.08);
        }

        .address-card.is-default {
          border-color: rgba(196, 149, 106, 0.48);
          box-shadow:
            0 10px 30px rgba(196, 149, 106, 0.08);
        }

        .address-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .address-type {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
        }

        .type-icon {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          background: #f6ede4;
          color: #b27d53;
          display: grid;
          place-items: center;
        }

        .type-label {
          font-size: 12px;
          font-weight: 800;
          color: #3a2b23;
        }

        .default-badge,
        .recent-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 800;
        }

        .default-badge {
          background: #c4956a;
          color: #fff;
        }

        .recent-badge {
          background: #f4eee8;
          color: #987456;
        }

        .address-actions {
          display: flex;
          gap: 6px;
        }

        .round-action {
          width: 32px;
          height: 32px;
          border: 1px solid #eee5dc;
          border-radius: 50%;
          background: #faf7f3;
          color: #66574e;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .round-action:hover {
          background: #f3e8de;
          color: #1a0b05;
        }

        .round-action.danger:hover {
          background: #fff0ed;
          color: #a34037;
        }

        .round-action:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .address-content {
          margin-top: 17px;
        }

        .address-content h3 {
          margin: 0 0 4px;
          color: #1a0b05;
          font-size: 16px;
          font-weight: 800;
        }

        .address-content p {
          margin: 3px 0;
          color: #665b54;
          font-size: 12px;
          line-height: 1.55;
        }

        .address-content .address-phone {
          color: #9a8d84;
          margin-bottom: 9px;
        }

        .address-card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #f0eae3;
        }

        .default-button {
          min-height: 35px;
          padding: 0 12px;
          border: 1px solid #decbb9;
          border-radius: 9px;
          background: #fffaf5;
          color: #8e6343;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .default-button:hover:not(:disabled) {
          background: #f8eee5;
        }

        .default-button.active {
          border-color: #c4956a;
          background: #c4956a;
          color: #fff;
        }

        .default-button:disabled {
          cursor: default;
        }

        .map-verified {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #7d9b84;
          font-size: 9px;
          font-weight: 700;
        }

        /* EMPTY / LOADING */

        .loading-state,
        .empty-state {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid #eee5db;
          border-radius: 20px;
          min-height: 210px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
        }

        .loading-state {
          gap: 10px;
          color: #887970;
          font-size: 12px;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: #f3e8dc;
          color: #b27d53;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
        }

        .empty-state h3 {
          margin: 0 0 7px;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 22px;
          font-weight: 600;
        }

        .empty-state p {
          max-width: 390px;
          margin: 0 0 19px;
          color: #8a7d74;
          font-size: 12px;
          line-height: 1.65;
        }

        .empty-button {
          min-height: 40px;
          padding: 0 15px;
          border-radius: 10px;
          background: #1a0b05;
          color: #fff;
          font-size: 12px;
        }

        .all-recent-note {
          padding: 25px;
          text-align: center;
          border: 1px dashed #ded1c5;
          border-radius: 16px;
          color: #958980;
          font-size: 12px;
        }

        .spin {
          animation: address-spin 0.8s linear infinite;
        }

        @keyframes address-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* RESPONSIVE */

        @media (max-width: 800px) {
          .address-header {
            padding: 26px 20px 5px;
          }

          .address-shell {
            width: calc(100% - 40px);
            margin-top: 25px;
          }

          .hero-row,
          .section-header {
            align-items: flex-start;
          }

          .location-tools {
            grid-template-columns: 1fr;
          }

          .location-or {
            display: none;
          }

          .address-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-bottom {
            align-items: stretch;
            flex-direction: column;
          }

          .save-button {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .address-page {
            padding-bottom: 45px;
          }

          .address-header {
            gap: 12px;
          }

          .back-button {
            width: 40px;
            height: 40px;
          }

          .header-copy h1 {
            font-size: 30px;
          }

          .header-copy p {
            font-size: 12px;
          }

          .address-shell {
            width: calc(100% - 28px);
          }

          .hero-row {
            flex-direction: column;
            align-items: stretch;
          }

          .add-address-button {
            width: 100%;
          }

          .form-card {
            border-radius: 19px;
            padding: 18px;
          }

          .form-heading h2 {
            font-size: 23px;
          }

          .map-wrapper {
            height: 280px;
          }

          .map-hint {
            max-width: calc(100% - 20px);
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .address-card-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .default-button {
            width: 100%;
          }

          .map-verified {
            margin-left: 0;
            justify-content: center;
          }

          .section-header {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
