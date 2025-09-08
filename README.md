# 💳 YagoutPay Payment Integration System

A robust, **multi-platform payment integration system** for the **YagoutPay gateway**, supporting **Python, Node.js, C# (.NET), and Laravel integrations**.

---

## 🚀 Quick Start

Get started with YagoutPay integration in your preferred programming environment.

---

## 🐍 Python Integration

**Install requirements**
```bash
pip install requests cryptography
Run the Python script


python yagoutpay_python.py
```
Features

Direct API integration

AES-256-CBC encryption

Order number generation

Error handling

🟩 Node.js Integration
Install dependencies


npm install express axios crypto body-parser dotenv
Start development server


npm run dev
Or start production server


npm start
Features

Express.js web server

Hosted checkout page

Webhook handling

RESTful API endpoints

Beautiful UI/UX design

🔵 C# Integration (.NET)
Create new MVC project


dotnet new mvc -n YagoutPayIntegration
Add required NuGet packages


dotnet add package System.Security.Cryptography
dotnet add package Newtonsoft.Json
Features

ASP.NET MVC implementation

Controller-based architecture

Model binding

Secure encryption handling

🟠 Laravel Integration
Create new Laravel project


composer create-project laravel/laravel yagoutpay-integration
Install dependencies


composer require guzzlehttp/guzzle
Features

PHP Laravel framework

Service provider pattern

Middleware support

Blade templates

Eloquent models

🔧 Configuration
Environment Variables (.env)

Node.js Example:

env

PORT=3000
MERCHANT_ID=yourmid
ENCRYPTION_KEY=youresckey
API_URL=your_url
NODE_ENV=development
💳 Payment Flow
Initiation: Client requests payment initiation.

Encryption: Server encrypts payload using AES-256-CBC.

API Call: Encrypted data sent to YagoutPay API.

Processing: YagoutPay processes the payment.

Callback: Server receives success/failure response.

Confirmation: Client receives payment status.

🛡️ Security Features
AES-256-CBC encryption

SSL/TLS encryption

Input validation

Error handling

Secure key management

Webhook verification

📋 Request & Response Format
Request

json

{ "merchantId": "mid", "merchantRequest": "enc" }
Response

json

{ "status": "Success", "statusMessage": "No Error", "response": "encrypted_response_base64" }

🚨 Error Handling
Handles common error scenarios:

Network timeouts

Invalid credentials

Encryption failures

API rate limiting

Invalid responses

Test Parameters

Amount: 1.00 ETB

Currency: ETB (Ethiopian Birr)

Country: ETH

📝 Deployment Checklist
✅ Update merchant credentials
✅ Enable SSL/TLS
✅ Configure webhook URLs
✅ Set up logging
✅ Implement monitoring
✅ Test error scenarios
✅ Secure encryption keys

Production Environment Variables

env
MERCHANT_ID=your_production_merchant_id
ENCRYPTION_KEY=your_production_encryption_key
API_URL=production_api_url
NODE_ENV=production
🌟 Platform Integrations
🐍 Python: Direct API integration with AES-256-CBC encryption

🟩 Node.js: Express server with hosted checkout UI

🔵 C#: .NET MVC application

🟠 Laravel: PHP framework

🔍 Core Functionality
Processes payments through YagoutPay gateway

Supports multiple payment methods (telebirr, cards, banking)

Handles encryption/decryption of transaction data

Manages payment callbacks and webhooks

Provides hosted checkout page

📚 Technical Specifications
Encryption: AES-256-CBC with static IV

Merchant ID: meid (test environment)

API Endpoint: YagoutPay transaction API

Currency: ETB (Ethiopian Birr)

Country: ETH

✨ Integration Features
Complete payment processing flow

Error handling and logging

Responsive checkout interface

Webhook support for notifications

Order management system

🔒 Security Measures
Secure encryption implementation

Input validation and sanitization

Secure credential management

SSL/TLS compatibility

🛠️ Usage
Initialize payment with order details

Encrypt payload using provided key

Submit to YagoutPay API

Handle response and update records

Process callbacks for status updates

🧪 Test Environment
Test credentials provided

Sandbox API endpoint available

Sample payment amounts: 1.00 ETB

Test card numbers available

🚀 Production Requirements
Production merchant credentials

SSL certificate

Secure server environment

Proper logging implementation

Webhook endpoint configuration

⚡ Quick Start Commands
Python Integration (Direct API)


python direct.py
Node.js Integration


node server.js       # Main server
node checkout.js     # Hosted checkout
Laravel Integration


php artisan serve
# Default: http://localhost:8000
C# Integration


dotnet run
# Hosted Checkout: http://localhost:5273/api/hostedcheckout/test
📦 Summary
This system provides complete payment processing integration with the YagoutPay payment gateway across multiple programming platforms.
Refer to the respective integration folders for detailed implementation.
