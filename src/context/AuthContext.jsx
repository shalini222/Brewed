import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    let unsubscribeUser;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserData(null);
        setLoading(false);

        if (unsubscribeUser) unsubscribeUser();
        return;
      }

      unsubscribeUser = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData(null);
          }

          setLoading(false);
        },
        (error) => {
          console.error(error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const role = userData?.role || "customer";

  const isOwner = role === "owner";

  const isAdmin =
    role === "owner" ||
    role === "admin";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        loading,
        role,
        isOwner,
        isAdmin,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
