const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const Razorpay = require("razorpay");

setGlobalOptions({
  maxInstances: 10,
});

const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

exports.createRazorpayOrder = onCall(
  {
    secrets: [razorpayKeyId, razorpayKeySecret],
  },
  async (request) => {
    try {
      // Require logged-in customer
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in to make a payment."
        );
      }

      const { amount } = request.data;

      // Amount must be sent in INR rupees from the frontend
      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new HttpsError(
          "invalid-argument",
          "A valid payment amount is required."
        );
      }

      // Convert rupees → paise
      const amountInPaise = Math.round(amount * 100);

      const razorpay = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value(),
      });

      const receipt = `brew_${Date.now()}`;

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt,
      });

      logger.info("Razorpay order created", {
        orderId: order.id,
        userId: request.auth.uid,
        amount: amount,
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId.value(),
      };
    } catch (error) {
      logger.error("Razorpay order creation failed", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Unable to create Razorpay order."
      );
    }
  }
);
