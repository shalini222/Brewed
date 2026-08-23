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
  Map,
  LocateFixed,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
|
| The default map location is intentionally NOT hard-coded to Brewed's
| latitude/longitude.
|
| Google will geocode the configured default pincode when the map loads.
| This gives the map an immediate useful starting area while keeping
| Brewed's actual location configurable for Brewed Lite / future clients.
|
*/

const MAP_CONFIG = {
  defaultPincode: "700033",
  defaultCountry: "India",
};

const GOOGLE_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

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
  formattedAddress: "",
};

const FALLBACK_MAP_ZOOM = 14;
const SELECTED_MAP_ZOOM = 17;

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const debounceRef = useRef(null);

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [googleReady, setGoogleReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [cleanedForm, setCleanedForm] = useState(EMPTY_FORM);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(FALLBACK_MAP_ZOOM);
  const [mapLocationLoading, setMapLocationLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddressLoading, setMapAddressLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load addresses
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!currentUser) {
      setAddresses([]);
      setLoading(false);
      return;
    }

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
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | User profile prefill
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!currentUser) return;

    async function loadUserDetails() {
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

  /*
  |--------------------------------------------------------------------------
  | Google Maps
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      setMapError(
        "Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to your environment."
      );
      setMapLocationLoading(false);
      return;
    }

    let cancelled = false;

    loadGoogleMaps(GOOGLE_API_KEY)
      .then(() => {
        if (cancelled) return;

        if (!window.google?.maps) {
          throw new Error("Google Maps failed to initialize.");
        }

        setGoogleReady(true);
      })
      .catch((error) => {
        console.error("Google Maps loading failed:", error);
        if (!cancelled) {
          setMapError("Unable to load Google Maps.");
          setMapLocationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Google services
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!googleReady || !window.google?.maps) return;

    try {
      autocompleteServiceRef.current =
        new window.google.maps.places.AutocompleteService();

      geocoderRef.current = new window.google.maps.Geocoder();

      setMapLocationLoading(true);

      /*
       * Resolve the configured default pincode.
       * This prevents a blank map without hard-coding Brewed coordinates.
       */
      geocoderRef.current.geocode(
        {
          address: `${MAP_CONFIG.defaultPincode}, ${MAP_CONFIG.defaultCountry}`,
        },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const location = results[0].geometry.location;

            const center = {
              lat: location.lat(),
              lng: location.lng(),
            };

            setMapCenter(center);
            setSelectedLocation(center);
            setMapZoom(FALLBACK_MAP_ZOOM);
          } else {
            console.error("Default pincode geocoding failed:", status);
            setMapError(
              "Unable to determine the default delivery area on the map."
            );
          }

          setMapLocationLoading(false);
        }
      );
    } catch (error) {
      console.error("Google services initialization failed:", error);
      setMapLocationLoading(false);
      setMapError("Unable to initialize Google Maps.");
    }
  }, [googleReady]);

  /*
  |--------------------------------------------------------------------------
  | Initialize / update map
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!googleReady || !mapCenter || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(
        document.getElementById("brewed-address-map"),
        {
          center: mapCenter,
          zoom: mapZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi.business",
              stylers: [{ visibility: "off" }],
            },
          ],
        }
      );

      placesServiceRef.current =
        new window.google.maps.places.PlacesService(mapRef.current);

      mapRef.current.addListener("click", (event) => {
        if (!event.latLng) return;

        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };

        setMapLocation(location, SELECTED_MAP_ZOOM);
        reverseGeocodeLocation(location);
      });

      setMapReady(true);
    } else {
      mapRef.current.panTo(mapCenter);
      mapRef.current.setZoom(mapZoom);
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: mapCenter,
        draggable: true,
        title: "Selected delivery location",
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current.getPosition();

        if (!position) return;

        const location = {
          lat: position.lat(),
          lng: position.lng(),
        };

        setMapLocation(location, SELECTED_MAP_ZOOM);
        reverseGeocodeLocation(location);
      });
    } else {
      markerRef.current.setPosition(mapCenter);
    }
  }, [googleReady, mapCenter, mapZoom]);

  /*
  |--------------------------------------------------------------------------
  | Map helpers
  |--------------------------------------------------------------------------
  */

  function setMapLocation(location, zoom = SELECTED_MAP_ZOOM) {
    setMapCenter(location);
    setSelectedLocation(location);
    setMapZoom(zoom);

    if (mapRef.current) {
      mapRef.current.panTo(location);
      mapRef.current.setZoom(zoom);
    }

    if (markerRef.current) {
      markerRef.current.setPosition(location);
    }
  }

  function reverseGeocodeLocation(location) {
    if (!geocoderRef.current) return;

    setMapAddressLoading(true);

    geocoderRef.current.geocode(
      {
        location,
      },
      (results, status) => {
        setMapAddressLoading(false);

        if (status !== "OK" || !results?.length) {
          setLocationError("We couldn't identify this location.");
          return;
        }

        const parsed = parseGoogleAddress(results[0]);

        setCleanedForm((previous) => ({
          ...previous,
          ...parsed,
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: results[0].formatted_address || "",
        }));

        setSearchText(results[0].formatted_address || "");
        setSuggestions([]);

        if (parsed.pincode) {
          checkDelivery(parsed.pincode);
        }
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Google address parsing
  |--------------------------------------------------------------------------
  */

  function parseGoogleAddress(result) {
    const components = result?.address_components || [];

    let house = "";
    let street = "";
    let city = "";
    let state = "";
    let pincode = "";

    components.forEach((component) => {
      const types = component.types || [];

      if (
        types.includes("street_number") ||
        types.includes("premise") ||
        types.includes("subpremise")
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
        types.includes("postal_town") ||
        types.includes("administrative_area_level_2")
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

    return {
      house,
      street,
      city,
      state,
      pincode,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Delivery validation
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const pincode = cleanedForm.pincode;

    if (pincode.length !== 6) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      return;
    }

    checkDelivery(pincode);
  }, [cleanedForm.pincode]);

  async function checkDelivery(pincode) {
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
  }

  /*
  |--------------------------------------------------------------------------
  | Form handling
  |--------------------------------------------------------------------------
  */

  function handleChange(event) {
    let { name, value } = event.target;

    if (name === "phone" || name === "pincode") {
      value = value.replace(/\D/g, "");
    }

    setCleanedForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "pincode") {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Search places
  |--------------------------------------------------------------------------
  */

  function searchPlaces(text) {
    setSearchText(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!autocompleteServiceRef.current || text.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    debounceRef.current = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
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

          setSuggestions(predictions.slice(0, 6));
        }
      );
    }, 250);
  }

  function selectSuggestion(place) {
    if (!placesServiceRef.current) return;

    setSearchText(place.description);
    setSuggestions([]);
    setLoadingSuggestions(true);

    placesServiceRef.current.getDetails(
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
          !result?.geometry?.location
        ) {
          setLocationError("Unable to load the selected address.");
          return;
        }

        const location = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        };

        const parsed = parseGoogleAddress(result);

        setCleanedForm((previous) => ({
          ...previous,
          ...parsed,
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address || "",
        }));

        setLocationError("");
        setMapLocation(location, SELECTED_MAP_ZOOM);

        if (parsed.pincode) {
          checkDelivery(parsed.pincode);
        }
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Current location
  |--------------------------------------------------------------------------
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

        const location = {
          lat: latitude,
          lng: longitude,
        };

        try {
          setMapLocation(location, SELECTED_MAP_ZOOM);

          if (!geocoderRef.current) {
            setLocationLoading(false);
            return;
          }

          geocoderRef.current.geocode(
            {
              location,
            },
            (results, status) => {
              if (status !== "OK" || !results?.length) {
                setLocationError(
                  "Your location was found, but no address could be identified."
                );
                setLocationLoading(false);
                return;
              }

              const result = results[0];
              const parsed = parseGoogleAddress(result);

              setCleanedForm((previous) => ({
                ...previous,
                ...parsed,
                latitude,
                longitude,
                formattedAddress: result.formatted_address || "",
              }));

              setSearchText(result.formatted_address || "");

              if (parsed.pincode) {
                checkDelivery(parsed.pincode);
              }

              setLocationLoading(false);
            }
          );
        } catch (error) {
          console.error("Current location failed:", error);
          setLocationError("Unable to determine your address.");
          setLocationLoading(false);
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission was denied.");
            break;

          case error.POSITION_UNAVAILABLE:
            setLocationError("Your location is currently unavailable.");
            break;

          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;

          default:
            setLocationError("Couldn't determine your location.");
        }

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
  |--------------------------------------------------------------------------
  | Save address
  |--------------------------------------------------------------------------
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
      alert("This pincode is currently outside our delivery area.");
      return;
    }

    const duplicate = addresses.some((item) => {
      if (editingId && item.id === editingId) return false;

      return (
        (item.house || "").trim().toLowerCase() ===
          house.toLowerCase() &&
        (item.street || "").trim().toLowerCase() ===
          street.toLowerCase() &&
        (item.city || "").trim().toLowerCase() ===
          city.toLowerCase() &&
        (item.pincode || "") === pincode
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
      latitude:
        typeof cleanedForm.latitude === "number"
          ? cleanedForm.latitude
          : null,
      longitude:
        typeof cleanedForm.longitude === "number"
          ? cleanedForm.longitude
          : null,
      formattedAddress: cleanedForm.formattedAddress || "",
    };

    try {
      setSaving(true);

      /*
       * If this is the first address, automatically make it default.
       */
      const shouldBeDefault =
        addresses.length === 0 || addressData.isDefault;

      if (shouldBeDefault) {
        addressData.isDefault = true;

        await Promise.all(
          addresses
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
            )
        );
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
          {
            ...addressData,
            updatedAt: serverTimestamp(),
          }
        );

        setAddresses((previous) =>
          sortAddresses(
            previous.map((item) =>
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
          )
        );
      } else {
        const reference = await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          ),
          {
            ...addressData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        const newAddress = {
          id: reference.id,
          ...addressData,
        };

        setAddresses((previous) =>
          sortAddresses([
            ...previous.map((item) =>
              shouldBeDefault
                ? {
                    ...item,
                    isDefault: false,
                  }
                : item
            ),
            newAddress,
          ])
        );
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save address:", error);
      alert("Unable to save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Edit
  |--------------------------------------------------------------------------
  */

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
      latitude:
        typeof address.latitude === "number"
          ? address.latitude
          : null,
      longitude:
        typeof address.longitude === "number"
          ? address.longitude
          : null,
      formattedAddress: address.formattedAddress || "",
    });

    setSearchText(address.formattedAddress || "");

    setEditingId(address.id);
    setShowForm(true);
    setLocationError("");

    if (
      typeof address.latitude === "number" &&
      typeof address.longitude === "number"
    ) {
      setMapLocation(
        {
          lat: address.latitude,
          lng: address.longitude,
        },
        SELECTED_MAP_ZOOM
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  async function removeAddress(id) {
    if (!currentUser || deletingId) return;

    const address = addresses.find((item) => item.id === id);

    const confirmed = window.confirm(
      `Delete ${address?.type || "this"} address?`
    );

    if (!confirmed) return;

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

      const remaining = addresses.filter(
        (item) => item.id !== id
      );

      /*
       * If the deleted address was default, promote the most recent
       * remaining address.
       */
      if (
        address?.isDefault &&
        remaining.length > 0
      ) {
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
          }
        );

        remaining[0] = {
          ...nextDefault,
          isDefault: true,
        };
      }

      setAddresses(sortAddresses(remaining));
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert("Unable to delete this address.");
    } finally {
      setDeletingId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Default address
  |--------------------------------------------------------------------------
  */

  async function setDefaultAddress(id) {
    if (!currentUser) return;

    try {
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
            }
          )
        )
      );

      setAddresses((previous) =>
        sortAddresses(
          previous.map((item) => ({
            ...item,
            isDefault: item.id === id,
          }))
        )
      );
    } catch (error) {
      console.error("Failed to set default address:", error);
      alert("Unable to update your default address.");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Form state
  |--------------------------------------------------------------------------
  */

  function resetForm() {
    setCleanedForm({
      ...EMPTY_FORM,
      name: cleanedForm.name,
      phone: cleanedForm.phone,
    });

    setSearchText("");
    setSuggestions([]);
    setEditingId(null);
    setShowForm(false);
    setLocationError("");
    setDeliveryAvailable(null);
    setDeliveryInfo(null);

    /*
     * Return map to default area when starting fresh.
     */
    if (mapCenter) {
      setMapZoom(FALLBACK_MAP_ZOOM);
    }
  }

  function openNewAddress() {
    setEditingId(null);

    setCleanedForm({
      ...EMPTY_FORM,
      name: cleanedForm.name,
      phone: cleanedForm.phone,
    });

    setSearchText("");
    setSuggestions([]);
    setLocationError("");
    setDeliveryAvailable(null);
    setDeliveryInfo(null);

    setShowForm((previous) => !previous);

    if (mapCenter) {
      setMapLocation(mapCenter, FALLBACK_MAP_ZOOM);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Sorting / recent addresses
  |--------------------------------------------------------------------------
  */

  function sortAddresses(items) {
    return [...items].sort((a, b) => {
      if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
        return Number(b.isDefault) - Number(a.isDefault);
      }

      const aDate =
        a.updatedAt?.seconds ||
        a.createdAt?.seconds ||
        0;

      const bDate =
        b.updatedAt?.seconds ||
        b.createdAt?.seconds ||
        0;

      return bDate - aDate;
    });
  }

  const recentAddresses = useMemo(() => {
    return [...addresses]
      .sort((a, b) => {
        const aDate =
          a.updatedAt?.seconds ||
          a.createdAt?.seconds ||
          0;

        const bDate =
          b.updatedAt?.seconds ||
          b.createdAt?.seconds ||
          0;

        return bDate - aDate;
      })
      .slice(0, 3);
  }, [addresses]);

  /*
  |--------------------------------------------------------------------------
  | Cleanup
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

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
              rgba(196,149,106,0.10),
              transparent 30%
            ),
            #FDFAF5;
          color: #1A0B05;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 28px 20px 70px;
        }

        .address-shell {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .address-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 28px;
        }

        .back-button {
          width: 46px;
          height: 46px;
          border: 1px solid #EEE6DE;
          border-radius: 50%;
          background: rgba(255,255,255,0.90);
          color: #1A0B05;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 8px 25px rgba(35,18,8,0.06);
          transition: 0.2s ease;
        }

        .back-button:hover {
          transform: translateX(-2px);
          background: #fff;
        }

        .header-copy {
          min-width: 0;
        }

        .eyebrow {
          margin: 0 0 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #C4956A;
        }

        .page-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(29px, 6vw, 40px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #1A0B05;
        }

        .page-subtitle {
          margin: 7px 0 0;
          color: #82766D;
          font-size: 14px;
        }

        .add-address-button {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 16px;
          background: #1A0B05;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 750;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(26,11,5,0.16);
          transition: 0.2s ease;
          margin-bottom: 22px;
        }

        .add-address-button:hover {
          transform: translateY(-1px);
          background: #2A150D;
        }

        .section-card {
          background: rgba(255,255,255,0.92);
          border: 1px solid #EEE6DE;
          border-radius: 22px;
          box-shadow: 0 14px 40px rgba(45,26,14,0.07);
          overflow: hidden;
        }

        .form-card {
          padding: 22px;
          margin-bottom: 24px;
        }

        .form-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .form-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          color: #1A0B05;
        }

        .form-caption {
          margin: 5px 0 0;
          color: #8A7C72;
          font-size: 13px;
          line-height: 1.5;
        }

        .close-form {
          width: 36px;
          height: 36px;
          border: 1px solid #EEE6DE;
          border-radius: 50%;
          background: #FDFAF5;
          color: #5B4A3F;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .location-button {
          width: 100%;
          min-height: 48px;
          border: 1px solid #1A0B05;
          border-radius: 13px;
          background: #1A0B05;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 12px;
        }

        .location-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .search-wrapper {
          position: relative;
          margin-bottom: 14px;
        }

        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #9B8B80;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 50px;
          padding: 0 15px 0 45px;
          border: 1px solid #E6DDD5;
          border-radius: 13px;
          background: #FCFAF7;
          color: #1A0B05;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }

        .search-input:focus,
        .field-input:focus,
        .field-select:focus {
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,0.12);
        }

        .suggestions {
          position: absolute;
          z-index: 30;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #E9E0D8;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(30,17,9,0.14);
        }

        .suggestion {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #F0EAE4;
          background: #fff;
          padding: 13px 15px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          color: #44362F;
          font-size: 13px;
          line-height: 1.4;
        }

        .suggestion:last-child {
          border-bottom: 0;
        }

        .suggestion:hover {
          background: #FCF8F3;
        }

        .suggestion-icon {
          color: #C4956A;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .map-section {
          margin: 16px 0 22px;
        }

        .map-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .map-title {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: #1A0B05;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .map-hint {
          margin: 0;
          color: #93857B;
          font-size: 11px;
        }

        .map-container {
          position: relative;
          width: 100%;
          height: 300px;
          border-radius: 18px;
          overflow: hidden;
          background:
            linear-gradient(135deg, #EEE8E1, #F8F5F1);
          border: 1px solid #E9E0D8;
        }

        #brewed-address-map {
          width: 100%;
          height: 100%;
        }

        .map-loading {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          background: #F6F2ED;
          color: #7D6E63;
          font-size: 13px;
        }

        .map-error {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
          background: #F8F4EF;
          color: #7D4036;
          font-size: 13px;
          line-height: 1.6;
        }

        .map-selected {
          margin-top: 9px;
          padding: 10px 12px;
          border-radius: 11px;
          background: #F9F5F0;
          color: #76675D;
          font-size: 12px;
          line-height: 1.5;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .map-selected svg {
          color: #C4956A;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .field-group {
          min-width: 0;
        }

        .field-group.full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: block;
          margin-bottom: 7px;
          color: #5D4D43;
          font-size: 12px;
          font-weight: 750;
        }

        .required {
          color: #B76D51;
        }

        .field-input,
        .field-select {
          width: 100%;
          height: 48px;
          padding: 0 13px;
          border: 1px solid #E6DDD5;
          border-radius: 12px;
          background: #fff;
          color: #1A0B05;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }

        .field-select {
          cursor: pointer;
        }

        .delivery-status {
          margin-top: 14px;
          padding: 12px 13px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 700;
        }

        .delivery-success {
          background: #F1F8F0;
          color: #3F7040;
          border: 1px solid #DCEED9;
        }

        .delivery-error {
          background: #FFF3F0;
          color: #9B493A;
          border: 1px solid #F3DDD8;
        }

        .delivery-checking {
          background: #F7F3EF;
          color: #76675D;
          border: 1px solid #EAE1D9;
        }

        .delivery-detail {
          display: block;
          margin-top: 3px;
          font-weight: 500;
          opacity: 0.85;
        }

        .save-button {
          width: 100%;
          min-height: 52px;
          margin-top: 20px;
          border: 0;
          border-radius: 14px;
          background: #1A0B05;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(26,11,5,0.14);
        }

        .save-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .error-message {
          margin: 10px 0 0;
          color: #A3473B;
          font-size: 12px;
        }

        .recent-section {
          margin: 28px 0;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .section-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 23px;
          color: #1A0B05;
        }

        .section-label {
          color: #A18F82;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .recent-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 11px;
        }

        .recent-card {
          min-width: 0;
          border: 1px solid #EDE4DC;
          background: #fff;
          border-radius: 15px;
          padding: 14px;
          cursor: pointer;
          text-align: left;
          transition: 0.2s ease;
        }

        .recent-card:hover {
          transform: translateY(-2px);
          border-color: #D7B99C;
          box-shadow: 0 10px 25px rgba(38,20,9,0.07);
        }

        .recent-top {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
        }

        .recent-type {
          font-size: 11px;
          font-weight: 800;
          color: #C4956A;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .recent-address {
          margin: 0;
          color: #5F5148;
          font-size: 12px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .addresses-section {
          margin-top: 30px;
        }

        .address-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .address-card {
          background: rgba(255,255,255,0.94);
          border: 1px solid #EEE6DE;
          border-radius: 19px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(40,22,11,0.06);
        }

        .address-card.default {
          border-color: rgba(196,149,106,0.55);
          box-shadow:
            0 10px 30px rgba(40,22,11,0.06),
            0 0 0 1px rgba(196,149,106,0.08);
        }

        .address-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .address-type {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .type-icon {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: #F8F2EC;
          color: #C4956A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .type-name {
          color: #1A0B05;
          font-size: 14px;
          font-weight: 800;
        }

        .default-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #C4956A;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .recent-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #F7F1EA;
          color: #8C6B4E;
          font-size: 10px;
          font-weight: 750;
        }

        .address-actions {
          display: flex;
          gap: 7px;
        }

        .icon-button {
          width: 36px;
          height: 36px;
          border: 1px solid #EEE5DD;
          border-radius: 50%;
          background: #FAF7F3;
          color: #59483D;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .icon-button:hover {
          background: #F3EAE1;
        }

        .icon-button.delete:hover {
          background: #FFF0ED;
          color: #A24C3D;
          border-color: #F0D4CE;
        }

        .address-content {
          margin-top: 16px;
        }

        .address-name {
          margin: 0;
          color: #1A0B05;
          font-size: 17px;
          font-weight: 800;
        }

        .address-phone {
          margin: 4px 0 11px;
          color: #8A7B71;
          font-size: 12px;
        }

        .address-line {
          margin: 3px 0;
          color: #51443C;
          font-size: 13px;
          line-height: 1.5;
        }

        .coordinate-line {
          margin-top: 8px;
          color: #A08E81;
          font-size: 10px;
          letter-spacing: 0.02em;
        }

        .default-action {
          width: 100%;
          min-height: 43px;
          margin-top: 16px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .default-action.active {
          border: 0;
          background: #C4956A;
          color: #fff;
        }

        .default-action.inactive {
          border: 1px solid #E5D8CD;
          background: #FCFAF7;
          color: #765F4E;
        }

        .default-action.inactive:hover {
          border-color: #C4956A;
          background: #FFF9F3;
        }

        .empty-state {
          margin-top: 25px;
          padding: 50px 24px;
          text-align: center;
          background: #fff;
          border: 1px solid #EEE6DE;
          border-radius: 22px;
          box-shadow: 0 12px 30px rgba(40,22,11,0.05);
        }

        .empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #F7EFE7;
          color: #C4956A;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }

        .empty-title {
          margin: 0 0 8px;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          color: #1A0B05;
        }

        .empty-text {
          max-width: 350px;
          margin: 0 auto;
          color: #83766D;
          font-size: 13px;
          line-height: 1.7;
        }

        .loading-state {
          padding: 45px 20px;
          text-align: center;
          color: #88796E;
          font-size: 13px;
        }

        .spinner {
          animation: address-spin 0.9s linear infinite;
        }

        @keyframes address-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .address-page {
            padding: 20px 15px 55px;
          }

          .field-grid {
            grid-template-columns: 1fr;
          }

          .field-group.full {
            grid-column: auto;
          }

          .recent-list {
            grid-template-columns: 1fr;
          }

          .recent-card {
            padding: 13px;
          }

          .map-container {
            height: 270px;
          }
        }

        @media (max-width: 480px) {
          .address-header {
            gap: 12px;
          }

          .back-button {
            width: 42px;
            height: 42px;
          }

          .page-subtitle {
            font-size: 12px;
          }

          .form-card {
            padding: 17px;
          }

          .address-card {
            padding: 15px;
          }

          .address-card-top {
            align-items: flex-start;
          }

          .address-actions {
            gap: 5px;
          }

          .icon-button {
            width: 34px;
            height: 34px;
          }

          .map-hint {
            display: none;
          }
        }
      `}</style>

      <main className="address-page">
        <div className="address-shell">

          {/* HEADER */}
          <header className="address-header">
            <button
              type="button"
              className="back-button"
              onClick={() => setPage("menu")}
              aria-label="Back to menu"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="header-copy">
              <p className="eyebrow">Delivery</p>
              <h1 className="page-title">My Addresses</h1>
              <p className="page-subtitle">
                Save your favourite delivery spots for a faster checkout.
              </p>
            </div>
          </header>

          {/* ADD */}
          <button
            type="button"
            className="add-address-button"
            onClick={openNewAddress}
          >
            <Plus size={19} />
            {showForm ? "Close Address Form" : "Add New Address"}
          </button>

          {/* FORM */}
          {showForm && (
            <section className="section-card form-card">
              <div className="form-heading">
                <div>
                  <h2 className="form-title">
                    {editingId ? "Edit Address" : "New Address"}
                  </h2>

                  <p className="form-caption">
                    Pin your exact delivery location so we can serve you accurately.
                  </p>
                </div>

                <button
                  type="button"
                  className="close-form"
                  onClick={resetForm}
                  aria-label="Close"
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
                  <Loader2 className="spinner" size={17} />
                ) : (
                  <LocateFixed size={17} />
                )}

                {locationLoading
                  ? "Finding your location..."
                  : "Use Current Location"}
              </button>

              {locationError && (
                <p className="error-message">
                  {locationError}
                </p>
              )}

              {/* SEARCH */}
              <div className="search-wrapper">
                <Search
                  className="search-icon"
                  size={18}
                />

                <input
                  className="search-input"
                  placeholder="Search your delivery address..."
                  value={searchText}
                  onChange={(event) =>
                    searchPlaces(event.target.value)
                  }
                  autoComplete="off"
                />

                {loadingSuggestions && (
                  <Loader2
                    className="spinner"
                    size={17}
                    style={{
                      position: "absolute",
                      right: 15,
                      top: 17,
                      color: "#C4956A",
                    }}
                  />
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
                          className="suggestion-icon"
                          size={16}
                        />

                        <span>
                          {place.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* MAP */}
              <div className="map-section">
                <div className="map-heading">
                  <h3 className="map-title">
                    <Map size={16} />
                    Pin your location
                  </h3>

                  <p className="map-hint">
                    Tap or drag the marker
                  </p>
                </div>

                <div className="map-container">
                  <div id="brewed-address-map" />

                  {mapLocationLoading && (
                    <div className="map-loading">
                      <Loader2
                        size={24}
                        className="spinner"
                      />
                      Loading delivery area...
                    </div>
                  )}

                  {!mapLocationLoading && mapError && (
                    <div className="map-error">
                      {mapError}
                    </div>
                  )}
                </div>

                {selectedLocation && (
                  <div className="map-selected">
                    <MapPin size={15} />

                    <span>
                      {mapAddressLoading
                        ? "Identifying selected location..."
                        : cleanedForm.formattedAddress ||
                          "Location selected on map"}
                    </span>
                  </div>
                )}
              </div>

              {/* FORM FIELDS */}
              <div className="field-grid">
                <div className="field-group">
                  <label className="field-label">
                    Full Name <span className="required">*</span>
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

                <div className="field-group">
                  <label className="field-label">
                    Phone Number <span className="required">*</span>
                  </label>

                  <input
                    className="field-input"
                    name="phone"
                    placeholder="10-digit mobile number"
                    value={cleanedForm.phone}
                    onChange={handleChange}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>

                <div className="field-group full">
                  <label className="field-label">
                    House / Flat Number <span className="required">*</span>
                  </label>

                  <input
                    className="field-input"
                    name="house"
                    placeholder="Flat, house, building number"
                    value={cleanedForm.house}
                    onChange={handleChange}
                    autoComplete="address-line1"
                  />
                </div>

                <div className="field-group full">
                  <label className="field-label">
                    Street / Area <span className="required">*</span>
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

                <div className="field-group">
                  <label className="field-label">
                    City <span className="required">*</span>
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

                <div className="field-group">
                  <label className="field-label">
                    State <span className="required">*</span>
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

                <div className="field-group">
                  <label className="field-label">
                    Pincode <span className="required">*</span>
                  </label>

                  <input
                    className="field-input"
                    name="pincode"
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
                    className="field-select"
                    name="type"
                    value={cleanedForm.type}
                    onChange={handleChange}
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* DELIVERY */}
              {checkingDelivery && (
                <div className="delivery-status delivery-checking">
                  <Loader2
                    size={16}
                    className="spinner"
                  />
                  Checking delivery availability...
                </div>
              )}

              {deliveryAvailable === true && (
                <div className="delivery-status delivery-success">
                  <Check size={16} />

                  <div>
                    Delivery available
                    {deliveryInfo && (
                      <span className="delivery-detail">
                        {typeof deliveryInfo === "string"
                          ? deliveryInfo
                          : deliveryInfo.message ||
                            deliveryInfo.zone ||
                            ""}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {deliveryAvailable === false && (
                <div className="delivery-status delivery-error">
                  <X size={16} />

                  <div>
                    Sorry, we don't deliver to this pincode yet.
                  </div>
                </div>
              )}

              {/* SAVE */}
              <button
                type="button"
                className="save-button"
                onClick={saveAddress}
                disabled={
                  saving ||
                  checkingDelivery ||
                  deliveryAvailable === false
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="spinner"
                    />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update Address"
                ) : (
                  "Save Address"
                )}
              </button>
            </section>
          )}

          {/* RECENT ADDRESSES */}
          {!loading && recentAddresses.length > 0 && (
            <section className="recent-section">
              <div className="section-heading">
                <div>
                  <p className="section-label">Quick access</p>
                  <h2 className="section-title">
                    Recent Addresses
                  </h2>
                </div>

                <Clock3
                  size={18}
                  color="#C4956A"
                />
              </div>

              <div className="recent-list">
                {recentAddresses.map((address) => (
                  <button
                    type="button"
                    className="recent-card"
                    key={address.id}
                    onClick={() => editAddress(address)}
                  >
                    <div className="recent-top">
                      {address.type === "Home" ? (
                        <Home size={14} color="#C4956A" />
                      ) : address.type === "Work" ? (
                        <Briefcase
                          size={14}
                          color="#C4956A"
                        />
                      ) : (
                        <MapPin
                          size={14}
                          color="#C4956A"
                        />
                      )}

                      <span className="recent-type">
                        {address.type}
                      </span>
                    </div>

                    <p className="recent-address">
                      {address.house}, {address.street},{" "}
                      {address.city}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* SAVED ADDRESSES */}
          <section className="addresses-section">
            <div className="section-heading">
              <div>
                <p className="section-label">
                  Your delivery locations
                </p>

                <h2 className="section-title">
                  Saved Addresses
                </h2>
              </div>

              {!loading && addresses.length > 0 && (
                <span className="section-label">
                  {addresses.length}{" "}
                  {addresses.length === 1
                    ? "address"
                    : "addresses"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                Loading your addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <MapPin size={31} />
                </div>

                <h2 className="empty-title">
                  No Saved Addresses
                </h2>

                <p className="empty-text">
                  Add your first delivery address and make
                  checkout faster next time.
                </p>
              </div>
            ) : (
              <div className="address-list">
                {addresses.map((address, index) => {
                  const isRecent =
                    recentAddresses.some(
                      (item) => item.id === address.id
                    );

                  return (
                    <article
                      className={`address-card ${
                        address.isDefault ? "default" : ""
                      }`}
                      key={address.id}
                    >
                      <div className="address-card-top">
                        <div className="address-type">
                          <div className="type-icon">
                            {address.type === "Home" ? (
                              <Home size={17} />
                            ) : address.type === "Work" ? (
                              <Briefcase size={17} />
                            ) : (
                              <MapPin size={17} />
                            )}
                          </div>

                          <span className="type-name">
                            {address.type}
                          </span>

                          {address.isDefault && (
                            <span className="default-badge">
                              <Star
                                size={11}
                                fill="currentColor"
                              />
                              Default
                            </span>
                          )}

                          {!address.isDefault &&
                            isRecent &&
                            index < 3 && (
                              <span className="recent-badge">
                                <Clock3 size={10} />
                                Recent
                              </span>
                            )}
                        </div>

                        <div className="address-actions">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              editAddress(address)
                            }
                            aria-label="Edit address"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="icon-button delete"
                            onClick={() =>
                              removeAddress(address.id)
                            }
                            disabled={
                              deletingId === address.id
                            }
                            aria-label="Delete address"
                          >
                            {deletingId === address.id ? (
                              <Loader2
                                size={15}
                                className="spinner"
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="address-content">
                        <h3 className="address-name">
                          {address.name}
                        </h3>

                        <p className="address-phone">
                          {address.phone}
                        </p>

                        <p className="address-line">
                          {address.house}, {address.street}
                        </p>

                        <p className="address-line">
                          {address.city}, {address.state}
                        </p>

                        <p className="address-line">
                          {address.pincode}
                        </p>

                        {typeof address.latitude ===
                          "number" &&
                          typeof address.longitude ===
                            "number" && (
                            <p className="coordinate-line">
                              Precise map location saved
                            </p>
                          )}
                      </div>

                      <button
                        type="button"
                        className={`default-action ${
                          address.isDefault
                            ? "active"
                            : "inactive"
                        }`}
                        onClick={() =>
                          !address.isDefault &&
                          setDefaultAddress(address.id)
                        }
                        disabled={address.isDefault}
                      >
                        {address.isDefault
                          ? "★ Default Address"
                          : "Set as Default"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
