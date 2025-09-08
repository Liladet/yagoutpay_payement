<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class GenerateMerchantRequest extends Command
{
    protected $signature = 'yagout:generate-request';
    protected $description = 'Generate encrypted merchantRequest for YagoutPay Direct API and send to API';

    public function handle()
    {
        $merchantId = "202508080001"; // Test environment merchant ID
        $encryptionKey = "IG3CNW5uNrUO2mU2htUOWb9rgXCF7XMAXmL63d7wNZo="; // Test encryption key
        $apiUrl = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration";
        $iv = "0123456789abcdef";

        // Generate unique order number
        $timestamp = (string)(int)(microtime(true) * 1000);
        $randomPart = rand(100, 999);
        $uniqueOrderNo = substr($timestamp . $randomPart, -12);

        $this->info("Generated Order Number: " . $uniqueOrderNo);

        // Construct the payload
        $plainRequest = [
            "card_details" => [
                "cardNumber" => "",
                "expiryMonth" => "",
                "expiryYear" => "",
                "cvv" => "",
                "cardName" => ""
            ],
            "other_details" => [
                "udf1" => "",
                "udf2" => "",
                "udf3" => "",
                "udf4" => "",
                "udf5" => "",
                "udf6" => "",
                "udf7" => ""
            ],
            "ship_details" => [
                "shipAddress" => "",
                "shipCity" => "",
                "shipState" => "",
                "shipCountry" => "",
                "shipZip" => "",
                "shipDays" => "",
                "addressCount" => ""
            ],
            "txn_details" => [
                "agId" => "yagout",
                "meId" => $merchantId,
                "orderNo" => $uniqueOrderNo,
                "amount" => "1",
                "country" => "ETH",
                "currency" => "ETB",
                "transactionType" => "SALE",
                "sucessUrl" => "https://yourdomain.com/success",
                "failureUrl" => "https://yourdomain.com/failure",
                "channel" => "API"
            ],
            "item_details" => [
                "itemCount" => "",
                "itemValue" => "",
                "itemCategory" => ""
            ],
            "cust_details" => [
                "customerName" => "Test User",
                "emailId" => "test@example.com",
                "mobileNumber" => "0909260339",
                "uniqueId" => "",
                "isLoggedIn" => "Y"
            ],
            "pg_details" => [
                "pg_Id" => "67ee846571e740418d688c3f",
                "paymode" => "WA",
                "scheme_Id" => "7",
                "wallet_type" => "telebirr"
            ],
            "bill_details" => [
                "billAddress" => "",
                "billCity" => "",
                "billState" => "",
                "billCountry" => "",
                "billZip" => ""
            ]
        ];

        // Convert to JSON string
        $jsonStr = json_encode($plainRequest, JSON_UNESCAPED_SLASHES);

        // Encrypt the payload
        $size = 16;
        $pad = $size - (strlen($jsonStr) % $size);
        $paddedText = $jsonStr . str_repeat(chr($pad), $pad);
        $encryptedRequest = base64_encode(openssl_encrypt($paddedText, "AES-256-CBC", base64_decode($encryptionKey), OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, $iv));

        $this->info("=== Encrypted Merchant Request ===");
        $this->line($encryptedRequest);

        // Prepare the request body
        $requestBody = [
            "merchantId" => $merchantId,
            "merchantRequest" => $encryptedRequest
        ];

        // Send the request to YagoutPay API
        try {
            $client = new Client();
            $response = $client->post($apiUrl, [
                'json' => $requestBody,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'verify' => false, // Keep this for testing, remove for production
            ]);

            // Get the response body
            $responseData = json_decode($response->getBody()->getContents(), true);

            $this->info("\n=== API Response ===");
            $this->line(json_encode($responseData, JSON_PRETTY_PRINT));

            // Check if the response is successful
            if (isset($responseData['status']) && $responseData['status'] === 'Success') {
                $this->info("Transaction initiated successfully.");
                
                // Decrypt the response
                $encryptedResponse = $responseData['response'];
                $this->info("\n=== Encrypted Response ===");
                $this->line($encryptedResponse);
                
                $decryptedResponse = $this->decryptResponse($encryptedResponse, $encryptionKey, $iv);
                
                $this->info("\n=== Decrypted Response ===");
                $this->line(json_encode($decryptedResponse, JSON_PRETTY_PRINT));
                
            } else {
                $this->error("Transaction failed: " . ($responseData['statusMessage'] ?? 'Unknown error'));
            }

        } catch (RequestException $e) {
            $this->error("Request failed: " . $e->getMessage());
            if ($e->hasResponse()) {
                $this->error("Response: " . $e->getResponse()->getBody()->getContents());
            }
        }
    }

    /**
     * Decrypt the API response
     */
    private function decryptResponse($encryptedData, $encryptionKey, $iv)
    {
        try {
            // Decode from base64
            $decodedData = base64_decode($encryptedData);
            
            // Decrypt using AES-256-CBC
            $decrypted = openssl_decrypt(
                $decodedData, 
                "AES-256-CBC", 
                base64_decode($encryptionKey), 
                OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, 
                $iv
            );
            
            if ($decrypted === false) {
                $this->error("Decryption failed: " . openssl_error_string());
                return null;
            }
            
            // Remove padding
            $pad = ord($decrypted[strlen($decrypted) - 1]);
            $decrypted = substr($decrypted, 0, -$pad);
            
            // Parse JSON response
            return json_decode($decrypted, true);
            
        } catch (\Exception $e) {
            $this->error("Decryption error: " . $e->getMessage());
            return null;
        }
    }
}