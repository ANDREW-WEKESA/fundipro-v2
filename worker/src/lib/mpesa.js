/**
 * M-Pesa Daraja API Integration
 * Handles STK Push (Lipa Na M-Pesa Online) for customer payments
 */

const DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke"; // Change to https://api.safaricom.co.ke for production
const OAUTH_URL = `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
const STK_PUSH_URL = `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`;

/**
 * Get OAuth access token from Daraja API
 */
async function getAccessToken(env) {
  const consumerKey = env.MPESA_CONSUMER_KEY;
  const consumerSecret = env.MPESA_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa credentials not configured. Add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to environment.");
  }

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  console.log("Requesting M-Pesa OAuth token from:", OAUTH_URL);
  
  const response = await fetch(OAUTH_URL, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("M-Pesa OAuth failed:", response.status, error);
    throw new Error(`Failed to get M-Pesa access token (${response.status}): ${error}`);
  }

  const data = await response.json();
  console.log("M-Pesa OAuth successful, got access token");
  return data.access_token;
}

/**
 * Generate password for STK Push request
 * Format: Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(shortcode, passkey, timestamp) {
  const raw = `${shortcode}${passkey}${timestamp}`;
  return btoa(raw);
}

/**
 * Generate timestamp in format: YYYYMMDDHHmmss
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Format phone number to M-Pesa format (254XXXXXXXXX)
 */
function formatPhoneNumber(phone) {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-+]/g, '');
  
  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // If doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 * @param {Object} env - Cloudflare environment bindings
 * @param {string} phoneNumber - Customer phone number (07XXXXXXXX or 254XXXXXXXXX)
 * @param {number} amount - Amount to charge (KES)
 * @param {string} accountReference - Reference for the transaction
 * @param {string} transactionDesc - Description shown to customer
 * @param {string} callbackUrl - URL to receive payment confirmation
 * @returns {Promise<Object>} STK Push response
 */
export async function initiateSTKPush(env, phoneNumber, amount, accountReference, transactionDesc, callbackUrl) {
  try {
    const accessToken = await getAccessToken(env);
    const timestamp = getTimestamp();
    const shortcode = env.MPESA_SHORTCODE || env.MPESA_TILL_NUMBER; // Business Shortcode (same as Till Number for Till payments)
    const passkey = env.MPESA_PASSKEY; // Lipa Na M-Pesa Online Passkey from Daraja Portal
    
    if (!shortcode || !passkey) {
      throw new Error("M-Pesa shortcode and passkey not configured.");
    }

    const password = generatePassword(shortcode, passkey, timestamp);
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Use "CustomerPayBillOnline" for Paybill, "CustomerBuyGoodsOnline" for Till (sandbox may only support PayBill)
      Amount: Math.round(amount), // Must be integer
      PartyA: formattedPhone, // Customer phone
      PartyB: shortcode, // Business receiving payment
      PhoneNumber: formattedPhone, // Phone to receive STK prompt
      CallBackURL: callbackUrl,
      AccountReference: accountReference, // Invoice number, order ID, etc.
      TransactionDesc: transactionDesc, // Description customer sees
    };

    const response = await fetch(STK_PUSH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== "0") {
      throw new Error(data.errorMessage || data.ResponseDescription || "STK Push failed");
    }

    return {
      success: true,
      merchantRequestID: data.MerchantRequestID,
      checkoutRequestID: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
    };
  } catch (error) {
    console.error("STK Push error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process M-Pesa callback from Daraja API
 * Called when customer completes or cancels payment
 */
export function processCallback(callbackData) {
  const { Body } = callbackData;
  const { stkCallback } = Body;

  const result = {
    merchantRequestID: stkCallback.MerchantRequestID,
    checkoutRequestID: stkCallback.CheckoutRequestID,
    resultCode: stkCallback.ResultCode,
    resultDesc: stkCallback.ResultDesc,
  };

  // ResultCode 0 = success, anything else = failure
  if (stkCallback.ResultCode === 0) {
    // Extract payment details from CallbackMetadata
    const metadata = stkCallback.CallbackMetadata?.Item || [];
    
    result.success = true;
    result.amount = metadata.find(item => item.Name === "Amount")?.Value || 0;
    result.mpesaReceiptNumber = metadata.find(item => item.Name === "MpesaReceiptNumber")?.Value || "";
    result.transactionDate = metadata.find(item => item.Name === "TransactionDate")?.Value || "";
    result.phoneNumber = metadata.find(item => item.Name === "PhoneNumber")?.Value || "";
  } else {
    result.success = false;
    result.error = stkCallback.ResultDesc;
  }

  return result;
}

/**
 * Query STK Push transaction status
 * Use this to check payment status if callback fails
 */
export async function querySTKStatus(env, checkoutRequestID) {
  const accessToken = await getAccessToken(env);
  const timestamp = getTimestamp();
  const shortcode = env.MPESA_SHORTCODE || env.MPESA_TILL_NUMBER;
  const passkey = env.MPESA_PASSKEY;
  const password = generatePassword(shortcode, passkey, timestamp);

  const queryUrl = `${DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query`;
  
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestID,
  };

  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}
