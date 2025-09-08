using System;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using YagoutPayHostedCheckout.Models;

namespace YagoutPayHostedCheckout.Services
{
    public class YagoutHostedCheckout
    {
        private readonly string _merchantId;
        private readonly string _encryptionKey;
        private readonly bool _testMode;
        private readonly byte[] _iv = Encoding.UTF8.GetBytes("0123456789abcdef");

        public YagoutHostedCheckout(string merchantId, string encryptionKey, bool testMode = true)
        {
            _merchantId = merchantId;
            _encryptionKey = encryptionKey;
            _testMode = testMode;
        }

        public string GeneratePaymentForm(decimal amount, string customerName, string email,
                                        string phone, string successUrl, string failureUrl, string orderId)
        {
            string baseUrl = _testMode ?
                "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage" :
                "https://checkout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage";

            // Prepare data in exact pipe-separated format required by YagoutPay
            string txnDetails = PrepareTransactionDetails(amount, orderId, successUrl, failureUrl);
            string custDetails = PrepareCustomerDetails(customerName, email, phone);

            // Other sections with proper pipe counts (as per YagoutPay documentation)
            string pgDetails = "|||";
            string cardDetails = "||||";
            string billDetails = "||||";
            string shipDetails = "||||||";
            string itemDetails = "||";
            string upiDetails = "";
            string otherDetails = "|||||||";

            // Combine all sections with ~ separator
            string fullMessage = string.Join("~",
                txnDetails, pgDetails, cardDetails, custDetails,
                billDetails, shipDetails, itemDetails, upiDetails, otherDetails
            );

            // Encrypt the message
            string encryptedMessage = EncryptAES(fullMessage);

            // Generate hash and encrypt it
            string hashInput = string.Join("~", _merchantId, orderId, amount.ToString("0.00"), "ETH", "ETB");
            string encryptedHash = EncryptAES(ComputeSHA256(hashInput));

            return GenerateHtmlForm(baseUrl, encryptedMessage, encryptedHash);
        }

        private string PrepareTransactionDetails(decimal amount, string orderId, string successUrl, string failureUrl)
        {
            return string.Join("|",
                "yagout",           // ag_id
                _merchantId,        // me_id
                orderId,            // order_no
                amount.ToString("0.00"), // amount
                "ETH",              // country
                "ETB",              // currency
                "SALE",             // txn_type
                successUrl,         // success_url
                failureUrl,         // failure_url
                "WEB"               // channel
            );
        }

        private string PrepareCustomerDetails(string customerName, string email, string phone)
        {
            return string.Join("|",
                customerName,   // cust_name
                email,          // email_id
                phone,          // mobile_no
                "",             // unique_id
                "Y"             // is_logged_in
            );
        }

        public string EncryptAES(string plaintext)
        {
            byte[] key = Convert.FromBase64String(_encryptionKey);

            using (Aes aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = _iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
                byte[] encrypted = encryptor.TransformFinalBlock(Encoding.UTF8.GetBytes(plaintext), 0, plaintext.Length);
                return Convert.ToBase64String(encrypted);
            }
        }

        private string ComputeSHA256(string input)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
                return BitConverter.ToString(bytes).Replace("-", "").ToLower();
            }
        }

        private string GenerateHtmlForm(string url, string encryptedMessage, string encryptedHash)
        {
            // URL encode the values for HTML form
            string encodedMessage = HttpUtility.HtmlEncode(encryptedMessage);
            string encodedHash = HttpUtility.HtmlEncode(encryptedHash);

            return $@"
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to YagoutPay</title>
    <style>
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #333;
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }}
        .logo {{
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
        }}
        .loading {{
            font-size: 20px;
            color: #2d3748;
            margin-bottom: 25px;
        }}
        .spinner {{
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 30px auto;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
        .message {{
            color: #718096;
            margin: 15px 0;
            line-height: 1.6;
        }}
        .button {{
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 35px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.3s ease;
        }}
        .button:hover {{
            background: #5a67d8;
        }}
    </style>
</head>
<body onload=""document.forms['yagoutpayForm'].submit()"">
    <div class=""container"">
        <div class=""logo"">🔒 YagoutPay</div>
        <div class=""loading"">Redirecting to Secure Payment Gateway</div>
        <div class=""spinner""></div>
        
        <div class=""message"">
            Please wait while we transfer you to our secure payment processor.
            Your payment details are encrypted and protected.
        </div>
        
        <div class=""message"">
            <strong>Do not refresh or close this page.</strong>
        </div>

        <form name=""yagoutpayForm"" method=""POST"" action=""{url}"">
            <input type=""hidden"" name=""me_id"" value=""{_merchantId}"">
            <input type=""hidden"" name=""merchant_request"" value=""{encodedMessage}"">
            <input type=""hidden"" name=""hash"" value=""{encodedHash}"">
            
            <noscript>
                <div style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;"">
                    <div class=""message"">JavaScript is disabled in your browser. Please click the button below to proceed.</div>
                    <input type=""submit"" value=""Proceed to Payment"" class=""button"">
                </div>
            </noscript>
        </form>
    </div>
    
    <script>
        // Auto-submit the form after a short delay
        setTimeout(function() {{
            document.forms['yagoutpayForm'].submit();
        }}, 2000);
        
        // Show a message if taking too long
        setTimeout(function() {{
            document.querySelector('.loading').textContent = ""Still connecting to secure payment gateway..."";
        }}, 5000);
    </script>
</body>
</html>";
        }

        public bool VerifyCallback(YagoutCallback callback)
        {
            // Verify the hash to ensure callback is legitimate
            string hashInput = string.Join("~", _merchantId, callback.OrderNo, callback.Amount, callback.Status);
            string expectedHash = EncryptAES(ComputeSHA256(hashInput));

            return string.Equals(expectedHash, callback.Hash, StringComparison.Ordinal);
        }
    }
}