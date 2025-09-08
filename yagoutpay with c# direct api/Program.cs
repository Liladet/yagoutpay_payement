using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace YagoutPayTester
{
    class Program
    {
        // Your credentials from Python code
        private const string MERCHANT_ID = "your_merchant_id";
        private const string ENCRYPTION_KEY = "your_ENCRYPTION_KEY"; // Base64 encoded key
        private const string API_URL = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration";

        static async Task Main(string[] args)
        {
            Console.WriteLine("=== YagoutPay C# Integration Tester ===");

            // Test 1: Encryption/Decryption
            TestEncryption();

            // Test 2: Payment Processing
            await TestPaymentProcessing();

            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }

        static void TestEncryption()
        {
            Console.WriteLine("\n1. Testing Encryption/Decryption...");

            var encryption = new YagoutPayEncryption(ENCRYPTION_KEY);

            string testMessage = "Hello YagoutPay - Test Message 123";
            string encrypted = encryption.EncryptAES(testMessage);
            string decrypted = encryption.DecryptAES(encrypted);

            Console.WriteLine($"Original: {testMessage}");
            Console.WriteLine($"Encrypted: {encrypted}");
            Console.WriteLine($"Decrypted: {decrypted}");
            Console.WriteLine($"Match: {testMessage == decrypted}");
        }

        static async Task TestPaymentProcessing()
        {
            Console.WriteLine("\n2. Testing Payment Processing...");

            var api = new DirectApiIntegration(MERCHANT_ID, ENCRYPTION_KEY, true);

            // Create payment request matching your Python structure
            var paymentRequest = new
            {
                card_details = new
                {
                    cardNumber = "",
                    expiryMonth = "",
                    expiryYear = "",
                    cvv = "",
                    cardName = ""
                },
                other_details = new
                {
                    udf1 = "",
                    udf2 = "",
                    udf3 = "",
                    udf4 = "",
                    udf5 = "",
                    udf6 = "",
                    udf7 = ""
                },
                ship_details = new
                {
                    shipAddress = "",
                    shipCity = "",
                    shipState = "",
                    shipCountry = "",
                    shipZip = "",
                    shipDays = "",
                    addressCount = ""
                },
                txn_details = new
                {
                    agId = "yagout",
                    meId = MERCHANT_ID,
                    orderNo = GenerateOrderNumber(),
                    amount = "1.00",
                    country = "ETH",
                    currency = "ETB",
                    transactionType = "SALE",
                    successUrl = "https://yourdomain.com/success",
                    failureUrl = "https://yourdomain.com/failure",
                    channel = "API"
                },
                item_details = new
                {
                    itemCount = "",
                    itemValue = "",
                    itemCategory = ""
                },
                cust_details = new
                {
                    customerName = "Test User",
                    emailId = "test@example.com",
                    mobileNumber = "0912345678",
                    uniqueId = "",
                    isLoggedIn = "Y"
                },
                pg_details = new
                {
                    pg_Id = "67ee846571e740418d688c3f",
                    paymode = "WA",
                    scheme_Id = "7",
                    wallet_type = "telebirr"
                },
                bill_details = new
                {
                    billAddress = "",
                    billCity = "",
                    billState = "",
                    billCountry = "",
                    billZip = ""
                }
            };

            try
            {
                var result = await api.ProcessPayment(paymentRequest);
                Console.WriteLine($"Status: {result.Status}");
                Console.WriteLine($"Status Message: {result.StatusMessage}");

                if (result.Status == "Success" && result.DecryptedResponse != null)
                {
                    Console.WriteLine("Decrypted Response:");
                    Console.WriteLine(JsonConvert.SerializeObject(result.DecryptedResponse, Formatting.Indented));
                }
                else
                {
                    Console.WriteLine($"Raw Response: {result.Response}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
            }
        }

        static string GenerateOrderNumber()
        {
            long timestamp = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
            Random random = new Random();
            int randomPart = random.Next(100, 999);
            return $"{timestamp}{randomPart}"[^12..];
        }
    }

    public class YagoutPayEncryption
    {
        private readonly byte[] _encryptionKey;
        private readonly byte[] _iv = Encoding.UTF8.GetBytes("0123456789abcdef");

        public YagoutPayEncryption(string base64EncryptionKey)
        {
            _encryptionKey = Convert.FromBase64String(base64EncryptionKey);
        }

        public string EncryptAES(string plaintext)
        {
            using (Aes aes = Aes.Create())
            {
                aes.Key = _encryptionKey;
                aes.IV = _iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
                byte[] encrypted = encryptor.TransformFinalBlock(Encoding.UTF8.GetBytes(plaintext), 0, plaintext.Length);
                return Convert.ToBase64String(encrypted);
            }
        }

        public string DecryptAES(string ciphertext)
        {
            using (Aes aes = Aes.Create())
            {
                aes.Key = _encryptionKey;
                aes.IV = _iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                ICryptoTransform decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
                byte[] decrypted = decryptor.TransformFinalBlock(Convert.FromBase64String(ciphertext), 0, Convert.FromBase64String(ciphertext).Length);
                return Encoding.UTF8.GetString(decrypted);
            }
        }
    }

    public class DirectApiIntegration
    {
        private readonly string _merchantId;
        private readonly string _encryptionKey;
        private readonly bool _testMode;
        private readonly HttpClient _httpClient;

        public DirectApiIntegration(string merchantId, string encryptionKey, bool testMode = true)
        {
            _merchantId = merchantId;
            _encryptionKey = encryptionKey;
            _testMode = testMode;

            // Configure HTTP client to ignore SSL errors for testing
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };

            _httpClient = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public async Task<ApiResponse> ProcessPayment(object paymentRequest)
        {
            var encryption = new YagoutPayEncryption(_encryptionKey);

            // Convert to JSON string with minimal formatting
            string jsonRequest = JsonConvert.SerializeObject(paymentRequest, Formatting.None,
                new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });

            Console.WriteLine($"JSON Request: {jsonRequest}");

            string encryptedRequest = encryption.EncryptAES(jsonRequest);
            Console.WriteLine($"Encrypted Request: {encryptedRequest}");

            var payload = new
            {
                merchantId = _merchantId,
                merchantRequest = encryptedRequest
            };

            string jsonPayload = JsonConvert.SerializeObject(payload);
            Console.WriteLine($"Final Payload: {jsonPayload}");

            var apiUrl = _testMode ?
                "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration" :
                "https://checkout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration";

            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            HttpResponseMessage response = await _httpClient.PostAsync(apiUrl, content);

            string responseContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"HTTP Status: {response.StatusCode}");
            Console.WriteLine($"Raw Response: {responseContent}");

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"HTTP Error: {response.StatusCode}. Response: {responseContent}");
            }

            var apiResponse = JsonConvert.DeserializeObject<ApiResponse>(responseContent);

            if (apiResponse.Status == "Success" && !string.IsNullOrEmpty(apiResponse.Response))
            {
                string decryptedResponse = encryption.DecryptAES(apiResponse.Response);
                Console.WriteLine($"Decrypted Response: {decryptedResponse}");

                try
                {
                    apiResponse.DecryptedResponse = JsonConvert.DeserializeObject<dynamic>(decryptedResponse);
                }
                catch
                {
                    apiResponse.DecryptedResponse = decryptedResponse;
                }
            }

            return apiResponse;
        }
    }

    public class ApiResponse
    {
        public string? MerchantId { get; set; }
        public string? Status { get; set; }
        public string? StatusMessage { get; set; }
        public string? Response { get; set; }
        public object? DecryptedResponse { get; set; }
    }
}