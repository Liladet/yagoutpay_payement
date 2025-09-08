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

// Encryption function (AES-256-CBC) - Matches YagoutPay's PHP implementation
function encryptYagoutPay(text, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, "base64");
    const iv = Buffer.from(YAGOUTPAY_CONFIG.iv, "utf8");

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// Decryption function
function decryptYagoutPay(encryptedBase64, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, "base64");
    const iv = Buffer.from(YAGOUTPAY_CONFIG.iv, "utf8");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Generate unique order number
function generateOrderNo() {
  return `NODE${Date.now()}${Math.random()
    .toString(36)
    .substr(2, 5)
    .toUpperCase()}`;
}

// Simple storage for demo (use database in production)
const payments = new Map();

// Store payment attempt
function storePayment(orderId, amount, status, data) {
  payments.set(orderId, {
    orderId,
    amount,
    status,
    data,
    timestamp: new Date().toISOString(),
  });
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
        body { 
          font-family: Arial, sans-serif; 
          max-width: 600px; 
          margin: 50px auto; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container { 
          background: rgba(255, 255, 255, 0.1); 
          padding: 30px; 
          border-radius: 15px; 
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .form-group { 
          margin-bottom: 20px; 
        }
        label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: bold; 
          color: #fff;
        }
        input { 
          width: 100%; 
          padding: 12px; 
          border: none; 
          border-radius: 8px; 
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.9);
        }
        button { 
          background: #ff6b6b; 
          color: white; 
          padding: 15px 30px; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 18px;
          font-weight: bold;
          width: 100%;
          transition: background 0.3s;
        }
        button:hover {
          background: #ee5a52;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💳 YagoutPay Integration</h1>
        
        <form action="/payment/initiate" method="POST">
          <div class="form-group">
            <label>Amount (ETB):</label>
            <input type="number" name="amount" value="1.00" step="0.01" required>
          </div>
          
          <div class="form-group">
            <label>Customer Name:</label>
            <input type="text" name="name" value="Test Customer" required>
          </div>
          
          <div class="form-group">
            <label>Email:</label>
            <input type="email" name="email" value="test@example.com" required>
          </div>
          
          <div class="form-group">
            <label>Phone Number:</label>
            <input type="tel" name="phone" value="0912345678" required>
          </div>
          
          <button type="submit">🚀 Pay with YagoutPay</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Initiate payment
app.post("/payment/initiate", async (req, res) => {
  try {
    const { amount, name, email, phone } = req.body;

    // Generate unique order number
    const orderNo = generateOrderNo();

    // Prepare payload according to YagoutPay API specification
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
        orderNo: orderNo,
        amount: amount.toString(),
        country: "ETH",
        currency: "ETB",
        transactionType: "SALE",
        successUrl: `http://localhost:${PORT}/payment/success?order_id=${orderNo}`,
        failureUrl: `http://localhost:${PORT}/payment/failure?order_id=${orderNo}`,
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

    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Encrypt the payload
    const jsonStr = JSON.stringify(payload);
    const encryptedRequest = encryptYagoutPay(
      jsonStr,
      YAGOUTPAY_CONFIG.encryptionKey
    );

    // Prepare final request for YagoutPay API
    const requestBody = {
      merchantId: YAGOUTPAY_CONFIG.merchantId,
      merchantRequest: encryptedRequest,
    };

    console.log("Sending to YagoutPay API:", YAGOUTPAY_CONFIG.apiUrl);

    // Send to YagoutPay API
    const response = await axios.post(YAGOUTPAY_CONFIG.apiUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      // Bypass SSL verification for testing (remove in production)
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: false,
      }),
    });

    console.log("YagoutPay API response status:", response.status);
    console.log("YagoutPay API response data:", response.data);

    // Store payment attempt
    storePayment(orderNo, amount, "initiated", {
      request: requestBody,
      response: response.data,
    });

    // Handle YagoutPay response
    if (response.data.status === "Success") {
      // Decrypt the response
      const decryptedResponse = decryptYagoutPay(
        response.data.response,
        YAGOUTPAY_CONFIG.encryptionKey
      );
      const responseData = JSON.parse(decryptedResponse);

      // Update payment status
      storePayment(orderNo, amount, "success", responseData);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 50px; 
              text-align: center;
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: white;
            }
            .success { 
              color: #28a745; 
              font-size: 32px;
              margin-bottom: 20px;
            }
            .info {
              background: rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 10px;
              margin: 20px auto;
              max-width: 500px;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="success">✅ Payment Successful!</div>
          <div class="info">
            <p><strong>Order ID:</strong> ${responseData.orderNo || orderNo}</p>
            <p><strong>Amount:</strong> ${responseData.amount || amount} ETB</p>
            <p><strong>Status:</strong> ${
              responseData.status || "Completed"
            }</p>
          </div>
          <p><a href="/" style="color: white; text-decoration: underline;">Back to Demo</a></p>
        </body>
        </html>
      `);
    } else {
      // Update payment status
      storePayment(orderNo, amount, "failed", response.data);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Failed</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 50px; 
              text-align: center;
              background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
              color: white;
            }
            .error { 
              color: #dc3545; 
              font-size: 32px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="error">❌ Payment Failed</div>
          <p>Error: ${response.data.statusMessage || "Unknown error"}</p>
          <p><a href="/" style="color: white; text-decoration: underline;">Try Again</a></p>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error(
      "Payment initiation error:",
      error.response?.data || error.message
    );

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 50px; 
            text-align: center;
            background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
            color: #333;
          }
          .error { 
            color: #dc3545; 
            font-size: 32px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="error">❌ API Error</div>
        <p>${
          error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message
        }</p>
        <p><a href="/">Back to Demo</a></p>
      </body>
      </html>
    `);
  }
});

// Success callback endpoint
app.get("/payment/success", (req, res) => {
  const orderId = req.query.order_id;
  const payment = orderId ? getPayment(orderId) : null;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }
        .success { 
          color: #28a745; 
          font-size: 32px;
          margin-bottom: 20px;
        }
        .info {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 10px;
          margin: 20px auto;
          max-width: 500px;
          backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <div class="success">✅ Payment Successful!</div>
      ${
        payment
          ? `
        <div class="info">
          <p><strong>Order ID:</strong> ${payment.orderId}</p>
          <p><strong>Amount:</strong> ${payment.amount} ETB</p>
          <p><strong>Status:</strong> ${payment.status}</p>
        </div>
      `
          : ""
      }
      <p>Thank you for your payment.</p>
      <p><a href="/" style="color: white; text-decoration: underline;">Back to Home</a></p>
    </body>
    </html>
  `);
});

// Failure callback endpoint
app.get("/payment/failure", (req, res) => {
  const orderId = req.query.order_id;
  const payment = orderId ? getPayment(orderId) : null;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
          color: white;
        }
        .error { 
          color: #dc3545; 
          font-size: 32px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="error">❌ Payment Failed</div>
      ${
        payment
          ? `
        <p><strong>Order ID:</strong> ${payment.orderId}</p>
        <p><strong>Amount:</strong> ${payment.amount} ETB</p>
      `
          : ""
      }
      <p>Please try again or contact support.</p>
      <p><a href="/" style="color: white; text-decoration: underline;">Back to Home</a></p>
    </body>
    </html>
  `);
});

// Webhook endpoint for YagoutPay notifications
app.post("/payment/webhook", (req, res) => {
  try {
    const { merchantId, merchantRequest, status, statusMessage, response } =
      req.body;

    console.log("Webhook received:", { merchantId, status, statusMessage });

    if (status === "Success" && response) {
      // Decrypt the response
      const decryptedData = decryptYagoutPay(
        response,
        YAGOUTPAY_CONFIG.encryptionKey
      );
      const paymentData = JSON.parse(decryptedData);

      console.log("Decrypted webhook data:", paymentData);

      // Update payment status in storage
      if (paymentData.orderNo) {
        const payment = getPayment(paymentData.orderNo);
        if (payment) {
          payment.status = "webhook_received";
          payment.webhookData = paymentData;
          console.log("Updated payment with webhook data:", payment);
        }
      }
    }

    res
      .status(200)
      .json({ status: "OK", message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to check payment status
app.get("/api/payment/:orderId", (req, res) => {
  const payment = getPayment(req.params.orderId);
  if (payment) {
    res.json(payment);
  } else {
    res.status(404).json({ error: "Payment not found" });
  }
});

// Helper function to retrieve payment
function getPayment(orderId) {
  return payments.get(orderId);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `🚀 YagoutPay Node.js server running on http://localhost:${PORT}`
  );
  console.log(`💳 Merchant ID: ${YAGOUTPAY_CONFIG.merchantId}`);
  console.log(`🔐 Using encryption key: ${YAGOUTPAY_CONFIG.encryptionKey}`);
  console.log(`🌐 API Endpoint: ${YAGOUTPAY_CONFIG.apiUrl}`);
  console.log(`📊 Webhook URL: http://localhost:${PORT}/payment/webhook`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server gracefully...");
  process.exit(0);
});
