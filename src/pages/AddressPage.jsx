import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { checkDelivery as checkDeliveryService } from "../service/deliveryService";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

const GOOGLE_API_KEY = "AIzaSyAZXXMZOvmUviZqgDoljAhSllaQLxelvfY";

const DEFAULT_CENTER = {
  lat: 22.5726,
  lng: 88.3639,
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

const ADDRESS_TYPES = [
  { value: "Home", label: "Home", icon: Home },
  { value: "Work", label: "Work", icon: BriefcaseBusiness },
  { value: "Other", label: "Other", icon: MapPin },
];

export default function AddressPage({ setPage }) {
  const { currentUser } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [defaultUpdatingId, setDefaultUpdatingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [autocompleteService, setAutocompleteService] = useState(null);
  const [placesService, setPlacesService] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  const [formError, setFormError] = useState("");

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteTimerRef = useRef(null);
  const searchContainerRef = useRef(null);

  /*
   * ------------------------------------------------------------
   * LOAD ADDRESSES
   * ------------------------------------------------------------
   */

  const loadAddresses = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      const addressesRef = collection(
        db,
        "users",
        currentUser.uid,
        "addresses"
      );

      const snap = await getDocs(addressesRef);

      const data = snap.docs.map((addressDoc) => ({
        id: addressDoc.id,
        ...addressDoc.data(),
      }));

      data.sort((a, b) => {
        if (Boolean(a.isDefault) !== Boolean(b.isDefault)) {
          return Number(b.isDefault) - Number(a.isDefault);
        }

        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    loadAddresses();
  }, [currentUser, loadAddresses]);

  /*
   * ------------------------------------------------------------
   * LOAD PROFILE DETAILS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!currentUser) return;

    async function loadUserDetails() {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        setForm((previous) => ({
          ...previous,
          name: userData.fullName || previous.name || "",
          phone: userData.phone || previous.phone || "",
        }));
      } catch (error) {
        console.error("Failed to load user details:", error);
      }
    }

    loadUserDetails();
  }, [currentUser]);

  /*
   * ------------------------------------------------------------
   * GOOGLE MAPS
   * ------------------------------------------------------------
   */

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
        setGoogleError("");
      } catch (error) {
        console.error("Google Maps initialization failed:", error);

        if (!cancelled) {
          setGoogleError(
            "Unable to load Google Maps right now. You can still enter your address manually."
          );
        }
      }
    }

    initializeGoogle();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleReady || !window.google?.maps?.places) return;

    try {
      setAutocompleteService(
        new window.google.maps.places.AutocompleteService()
      );
    } catch (error) {
      console.error("Autocomplete initialization failed:", error);
    }
  }, [googleReady]);

  /*
   * ------------------------------------------------------------
   * MAP
   * ------------------------------------------------------------
   */

  const getFormPosition = useCallback(() => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return {
        lat: latitude,
        lng: longitude,
      };
    }

    return DEFAULT_CENTER;
  }, [form.latitude, form.longitude]);

  const reverseGeocode = useCallback(
    async (latitude, longitude, preserveHouse = false) => {
      if (!window.google?.maps?.Geocoder) return;

      try {
        const geocoder = new window.google.maps.Geocoder();

        const response = await geocoder.geocode({
          location: {
            lat: latitude,
            lng: longitude,
          },
        });

        const result = response?.results?.[0];

        if (!result) {
          throw new Error("No address found for this location.");
        }

        const components = result.address_components || [];

        let house = preserveHouse ? form.house : "";
        let street = "";
        let city = "";
        let state = "";
        let pincode = "";

        components.forEach((component) => {
          const types = component.types || [];

          if (!house && types.includes("street_number")) {
            house = component.long_name;
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

        setForm((previous) => ({
          ...previous,
          house: house || previous.house,
          street: street || previous.street,
          city: city || previous.city,
          state: state || previous.state,
          pincode: pincode || previous.pincode,
          latitude,
          longitude,
        }));

        setSearchText(result.formatted_address || "");
        setSuggestions([]);
        setSearchOpen(false);

        if (pincode) {
          checkDelivery(pincode);
        }

        return result;
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        throw error;
      }
    },
    [form.house]
  );

  const initializeMap = useCallback(() => {
    if (!googleReady || !window.google?.maps) return;
    if (!showForm) return;

    const mapElement = document.getElementById("brewed-address-map");

    if (!mapElement) return;

    setMapLoading(true);
    setMapError("");

    try {
      const position = getFormPosition();

      const map = new window.google.maps.Map(mapElement, {
        center: position,
        zoom:
          form.latitude && form.longitude
            ? 17
            : 12,
        minZoom: 4,
        maxZoom: 20,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "greedy",
      });

      mapRef.current = map;

      const marker = new window.google.maps.Marker({
        position,
        map,
        draggable: true,
        title: "Delivery location",
      });

      markerRef.current = marker;

      marker.addListener("dragend", async () => {
        const markerPosition = marker.getPosition();

        if (!markerPosition) return;

        const latitude = markerPosition.lat();
        const longitude = markerPosition.lng();

        setForm((previous) => ({
          ...previous,
          latitude,
          longitude,
        }));

        try {
          setMapLoading(true);
          await reverseGeocode(latitude, longitude);
        } catch {
          setMapError(
            "Location moved, but we couldn't read the address automatically."
          );
        } finally {
          setMapLoading(false);
        }
      });

      map.addListener("click", async (event) => {
        if (!event.latLng) return;

        const latitude = event.latLng.lat();
        const longitude = event.latLng.lng();

        marker.setPosition({
          lat: latitude,
          lng: longitude,
        });

        setForm((previous) => ({
          ...previous,
          latitude,
          longitude,
        }));

        try {
          setMapLoading(true);
          await reverseGeocode(latitude, longitude);
        } catch {
          setMapError(
            "Location selected, but we couldn't read the address automatically."
          );
        } finally {
          setMapLoading(false);
        }
      });

      try {
        setPlacesService(
          new window.google.maps.places.PlacesService(map)
        );
      } catch (error) {
        console.error("Places service initialization failed:", error);
      }

      setMapLoading(false);
    } catch (error) {
      console.error("Map initialization failed:", error);
      setMapError("Unable to load the interactive map.");
      setMapLoading(false);
    }
  }, [
    form.latitude,
    form.longitude,
    getFormPosition,
    googleReady,
    reverseGeocode,
    showForm,
  ]);

  useEffect(() => {
    if (!showForm || !googleReady) return;

    const timer = window.setTimeout(() => {
      initializeMap();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [showForm, googleReady, initializeMap]);

  /*
   * ------------------------------------------------------------
   * DELIVERY CHECK
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
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
    } finally {
      setCheckingDelivery(false);
    }
  }, []);

  useEffect(() => {
    if (form.pincode.length !== 6) {
      setDeliveryAvailable(null);
      setDeliveryInfo(null);
      return;
    }

    const timer = window.setTimeout(() => {
      checkDelivery(form.pincode);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.pincode, checkDelivery]);

  /*
   * ------------------------------------------------------------
   * FORM
   * ------------------------------------------------------------
   */

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "phone" || name === "pincode") {
      value = value.replace(/\D/g, "");
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (formError) setFormError("");
  };

  const resetForm = useCallback(() => {
    setForm((previous) => ({
      ...emptyForm,
      name: previous.name || "",
      phone: previous.phone || "",
    }));

    setSearchText("");
    setSuggestions([]);
    setSearchOpen(false);
    setEditingId(null);
    setFormError("");
    setLocationError("");
    setMapError("");
    setDeliveryAvailable(null);
    setDeliveryInfo(null);
  }, []);

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  const editAddress = (address) => {
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
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
    });

    setEditingId(address.id);
    setShowForm(true);
    setSearchText(address.formattedAddress || "");
    setFormError("");
    setLocationError("");
    setMapError("");

    if (address.pincode) {
      checkDelivery(address.pincode);
    }
  };

  /*
   * ------------------------------------------------------------
   * GOOGLE SEARCH
   * ------------------------------------------------------------
   */

  const searchPlaces = (value) => {
    setSearchText(value);
    setSearchOpen(true);

    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }

    if (!autocompleteService || value.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);

    autocompleteTimerRef.current = window.setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: value.trim(),
          componentRestrictions: {
            country: "in",
          },
          types: ["address"],
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
  };

  const selectSuggestion = (prediction) => {
    if (!placesService) return;

    setSearchText(prediction.description);
    setSuggestions([]);
    setSearchOpen(false);
    setMapLoading(true);

    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          "address_components",
          "formatted_address",
          "geometry",
          "name",
        ],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place
        ) {
          setMapLoading(false);
          setMapError("Unable to load this location.");
          return;
        }

        const location = place.geometry?.location;

        if (!location) {
          setMapLoading(false);
          setMapError("This location doesn't have a usable map position.");
          return;
        }

        const latitude = location.lat();
        const longitude = location.lng();

        const components = place.address_components || [];

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

        setForm((previous) => ({
          ...previous,
          house: house || previous.house,
          street: street || previous.street,
          city: city || previous.city,
          state: state || previous.state,
          pincode: pincode || previous.pincode,
          latitude,
          longitude,
        }));

        setSearchText(place.formatted_address || prediction.description);

        if (mapRef.current) {
          mapRef.current.panTo({
            lat: latitude,
            lng: longitude,
          });

          mapRef.current.setZoom(17);
        }

        if (markerRef.current) {
          markerRef.current.setPosition({
            lat: latitude,
            lng: longitude,
          });
        }

        if (pincode) {
          checkDelivery(pincode);
        }

        setMapLoading(false);
      }
    );
  };

  /*
   * ------------------------------------------------------------
   * CURRENT LOCATION
   * ------------------------------------------------------------
   */

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Your device doesn't support location services."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    setMapError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setForm((previous) => ({
          ...previous,
          latitude,
          longitude,
        }));

        if (mapRef.current) {
          mapRef.current.panTo({
            lat: latitude,
            lng: longitude,
          });

          mapRef.current.setZoom(17);
        }

        if (markerRef.current) {
          markerRef.current.setPosition({
            lat: latitude,
            lng: longitude,
          });
        }

        try {
          await reverseGeocode(latitude, longitude);
        } catch (error) {
          console.error(error);
          setLocationError(
            "We found your location, but couldn't convert it into an address."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let message = "Couldn't get your current location.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access and try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Your current location is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
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

  /*
   * ------------------------------------------------------------
   * SAVE ADDRESS
   * ------------------------------------------------------------
   */

  const validateForm = () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const house = form.house.trim();
    const street = form.street.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pincode = form.pincode.trim();

    if (!name) return "Please enter your full name.";

    if (!/^\d{10}$/.test(phone)) {
      return "Phone number must be exactly 10 digits.";
    }

    if (!house) return "Please enter your house or flat number.";
    if (!street) return "Please enter your street or area.";
    if (!city) return "Please enter your city.";
    if (!state) return "Please enter your state.";

    if (!/^\d{6}$/.test(pincode)) {
      return "Pincode must be exactly 6 digits.";
    }

    if (deliveryAvailable === false) {
      return "This pincode is currently outside our delivery area.";
    }

    return "";
  };

  const saveAddress = async () => {
    if (!currentUser || saving) return;

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const addressesRef = collection(
        db,
        "users",
        currentUser.uid,
        "addresses"
      );

      const normalizedHouse = form.house.trim().toLowerCase();
      const normalizedStreet = form.street.trim().toLowerCase();
      const normalizedCity = form.city.trim().toLowerCase();
      const normalizedPincode = form.pincode.trim();

      const duplicate = addresses.find((address) => {
        if (address.id === editingId) return false;

        return (
          (address.house || "").trim().toLowerCase() === normalizedHouse &&
          (address.street || "").trim().toLowerCase() ===
            normalizedStreet &&
          (address.city || "").trim().toLowerCase() === normalizedCity &&
          (address.pincode || "").trim() === normalizedPincode
        );
      });

      if (duplicate) {
        setFormError("This address is already saved.");
        setSaving(false);
        return;
      }

      const hasExistingDefault = addresses.some(
        (address) =>
          address.isDefault && address.id !== editingId
      );

      const shouldBeDefault =
        Boolean(form.isDefault) || addresses.length === 0;

      const addressData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        house: form.house.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        type: form.type || "Home",
        isDefault: shouldBeDefault,
        latitude:
          Number.isFinite(Number(form.latitude))
            ? Number(form.latitude)
            : null,
        longitude:
          Number.isFinite(Number(form.longitude))
            ? Number(form.longitude)
            : null,
        formattedAddress:
          searchText.trim() ||
          [
            form.house.trim(),
            form.street.trim(),
            form.city.trim(),
            form.state.trim(),
            form.pincode.trim(),
          ]
            .filter(Boolean)
            .join(", "),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);

      if (shouldBeDefault) {
        addresses.forEach((address) => {
          if (address.isDefault && address.id !== editingId) {
            batch.update(
              doc(
                db,
                "users",
                currentUser.uid,
                "addresses",
                address.id
              ),
              {
                isDefault: false,
                updatedAt: serverTimestamp(),
              }
            );
          }
        });
      }

      if (editingId) {
        batch.update(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            editingId
          ),
          addressData
        );
      } else {
        const newRef = doc(addressesRef);

        batch.set(newRef, {
          ...addressData,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      await loadAddresses();

      setShowForm(false);
      resetForm();

      /*
       * If editing an existing default address and the user didn't
       * explicitly change default status, preserve it.
       */
      if (editingId && hasExistingDefault && !form.isDefault) {
        await setDefaultAddress(editingId);
      }
    } catch (error) {
      console.error("Failed to save address:", error);
      setFormError(
        "We couldn't save this address. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * DELETE
   * ------------------------------------------------------------
   */

  const removeAddress = async (id) => {
    if (!currentUser || deletingId) return;

    const address = addresses.find((item) => item.id === id);

    const confirmed = window.confirm(
      `Delete ${address?.type || "this"} address?`
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(db, "users", currentUser.uid, "addresses", id)
      );

      const remaining = addresses.filter((item) => item.id !== id);

      /*
       * If the deleted address was the default, automatically promote
       * the most recent remaining address.
       */
      if (address?.isDefault && remaining.length > 0) {
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

        remaining[0] = {
          ...nextDefault,
          isDefault: true,
        };
      }

      setAddresses(remaining);
    } catch (error) {
      console.error("Failed to delete address:", error);
      alert("Unable to delete this address. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * ------------------------------------------------------------
   * DEFAULT ADDRESS
   * ------------------------------------------------------------
   */

  const setDefaultAddress = async (id) => {
    if (!currentUser || defaultUpdatingId) return;

    const target = addresses.find((item) => item.id === id);

    if (!target || target.isDefault) return;

    setDefaultUpdatingId(id);

    try {
      const batch = writeBatch(db);

      addresses.forEach((address) => {
        const shouldBeDefault = address.id === id;

        if (Boolean(address.isDefault) !== shouldBeDefault) {
          batch.update(
            doc(
              db,
              "users",
              currentUser.uid,
              "addresses",
              address.id
            ),
            {
              isDefault: shouldBeDefault,
              updatedAt: serverTimestamp(),
            }
          );
        }
      });

      await batch.commit();

      setAddresses((previous) =>
        previous
          .map((address) => ({
            ...address,
            isDefault: address.id === id,
          }))
          .sort((a, b) => {
            if (
              Boolean(a.isDefault) !==
              Boolean(b.isDefault)
            ) {
              return Number(b.isDefault) - Number(a.isDefault);
            }

            return 0;
          })
      );
    } catch (error) {
      console.error("Failed to update default address:", error);
      alert(
        "Unable to change the default address. Please try again."
      );
    } finally {
      setDefaultUpdatingId(null);
    }
  };

  /*
   * ------------------------------------------------------------
   * RECENT ADDRESSES
   * ------------------------------------------------------------
   */

  const recentAddresses = useMemo(() => {
    return [...addresses]
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;
      })
      .slice(0, 3);
  }, [addresses]);

  /*
   * ------------------------------------------------------------
   * ADDRESS LABEL
   * ------------------------------------------------------------
   */

  const getAddressSummary = (address) => {
    return [
      address.house,
      address.street,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const getTypeIcon = (type) => {
    const item = ADDRESS_TYPES.find(
      (addressType) => addressType.value === type
    );

    return item?.icon || MapPin;
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
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
              circle at 90% 0%,
              rgba(196, 149, 106, 0.08),
              transparent 28%
            ),
            #fdfaf5;
          color: #1a0b05;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          padding: 30px 24px 70px;
        }

        .address-shell {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        .address-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 30px;
        }

        .address-back {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          margin-top: 2px;
          border: 1px solid rgba(26, 11, 5, 0.08);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.92);
          color: #1a0b05;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 7px 24px rgba(26, 11, 5, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .address-back:hover {
          transform: translateX(-2px);
          box-shadow: 0 10px 28px rgba(26, 11, 5, 0.1);
        }

        .address-eyebrow {
          display: block;
          margin-bottom: 7px;
          color: #c4956a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
        }

        .address-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(32px, 6vw, 42px);
          font-weight: 600;
          line-height: 1.04;
          letter-spacing: -0.025em;
          color: #1a0b05;
        }

        .address-subtitle {
          margin: 9px 0 0;
          color: #8b8179;
          font-size: 14px;
          line-height: 1.5;
        }

        .primary-add-button {
          width: 100%;
          min-height: 54px;
          border: 0;
          border-radius: 16px;
          background: #1a0b05;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(26, 11, 5, 0.16);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
          margin-bottom: 28px;
        }

        .primary-add-button:hover {
          transform: translateY(-1px);
          background: #28130b;
          box-shadow: 0 16px 34px rgba(26, 11, 5, 0.2);
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 13px;
        }

        .section-heading h2 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 21px;
          font-weight: 600;
          color: #1a0b05;
        }

        .section-heading span {
          color: #a0958d;
          font-size: 12px;
          font-weight: 600;
        }

        .recent-section {
          margin-bottom: 30px;
        }

        .recent-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .recent-card {
          min-width: 0;
          padding: 15px;
          border: 1px solid #eee5dc;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.78);
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .recent-card:hover {
          transform: translateY(-2px);
          border-color: rgba(196, 149, 106, 0.4);
          box-shadow: 0 12px 28px rgba(26, 11, 5, 0.07);
        }

        .recent-icon {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: #f8eee4;
          color: #c4956a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 11px;
        }

        .recent-type {
          display: block;
          color: #1a0b05;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .recent-address {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: #8b8179;
          font-size: 12px;
          line-height: 1.5;
        }

        .addresses-section {
          margin-top: 4px;
        }

        .address-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .address-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #eee6de;
          border-radius: 20px;
          padding: 19px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 8px 26px rgba(26, 11, 5, 0.055);
          transition:
            box-shadow 0.2s ease,
            transform 0.2s ease;
        }

        .address-card:hover {
          box-shadow: 0 14px 34px rgba(26, 11, 5, 0.08);
        }

        .address-card.default-card {
          border-color: rgba(196, 149, 106, 0.4);
          box-shadow:
            0 8px 26px rgba(26, 11, 5, 0.05),
            inset 0 0 0 1px rgba(196, 149, 106, 0.08);
        }

        .address-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .address-type {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .address-type-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #f8eee4;
          color: #c4956a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .address-type-name {
          display: block;
          color: #1a0b05;
          font-size: 14px;
          font-weight: 750;
        }

        .default-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          color: #a56e3d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .address-actions {
          display: flex;
          gap: 7px;
        }

        .circle-action {
          width: 36px;
          height: 36px;
          border: 1px solid #eee7e0;
          border-radius: 50%;
          background: #fbf8f4;
          color: #5f554e;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .circle-action:hover {
          background: #f5ece3;
          color: #1a0b05;
          border-color: #e6d4c3;
        }

        .circle-action.danger:hover {
          background: #fff1ee;
          color: #b34c3b;
          border-color: #f1c9c2;
        }

        .address-details {
          margin-top: 17px;
          padding-top: 16px;
          border-top: 1px solid #f1ebe5;
        }

        .address-name {
          margin: 0;
          color: #1a0b05;
          font-size: 16px;
          font-weight: 750;
        }

        .address-phone {
          margin: 4px 0 10px;
          color: #91877f;
          font-size: 12px;
        }

        .address-text {
          margin: 0;
          color: #544b45;
          font-size: 13px;
          line-height: 1.65;
        }

        .default-button {
          width: 100%;
          min-height: 42px;
          margin-top: 16px;
          border: 1px solid #e7ddd4;
          border-radius: 12px;
          background: #fcfaf7;
          color: #675c54;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .default-button:hover:not(:disabled) {
          border-color: #c4956a;
          color: #a56e3d;
          background: #fffaf5;
        }

        .default-button.is-default {
          border-color: #c4956a;
          background: #c4956a;
          color: white;
          cursor: default;
        }

        .default-button:disabled {
          opacity: 0.8;
          cursor: default;
        }

        .empty-state {
          padding: 55px 25px;
          border: 1px solid #eee5dc;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.78);
          text-align: center;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          border-radius: 20px;
          background: #f8eee4;
          color: #c4956a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state h2 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          font-weight: 600;
        }

        .empty-state p {
          max-width: 350px;
          margin: 9px auto 0;
          color: #91877f;
          font-size: 13px;
          line-height: 1.6;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 55px 0;
          color: #8d827a;
          font-size: 13px;
        }

        .form-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(20, 9, 5, 0.48);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
        }

        .address-form-panel {
          width: 100%;
          max-width: 720px;
          max-height: 94vh;
          overflow-y: auto;
          background: #fdfaf6;
          border-radius: 28px 28px 0 0;
          padding: 25px;
          box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.2);
          animation: addressSheetIn 0.25s ease-out;
        }

        @keyframes addressSheetIn {
          from {
            transform: translateY(25px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .form-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 22px;
        }

        .form-eyebrow {
          margin-bottom: 5px;
          color: #c4956a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .form-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 27px;
          font-weight: 600;
        }

        .close-form {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border: 1px solid #e9e1da;
          border-radius: 50%;
          background: white;
          color: #544a43;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .location-button {
          width: 100%;
          min-height: 50px;
          border: 1px solid #dcc8b7;
          border-radius: 14px;
          background: #fffaf5;
          color: #7f5536;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 14px;
        }

        .location-button:hover {
          background: #f9eee4;
          border-color: #c4956a;
        }

        .location-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .location-error,
        .form-error,
        .map-error {
          padding: 11px 13px;
          border-radius: 12px;
          background: #fff1ee;
          color: #a84c3d;
          font-size: 12px;
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .form-error {
          margin-top: 15px;
        }

        .search-wrapper {
          position: relative;
          margin-bottom: 15px;
        }

        .search-input-wrap {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #a1968e;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 50px;
          padding: 0 44px;
          border: 1px solid #e4dbd3;
          border-radius: 14px;
          background: white;
          color: #1a0b05;
          outline: none;
          font-size: 13px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-input:focus {
          border-color: #c4956a;
          box-shadow: 0 0 0 4px rgba(196, 149, 106, 0.1);
        }

        .search-clear {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          width: 29px;
          height: 29px;
          border: 0;
          border-radius: 50%;
          background: #f5f1ed;
          color: #756a62;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .suggestions {
          position: absolute;
          z-index: 20;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          overflow: hidden;
          border: 1px solid #e8dfd7;
          border-radius: 15px;
          background: white;
          box-shadow: 0 18px 40px rgba(26, 11, 5, 0.13);
        }

        .suggestion {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #f1ebe6;
          background: white;
          padding: 13px 15px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          color: #514840;
          font-size: 12px;
          line-height: 1.5;
          cursor: pointer;
        }

        .suggestion:last-child {
          border-bottom: 0;
        }

        .suggestion:hover {
          background: #fcf8f3;
        }

        .suggestion-icon {
          flex: 0 0 auto;
          margin-top: 1px;
          color: #c4956a;
        }

        .map-section {
          overflow: hidden;
          border: 1px solid #e5ddd5;
          border-radius: 18px;
          background: white;
          margin-bottom: 18px;
        }

        .map-header {
          min-height: 46px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #eee8e2;
        }

        .map-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .map-header-left span {
          color: #433a34;
          font-size: 12px;
          font-weight: 750;
        }

        .map-help {
          color: #9b9189;
          font-size: 10px;
          text-align: right;
        }

        .map-container {
          position: relative;
          width: 100%;
          height: 250px;
          background: #eee9e4;
        }

        .map {
          width: 100%;
          height: 100%;
        }

        .map-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(253, 250, 246, 0.75);
          backdrop-filter: blur(2px);
          color: #7d7168;
          font-size: 12px;
          gap: 8px;
          pointer-events: none;
        }

        .form-section {
          margin-top: 22px;
        }

        .form-section-title {
          margin: 0 0 12px;
          color: #1a0b05;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field {
          min-width: 0;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field-label {
          display: block;
          margin: 0 0 6px 2px;
          color: #746961;
          font-size: 11px;
          font-weight: 700;
        }

        .field-input {
          width: 100%;
          height: 48px;
          padding: 0 13px;
          border: 1px solid #e3dad2;
          border-radius: 13px;
          background: white;
          color: #1a0b05;
          outline: none;
          font-size: 13px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .field-input::placeholder {
          color: #b1a8a1;
        }

        .field-input:focus {
          border-color: #c4956a;
          box-shadow: 0 0 0 4px rgba(196, 149, 106, 0.09);
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .type-option {
          min-height: 48px;
          border: 1px solid #e5ddd6;
          border-radius: 13px;
          background: white;
          color: #6f655e;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .type-option:hover {
          border-color: #d2b59c;
        }

        .type-option.active {
          border-color: #c4956a;
          background: #fff7ef;
          color: #9a653a;
          box-shadow: inset 0 0 0 1px rgba(196, 149, 106, 0.1);
        }

        .delivery-status {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px;
          margin-top: 14px;
          border-radius: 14px;
          font-size: 12px;
          line-height: 1.5;
        }

        .delivery-status.available {
          background: #f0f8f1;
          color: #3d7045;
        }

        .delivery-status.unavailable {
          background: #fff1ee;
          color: #a84c3d;
        }

        .delivery-status.checking {
          background: #f6f2ed;
          color: #7c7067;
        }

        .save-button {
          width: 100%;
          min-height: 54px;
          margin-top: 23px;
          border: 0;
          border-radius: 15px;
          background: #1a0b05;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(26, 11, 5, 0.16);
          transition: all 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          background: #29140b;
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .secondary-button {
          width: 100%;
          min-height: 48px;
          margin-top: 9px;
          border: 0;
          background: transparent;
          color: #776b63;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .spinner {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (min-width: 760px) {
          .address-page {
            padding: 48px 30px 90px;
          }

          .form-overlay {
            align-items: center;
            padding: 30px;
          }

          .address-form-panel {
            max-height: 90vh;
            border-radius: 28px;
          }
        }

        @media (max-width: 650px) {
          .recent-grid {
            grid-template-columns: 1fr;
          }

          .recent-card {
            display: grid;
            grid-template-columns: auto 1fr;
            column-gap: 11px;
          }

          .recent-icon {
            grid-row: span 2;
            margin-bottom: 0;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }
        }

        @media (max-width: 520px) {
          .address-page {
            padding: 23px 16px 55px;
          }

          .address-header {
            gap: 12px;
            margin-bottom: 24px;
          }

          .address-back {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
          }

          .address-title {
            font-size: 31px;
          }

          .address-subtitle {
            font-size: 12px;
          }

          .address-card {
            padding: 16px;
          }

          .address-form-panel {
            padding: 20px 16px 26px;
          }

          .map-container {
            height: 220px;
          }

          .map-help {
            display: none;
          }

          .address-actions {
            gap: 5px;
          }

          .circle-action {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>

      <main className="address-page">
        <div className="address-shell">
          {/* HEADER */}
          <header className="address-header">
            <button
              type="button"
              className="address-back"
              onClick={() => setPage("menu")}
              aria-label="Back to menu"
            >
              <ArrowLeft size={19} strokeWidth={2} />
            </button>

            <div>
              <span className="address-eyebrow">DELIVERY</span>

              <h1 className="address-title">
                My Addresses
              </h1>

              <p className="address-subtitle">
                Where should we bring your Brewed order?
              </p>
            </div>
          </header>

          {/* ADD BUTTON */}
          <button
            type="button"
            className="primary-add-button"
            onClick={openAddForm}
          >
            <Plus size={18} strokeWidth={2.2} />
            Add New Address
          </button>

          {/* RECENT ADDRESSES */}
          {!loading && recentAddresses.length > 0 && (
            <section className="recent-section">
              <div className="section-heading">
                <h2>Recent addresses</h2>
                <span>
                  {addresses.length} saved
                </span>
              </div>

              <div className="recent-grid">
                {recentAddresses.map((address) => {
                  const TypeIcon = getTypeIcon(address.type);

                  return (
                    <button
                      type="button"
                      key={address.id}
                      className="recent-card"
                      onClick={() => editAddress(address)}
                    >
                      <div className="recent-icon">
                        <TypeIcon size={16} />
                      </div>

                      <span className="recent-type">
                        {address.type || "Address"}
                      </span>

                      <span className="recent-address">
                        {getAddressSummary(address)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* SAVED ADDRESSES */}
          <section className="addresses-section">
            <div className="section-heading">
              <h2>Saved addresses</h2>
            </div>

            {loading ? (
              <div className="loading-state">
                <Loader2
                  size={17}
                  className="spinner"
                />
                Loading your addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <MapPin size={29} strokeWidth={1.7} />
                </div>

                <h2>No saved addresses</h2>

                <p>
                  Save your delivery address once and make
                  every future Brewed order faster.
                </p>
              </div>
            ) : (
              <div className="address-list">
                {addresses.map((address) => {
                  const TypeIcon = getTypeIcon(address.type);

                  return (
                    <article
                      key={address.id}
                      className={`address-card ${
                        address.isDefault
                          ? "default-card"
                          : ""
                      }`}
                    >
                      <div className="address-card-top">
                        <div className="address-type">
                          <div className="address-type-icon">
                            <TypeIcon
                              size={18}
                              strokeWidth={1.8}
                            />
                          </div>

                          <div>
                            <span className="address-type-name">
                              {address.type || "Address"}
                            </span>

                            {address.isDefault && (
                              <span className="default-pill">
                                <Star
                                  size={11}
                                  fill="currentColor"
                                />
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="address-actions">
                          <button
                            type="button"
                            className="circle-action"
                            onClick={() =>
                              editAddress(address)
                            }
                            aria-label={`Edit ${address.type} address`}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="circle-action danger"
                            onClick={() =>
                              removeAddress(address.id)
                            }
                            disabled={
                              deletingId === address.id
                            }
                            aria-label={`Delete ${address.type} address`}
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

                      <div className="address-details">
                        <h3 className="address-name">
                          {address.name}
                        </h3>

                        <p className="address-phone">
                          {address.phone}
                        </p>

                        <p className="address-text">
                          {getAddressSummary(address)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`default-button ${
                          address.isDefault
                            ? "is-default"
                            : ""
                        }`}
                        disabled={
                          address.isDefault ||
                          defaultUpdatingId === address.id
                        }
                        onClick={() =>
                          setDefaultAddress(address.id)
                        }
                      >
                        {defaultUpdatingId === address.id ? (
                          <>
                            <Loader2
                              size={14}
                              className="spinner"
                              style={{
                                verticalAlign: "middle",
                                marginRight: 6,
                              }}
                            />
                            Updating...
                          </>
                        ) : address.isDefault ? (
                          "Default delivery address"
                        ) : (
                          "Set as default"
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ADDRESS FORM */}
      {showForm && (
        <div
          className="form-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeForm();
            }
          }}
        >
          <section
            className="address-form-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-form-title"
          >
            <div className="form-header">
              <div>
                <div className="form-eyebrow">
                  {editingId
                    ? "UPDATE ADDRESS"
                    : "NEW DELIVERY ADDRESS"}
                </div>

                <h2
                  id="address-form-title"
                  className="form-title"
                >
                  {editingId
                    ? "Edit your address"
                    : "Where should we deliver?"}
                </h2>
              </div>

              <button
                type="button"
                className="close-form"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close address form"
              >
                <X size={18} />
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
                <Loader2
                  size={17}
                  className="spinner"
                />
              ) : (
                <Navigation size={17} />
              )}

              {locationLoading
                ? "Finding your location..."
                : "Use my current location"}
            </button>

            {locationError && (
              <div className="location-error">
                {locationError}
              </div>
            )}

            {/* GOOGLE SEARCH */}
            <div
              className="search-wrapper"
              ref={searchContainerRef}
            >
              <div className="search-input-wrap">
                <Search
                  size={17}
                  className="search-icon"
                />

                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for your delivery address"
                  value={searchText}
                  onFocus={() => {
                    if (suggestions.length) {
                      setSearchOpen(true);
                    }
                  }}
                  onChange={(event) =>
                    searchPlaces(event.target.value)
                  }
                  autoComplete="off"
                  aria-label="Search delivery address"
                />

                {searchText && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setSearchText("");
                      setSuggestions([]);
                      setSearchOpen(false);
                    }}
                    aria-label="Clear address search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {searchOpen &&
                (suggestions.length > 0 ||
                  loadingSuggestions) && (
                  <div className="suggestions">
                    {loadingSuggestions ? (
                      <div className="suggestion">
                        <Loader2
                          size={15}
                          className="spinner suggestion-icon"
                        />
                        Searching addresses...
                      </div>
                    ) : (
                      suggestions.map((prediction) => (
                        <button
                          type="button"
                          className="suggestion"
                          key={prediction.place_id}
                          onClick={() =>
                            selectSuggestion(prediction)
                          }
                        >
                          <MapPin
                            size={16}
                            className="suggestion-icon"
                          />

                          <span>
                            {prediction.description}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
            </div>

            {/* MAP */}
            {googleReady && (
              <div className="map-section">
                <div className="map-header">
                  <div className="map-header-left">
                    <Crosshair size={15} color="#c4956a" />

                    <span>
                      Pin your delivery location
                    </span>
                  </div>

                  <span className="map-help">
                    Tap or drag the pin
                  </span>
                </div>

                <div className="map-container">
                  <div
                    id="brewed-address-map"
                    className="map"
                  />

                  {mapLoading && (
                    <div className="map-loading">
                      <Loader2
                        size={16}
                        className="spinner"
                      />
                      Updating location...
                    </div>
                  )}
                </div>
              </div>
            )}

            {googleError && (
              <div className="map-error">
                {googleError}
              </div>
            )}

            {mapError && (
              <div className="map-error">
                {mapError}
              </div>
            )}

            {/* CONTACT */}
            <div className="form-section">
              <h3 className="form-section-title">
                Contact details
              </h3>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">
                    Full name
                  </span>

                  <input
                    name="name"
                    type="text"
                    className="field-input"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    Phone number
                  </span>

                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="field-input"
                    placeholder="10-digit number"
                    value={form.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </label>
              </div>
            </div>

            {/* ADDRESS */}
            <div className="form-section">
              <h3 className="form-section-title">
                Address details
              </h3>

              <div className="form-grid">
                <label className="field">
                  <span className="field-label">
                    House / flat
                  </span>

                  <input
                    name="house"
                    type="text"
                    className="field-input"
                    placeholder="Flat 4B / House 12"
                    value={form.house}
                    onChange={handleChange}
                    autoComplete="address-line1"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    Street / area
                  </span>

                  <input
                    name="street"
                    type="text"
                    className="field-input"
                    placeholder="Street or locality"
                    value={form.street}
                    onChange={handleChange}
                    autoComplete="address-line2"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    City
                  </span>

                  <input
                    name="city"
                    type="text"
                    className="field-input"
                    placeholder="City"
                    value={form.city}
                    onChange={handleChange}
                    autoComplete="address-level2"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    State
                  </span>

                  <input
                    name="state"
                    type="text"
                    className="field-input"
                    placeholder="State"
                    value={form.state}
                    onChange={handleChange}
                    autoComplete="address-level1"
                  />
                </label>

                <label className="field">
                  <span className="field-label">
                    Pincode
                  </span>

                  <input
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="field-input"
                    placeholder="6-digit pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    autoComplete="postal-code"
                  />
                </label>

                <div className="field">
                  <span className="field-label">
                    Address type
                  </span>

                  <div className="type-selector">
                    {ADDRESS_TYPES.map((type) => {
                      const Icon = type.icon;
                      const active =
                        form.type === type.value;

                      return (
                        <button
                          type="button"
                          key={type.value}
                          className={`type-option ${
                            active ? "active" : ""
                          }`}
                          onClick={() =>
                            setForm((previous) => ({
                              ...previous,
                              type: type.value,
                            }))
                          }
                        >
                          <Icon size={15} />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DELIVERY STATUS */}
              {checkingDelivery && (
                <div className="delivery-status checking">
                  <Loader2
                    size={16}
                    className="spinner"
                  />

                  <span>
                    Checking delivery availability for
                    this pincode...
                  </span>
                </div>
              )}

              {!checkingDelivery &&
                deliveryAvailable === true && (
                  <div className="delivery-status available">
                    <Check size={17} />

                    <span>
                      Delivery is available at this
                      pincode.
                      {deliveryInfo?.message
                        ? ` ${deliveryInfo.message}`
                        : ""}
                    </span>
                  </div>
                )}

              {!checkingDelivery &&
                deliveryAvailable === false && (
                  <div className="delivery-status unavailable">
                    <X size={17} />

                    <span>
                      Sorry, we don't currently deliver
                      to this pincode.
                    </span>
                  </div>
                )}
            </div>

            {formError && (
              <div className="form-error">
                {formError}
              </div>
            )}

            <button
              type="button"
              className="save-button"
              onClick={saveAddress}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="spinner"
                  />
                  {editingId
                    ? "Updating address..."
                    : "Saving address..."}
                </>
              ) : (
                <>
                  <Check size={17} />
                  {editingId
                    ? "Update address"
                    : "Save address"}
                </>
              )}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
          </section>
        </div>
      )}
    </>
  );
}
