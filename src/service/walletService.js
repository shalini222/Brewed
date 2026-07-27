
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

import { db } from "../firebase";

export const TRANSACTION_TYPES = Object.freeze({
  ADD_MONEY: "ADD_MONEY",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  REWARD: "REWARD",
  ADMIN_CREDIT: "ADMIN_CREDIT",
  ADMIN_DEBIT: "ADMIN_DEBIT",
});

export const TRANSACTION_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
});

export function generateTransactionId() {
  return (
    "TXN-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}

const walletService = {};

export default walletService;
