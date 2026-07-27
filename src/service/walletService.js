import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  arrayUnion,
} from "firebase/firestore";

import { db } from "../firebase.js";

export const TRANSACTION_TYPES = Object.freeze({
  ADD_MONEY: "ADD_MONEY",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  REWARD: "REWARD",
  REWARD_REDEEM: "REWARD_REDEEM",
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

export async function getWallet(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const walletRef = doc(db, "wallets", userId);
  const snapshot = await getDoc(walletRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function createWallet(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const walletRef = doc(db, "wallets", userId);
  const existingWallet = await getDoc(walletRef);

  if (existingWallet.exists()) {
    return {
      id: existingWallet.id,
      ...existingWallet.data(),
    };
  }

  const walletData = {
    balance: 0,
    rewardBalance: 0,
    moneyAdded: 0,
    moneySpent: 0,
    refunds: 0,
    transactionCount: 0,
    transactions: [],
    status: "Active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(walletRef, walletData);

  return {
    id: userId,
    ...walletData,
  };
}

export async function createTransaction({
  userId,
  type,
  amount,
  description = "",
  orderId = null,
  status = TRANSACTION_STATUS.SUCCESS,
  metadata = {},
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!type) {
    throw new Error("Transaction type is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const transaction = {
    transactionId: generateTransactionId(),
    userId,
    type,
    amount,
    description,
    orderId,
    status,
    metadata,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "walletTransactions"), transaction);

  return transaction;
}

export async function addMoney({
  userId,
  amount,
  description = "Wallet Top-up",
  paymentReference = null,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    transaction.update(walletRef, {
      balance: increment(amount),
      moneyAdded: increment(amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.ADD_MONEY,
    amount,
    description,
    metadata: {
      paymentReference,
    },
  });

  return true;
}

export async function deductMoney({
  userId,
  amount,
  orderId = null,
  description = "Wallet Payment",
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    const wallet = walletDoc.data();

    if ((wallet.status || "Active") !== "Active") {
      throw new Error("Wallet is not active.");
    }

    const currentBalance = Number(wallet.balance) || 0;

    if (currentBalance < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    transaction.update(walletRef, {
      balance: increment(-amount),
      moneySpent: increment(amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.PAYMENT,
    amount,
    orderId,
    description,
  });

  return true;
}

export async function refundMoney({
  userId,
  amount,
  orderId = null,
  description = "Order Refund",
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    transaction.update(walletRef, {
      balance: increment(amount),
      refunds: increment(amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.REFUND,
    amount,
    orderId,
    description,
    metadata: {
      refundType: "ORDER",
    },
  });

  return true;
}

export async function addReward({
  userId,
  amount,
  description = "Reward Credit",
  orderId = null,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    transaction.update(walletRef, {
      rewardBalance: increment(amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.REWARD,
    amount,
    orderId,
    description,
    metadata: {
      rewardType: "CASHBACK",
    },
  });

  return true;
}

export async function redeemReward({
  userId,
  amount,
  orderId = null,
  description = "Reward Redemption",
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    const wallet = walletDoc.data();
    const rewardBalance = Number(wallet.rewardBalance) || 0;

    if (rewardBalance < amount) {
      throw new Error("Insufficient reward balance.");
    }

    transaction.update(walletRef, {
      rewardBalance: increment(-amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.REWARD_REDEEM,
    amount,
    orderId,
    description,
    metadata: {
      redeemed: true,
    },
  });

  return true;
}

export async function adminCredit({
  userId,
  amount,
  reason,
  adminId = null,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!reason?.trim()) {
    throw new Error("Reason is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    transaction.update(walletRef, {
      balance: increment(amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.ADMIN_CREDIT,
    amount,
    description: reason,
    metadata: {
      adminId,
    },
  });

  return true;
}

export async function adminDebit({
  userId,
  amount,
  reason,
  adminId = null,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!reason?.trim()) {
    throw new Error("Reason is required.");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const walletRef = doc(db, "wallets", userId);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists()) {
      throw new Error("Wallet not found.");
    }

    const wallet = walletDoc.data();

    if ((Number(wallet.balance) || 0) < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    transaction.update(walletRef, {
      balance: increment(-amount),
      transactionCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  });

  await createTransaction({
    userId,
    type: TRANSACTION_TYPES.ADMIN_DEBIT,
    amount,
    description: reason,
    metadata: {
      adminId,
    },
  });

  return true;
}

const walletService = {
  getWallet,
  createWallet,
  createTransaction,
  addMoney,
  deductMoney,
  refundMoney,
  addReward,
  redeemReward,
  adminCredit,
  adminDebit,
};

export default walletService;
