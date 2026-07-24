import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Home,
  Briefcase,
  MapPin,
  Star
} from "lucide-react";

export default function AddressPage({ setPage }) {

  const { currentUser } = useAuth();

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
  };

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!currentUser) return;

    loadAddresses();
  }, [currentUser]);

  async function loadAddresses() {
    try {
      setLoading(true);

      const snap = await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "addresses"
        )
      );

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
      });

      setAddresses(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function saveAddress() {
    if (!currentUser) return;

    if (
      !form.name ||
      !form.phone ||
      !form.house ||
      !form.street ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      alert("Please fill all fields.");
      return;
    }

    try {
      if (editingId) {
        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            editingId
          ),
          form
        );

        setAddresses((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, ...form }
              : item
          )
        );
      } else {
        const ref = await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          ),
          {
            ...form,
            createdAt: serverTimestamp(),
          }
        );

        setAddresses((prev) => [
          ...prev,
          {
            id: ref.id,
            ...form,
          },
        ]);
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.log(err);
    }
  }

  function editAddress(address) {
    setForm(address);
    setEditingId(address.id);
    setShowForm(true);
  }

  async function removeAddress(id) {
    const ok = window.confirm(
      "Delete this address?"
    );

    if (!ok) return;

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
    } catch (err) {
      console.log(err);
    }
  }

  async function setDefault(id) {
    const updated = addresses.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));

    try {
      for (const item of updated) {
        await updateDoc(
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
        );
      }

      setAddresses(updated);
    } catch (err) {
      console.log(err);
    }
  }

  
