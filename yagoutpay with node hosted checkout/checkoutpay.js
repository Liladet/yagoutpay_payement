const express = require("express");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const app = express();
const port = 5000;

// Configuration constants
const MERCHANT_ID = "your_merchant_id";
const MERCHANT_KEY = Buffer.from(
  "your_32_byte_base64_encoded_key_here==",
  "base64"
);
const IV = Buffer.from("0123456789abcdef", "utf8");
const AGGREGATOR_ID = "yagout";
const URL =
  "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// AES encryption function
function encryptAes(plaintext) {
  const cipher = crypto.createCipheriv("aes-256-cbc", MERCHANT_KEY, IV);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

// AES decryption function for webhooks
function decryptAes(encryptedText) {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", MERCHANT_KEY, IV);
    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

// Generate payment request
function generateRequest(
  amount = "1",
  name = "Test User",
  email = "test@email.com",
  phone = "0912345678"
) {
  const order_no = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");

  const txn_details = [
    AGGREGATOR_ID,
    MERCHANT_ID,
    order_no,
    amount,
    "ETH",
    "ETB",
    "SALE",
    `https://yourdomain.com/yagoutpay/webhook/success`,
    `https://yourdomain.com/yagoutpay/webhook/failure`,
    "WEB",
  ].join("|");

  const pg_details = "|||";
  const card_details = "|||||";
  const cust_details = [name, email, phone, "", "Y"].join("|");
  const bill_details = "|||||";
  const ship_details = "|||||||";
  const item_details = "||";
  const upi_details = "";
  const other_details = "|||||";

  const full_message = [
    txn_details,
    pg_details,
    card_details,
    cust_details,
    bill_details,
    ship_details,
    item_details,
    upi_details,
    other_details,
  ].join("~");

  const hash_input = `${MERCHANT_ID}~${order_no}~${amount}~ETH~ETB`;
  const sha256_hex = crypto
    .createHash("sha256")
    .update(hash_input)
    .digest("hex");

  const enc_message = encryptAes(full_message);
  const enc_hash = encryptAes(sha256_hex);

  return { enc_message, enc_hash, order_no };
}

// In-memory storage for demo (use database in production)
const transactions = new Map();

// Serve checkout page
app.get("/checkout", (req, res) => {
  const checkoutPage = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>YagoutPay Checkout</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 500px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .checkout-form {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            input[type="text"], input[type="email"] {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .pay-button {
                background-color: #4CAF50;
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
                font-size: 16px;
            }
            .pay-button:hover {
                background-color: #45a049;
            }
        </style>
    </head>
    <body>
        <div class="checkout-form">
            <h2>YagoutPay Checkout</h2>
            <form action="/pay" method="POST">
                <div class="form-group">
                    <label for="name">Full Name:</label>
                    <input type="text" id="name" name="name" value="Test User" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" value="test@email.com" required>
                </div>
                <div class="form-group">
                    <label for="phone">Phone:</label>
                    <input type="text" id="phone" name="phone" value="0909260339" required>
                </div>
                <div class="form-group">
                    <label for="amount">Amount (ETB):</label>
                    <input type="text" id="amount" name="amount" value="1" required>
                </div>
                <button type="submit" class="pay-button">Pay Now</button>
            </form>
        </div>
    </body>
    </html>
    `;

  res.send(checkoutPage);
});

// Process payment and redirect to payment gateway
app.post("/pay", (req, res) => {
  const { name, email, phone, amount } = req.body;
  const { enc_message, enc_hash, order_no } = generateRequest(
    amount,
    name,
    email,
    phone
  );

  // Store transaction details (in production, use a database)
  transactions.set(order_no, {
    name,
    email,
    phone,
    amount,
    status: "pending",
    createdAt: new Date(),
  });

  const htmlForm = `
    <!DOCTYPE html>
    <html>
    <body onload="document.forms[0].submit()">
      <form method="POST" action="${URL}">
        <input type="hidden" name="me_id" value="${MERCHANT_ID}" />
        <input type="hidden" name="merchant_request" value="${enc_message}" />
        <input type="hidden" name="hash" value="${enc_hash}" />
        <noscript><input type="submit" value="Pay Now" /></noscript>
      </form>
    </body>
    </html>
    `;

  res.send(htmlForm);
});

// Webhook endpoint for successful payments
app.post("/yagoutpay/webhook/success", (req, res) => {
  try {
    // In a real implementation, YagoutPay would send encrypted data
    // You would decrypt it using the decryptAes function

    console.log("Success webhook received:", req.body);

    // Extract and process the payment response
    const { order_id, transaction_id, amount, status } = req.body;

    // Update transaction status in database
    if (transactions.has(order_id)) {
      const transaction = transactions.get(order_id);
      transaction.status = "success";
      transaction.transactionId = transaction_id;
      transaction.updatedAt = new Date();

      console.log("Payment successful:", transaction);

      // Here you would:
      // 1. Update your database
      // 2. Send confirmation email
      // 3. Fulfill the order, etc.
    }

    // Return success response to YagoutPay
    res.status(200).json({ status: "success", message: "Webhook processed" });
  } catch (error) {
    console.error("Error processing success webhook:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// Webhook endpoint for failed payments
app.post("/yagoutpay/webhook/failure", (req, res) => {
  try {
    console.log("Failure webhook received:", req.body);

    const { order_id, error_code, error_message } = req.body;

    // Update transaction status in database
    if (transactions.has(order_id)) {
      const transaction = transactions.get(order_id);
      transaction.status = "failed";
      transaction.errorCode = error_code;
      transaction.errorMessage = error_message;
      transaction.updatedAt = new Date();

      console.log("Payment failed:", transaction);

      // Here you would:
      // 1. Update your database
      // 2. Notify the customer
      // 3. Possibly retry logic, etc.
    }

    res.status(200).json({ status: "success", message: "Webhook processed" });
  } catch (error) {
    console.error("Error processing failure webhook:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// Additional endpoint to check transaction status (for frontend polling)
app.get("/transaction/:orderId/status", (req, res) => {
  const { orderId } = req.params;

  if (transactions.has(orderId)) {
    res.json(transactions.get(orderId));
  } else {
    res.status(404).json({ error: "Transaction not found" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`YagoutPay checkout server running on port ${port}`);
  console.log(`Checkout page: http://localhost:${port}/checkout`);
});
