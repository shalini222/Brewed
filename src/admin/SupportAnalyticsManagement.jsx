import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function SupportAnalyticsManagement() {
  const [tickets, setTickets] = useState([]);

  // Listen to live updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "supportTickets"),
      (snapshot) => {
        setTickets(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );
    return unsubscribe;
  }, []);

  // Calculate live statistics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const pendingTickets = tickets.filter((t) => t.status === "Pending").length;
  const closedTickets = tickets.filter((t) => t.status === "Closed").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;
  
  const resolutionRate =
    totalTickets === 0
      ? 0
      : Math.round(((closedTickets + resolvedTickets) / totalTickets) * 100);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Support Analytics Dashboard</h1>
    <h2>hi dude</h2>
    </div>
  );
}
