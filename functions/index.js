const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const Razorpay = require("razorpay");

setGlobalOptions({
  maxInstances: 10,
});

const razorpayKeyId = "rzp_test_TMzJBC3B2XTAoq";
const razorpayKeySecret = "Cs743CL6dgBo4QYf0PUFxlsC"; 

exports.createRazorpayOrder = onCall(
  {
    secrets: [razorpayKeyId, razorpayKeySecret],
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be logged in to make a payment."
        );
      }

      const { amount } = request.data;

      logger.info("Razorpay request received", {
        userId: request.auth.uid,
        amount,
        hasKeyId: !!razorpayKeyId.value(),
        hasKeySecret: !!razorpayKeySecret.value(),
      });

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

      const amountInPaise = Math.round(amount * 100);

      const razorpay = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value(),
      });

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `brew_${Date.now()}`,
      });

      logger.info("Razorpay order created successfully", {
        orderId: order.id,
        userId: request.auth.uid,
        amount,
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId.value(),
      };

    } catch (error) {

      logger.error("🔥 RAZORPAY FUNCTION FAILED", {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        description: error?.description,
        statusCode: error?.statusCode,
        stack: error?.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error?.message || "Unable to create Razorpay order."
      );
    }
  }
);
