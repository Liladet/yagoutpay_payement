const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// YagoutPay Configuration
const YAGOUTPAY_CONFIG = {
  merchantId: process.env.MERCHANT_ID || "your_merchant_id",
  encryptionKey:
    process.env.ENCRYPTION_KEY || "your_base64_encoded_32_byte_key==",
  apiUrl:
    process.env.API_URL ||
    "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration",
  aggregatorId: "yagout",
  iv: "0123456789abcdef",
};

// Encryption function (AES-256-CBC)
function encryptYagoutPay(text, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, "base64");
    const iv = Buffer.from(YAGOUTPAY_CONFIG.iv);

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Decryption function
function decryptYagoutPay(encryptedBase64, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, "base64");
    const iv = Buffer.from(YAGOUTPAY_CONFIG.iv);
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Generate unique order number
function generateOrderNo() {
  return `ORD${Date.now()}${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`;
}

// Routes

// Home page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>YagoutPay Node.js Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>YagoutPay Payment Demo</h1>
      <form id="paymentForm">
        <div class="form-group">
          <label>Amount:</label>
          <input type="number" name="amount" value="1.00" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Email:</label>
          <input type="email" name="email" value="test@example.com" required>
        </div>
        <div class="form-group">
          <label>Phone:</label>
          <input type="tel" name="phone" value="0912345678" required>
        </div>
        <button type="submit">Pay with YagoutPay</button>
      </form>
      
      <script>
        document.getElementById('paymentForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData);
          
          try {
            const response = await fetch('/payment/initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
              // Redirect to YagoutPay or show payment page
              window.location.href = result.paymentUrl || '/payment/page?data=' + encodeURIComponent(result.encryptedData);
            } else {
              alert('Error: ' + result.message);
            }
          } catch (error) {
            alert('Payment initiation failed');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Initiate payment
app.post("/payment/initiate", async (req, res) => {
  try {
    const { amount, email, phone, name = "Test Customer" } = req.body;

    // Prepare payload
    const payload = {
      card_details: {
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        cardName: "",
      },
      other_details: {
        udf1: "",
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
        udf6: "",
        udf7: "",
      },
      ship_details: {
        shipAddress: "",
        shipCity: "",
        shipState: "",
        shipCountry: "",
        shipZip: "",
        shipDays: "",
        addressCount: "",
      },
      txn_details: {
        agId: YAGOUTPAY_CONFIG.aggregatorId,
        meId: YAGOUTPAY_CONFIG.merchantId,
        orderNo: generateOrderNo(),
        amount: amount.toString(),
        country: "ETH",
        currency: "ETB",
        transactionType: "SALE",
        successUrl: `${req.protocol}://${req.get("host")}/payment/success`,
        failureUrl: `${req.protocol}://${req.get("host")}/payment/failure`,
        channel: "API",
      },
      item_details: {
        itemCount: "",
        itemValue: "",
        itemCategory: "",
      },
      cust_details: {
        customerName: name,
        emailId: email,
        mobileNumber: phone,
        uniqueId: "",
        isLoggedIn: "Y",
      },
      pg_details: {
        pg_Id: "67ee846571e740418d688c3f",
        paymode: "WA",
        scheme_Id: "7",
        wallet_type: "telebirr",
      },
      bill_details: {
        billAddress: "",
        billCity: "",
        billState: "",
        billCountry: "",
        billZip: "",
      },
    };

    // Encrypt the payload
    const jsonStr = JSON.stringify(payload);
    const encryptedRequest = encryptYagoutPay(
      jsonStr,
      YAGOUTPAY_CONFIG.encryptionKey
    );

    // Prepare final request
    const requestBody = {
      merchantId: YAGOUTPAY_CONFIG.merchantId,
      merchantRequest: encryptedRequest,
    };

    // For demo purposes, we'll just return the encrypted data
    // In production, you would send this to YagoutPay API
    res.json({
      success: true,
      message: "Payment initiated successfully",
      encryptedData: encryptedRequest,
      paymentUrl: `${req.protocol}://${req.get(
        "host"
      )}/payment/page?data=${encodeURIComponent(encryptedRequest)}`,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Payment page (simulates YagoutPay payment page)
app.get("/payment/page", (req, res) => {
  const encryptedData = req.query.data;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>YagoutPay Payment</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .payment-box { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        button { background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
      </style>
    </head>
    <body>
      <div class="payment-box">
        <h2>YagoutPay Payment</h2>
        <p>Simulating YagoutPay payment page</p>
        <div>
          <button onclick="simulatePayment('success')">Simulate Successful Payment</button>
          <button onclick="simulatePayment('failure')" style="background: #dc3545;">Simulate Failed Payment</button>
        </div>
      </div>

      <script>
        function simulatePayment(status) {
          fetch('/payment/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status, data: '${encryptedData}' })
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              window.location.href = data.redirectUrl;
            }
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Simulate payment processing (for testing)
app.post("/payment/simulate", (req, res) => {
  const { status, data } = req.body;

  if (status === "success") {
    res.json({
      success: true,
      redirectUrl: "/payment/success",
    });
  } else {
    res.json({
      success: true,
      redirectUrl: "/payment/failure",
    });
  }
});

// Payment success callback
app.get("/payment/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #28a745; font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="success">✅ Payment Successful!</div>
      <p>Thank you for your payment.</p>
      <a href="/">Back to Home</a>
    </body>
    </html>
  `);
});

// Payment failure callback
app.get("/payment/failure", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; font-size: 24px; }
      </style>
    </head>
    <body>
      <div class="error">❌ Payment Failed</div>
      <p>Please try again or contact support.</p>
      <a href="/">Back to Home</a>
    </body>
    </html>
  `);
});

// YagoutPay API webhook (for real payments)
app.post("/payment/webhook", (req, res) => {
  try {
    const encryptedResponse = req.body.response;
    const decryptedData = decryptYagoutPay(
      encryptedResponse,
      YAGOUTPAY_CONFIG.encryptionKey
    );
    const responseData = JSON.parse(decryptedData);

    console.log("Webhook received:", responseData);

    // Process the payment response
    if (responseData.status === "Success") {
      // Update your database, send confirmation email, etc.
      console.log("Payment successful:", responseData);
    } else {
      console.log("Payment failed:", responseData);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error processing webhook");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 YagoutPay server running on http://localhost:${PORT}`);
  console.log(`💳 Merchant ID: ${YAGOUTPAY_CONFIG.merchantId}`);
});
