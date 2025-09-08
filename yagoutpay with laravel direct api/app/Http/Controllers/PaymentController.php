<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    private $merchantId = "your_merchant_id"; // Replace with your actual merchant ID
    private $encryptionKey = "your_base64_encoded_key"; // Replace with your actual base64 encoded key
    private $apiUrl = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration";
    private $iv = "0123456789abcdef";

    /**
     * Show the payment form
     */
    public function showPaymentForm()
    {
        return view('payment.form');
    }

    /**
     * Initiate payment with YagoutPay API
     */
    public function initiatePayment(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'customer_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'mobile' => 'required|string|max:20'
        ]);

        // Generate unique order number
        $timestamp = (string)(int)(microtime(true) * 1000);
        $randomPart = rand(100, 999);
        $uniqueOrderNo = substr($timestamp . $randomPart, -12);

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
                "meId" => $this->merchantId,
                "orderNo" => $uniqueOrderNo,
                "amount" => $request->amount,
                "country" => "ETH",
                "currency" => "ETB",
                "transactionType" => "SALE",
                "sucessUrl" => route('payment.success'),
                "failureUrl" => route('payment.failure'),
                "channel" => "API"
            ],
            "item_details" => [
                "itemCount" => "",
                "itemValue" => "",
                "itemCategory" => ""
            ],
            "cust_details" => [
                "customerName" => $request->customer_name,
                "emailId" => $request->email,
                "mobileNumber" => $request->mobile,
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

        // Convert to JSON string and encrypt
        $jsonStr = json_encode($plainRequest, JSON_UNESCAPED_SLASHES);
        $size = 16;
        $pad = $size - (strlen($jsonStr) % $size);
        $paddedText = $jsonStr . str_repeat(chr($pad), $pad);
        $encryptedRequest = base64_encode(openssl_encrypt($paddedText, "AES-256-CBC", base64_decode($this->encryptionKey), OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, $this->iv));

        // Prepare the request body
        $requestBody = [
            "merchantId" => $this->merchantId,
            "merchantRequest" => $encryptedRequest
        ];

        try {
            $client = new Client();
            $response = $client->post($this->apiUrl, [
                'json' => $requestBody,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'verify' => false,
            ]);

            $responseData = json_decode($response->getBody()->getContents(), true);

            // Log the API response for debugging
            Log::info('YagoutPay API Response:', $responseData);

            if (isset($responseData['status']) && $responseData['status'] === 'Success') {
                $decryptedResponse = $this->decryptResponse($responseData['response'], $this->encryptionKey, $this->iv);
                
                // Log decrypted response for debugging
                Log::info('Decrypted YagoutPay Response:', $decryptedResponse ?? ['error' => 'Decryption failed']);

                // Handle different response scenarios
                if ($decryptedResponse && isset($decryptedResponse['paymentUrl'])) {
                    // Redirect to payment gateway (for card payments)
                    return response()->json([
                        'success' => true,
                        'paymentUrl' => $decryptedResponse['paymentUrl'],
                        'message' => 'Payment initiated successfully'
                    ]);
                } 
                // Handle immediate wallet payment success (Telebirr)
                elseif ($decryptedResponse && isset($decryptedResponse['txn_response']) && $decryptedResponse['txn_response']['status'] === 'Successful') {
                    return response()->json([
                        'success' => true,
                        'immediateSuccess' => true,
                        'message' => 'Payment processed successfully via Telebirr!',
                        'transactionData' => $decryptedResponse['txn_response'],
                        'redirectUrl' => route('payment.success', $decryptedResponse['txn_response'])
                    ]);
                }
                // Handle failed immediate payment
                elseif ($decryptedResponse && isset($decryptedResponse['txn_response']) && $decryptedResponse['txn_response']['status'] !== 'Successful') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment failed: ' . ($decryptedResponse['txn_response']['res_message'] ?? 'Unknown error'),
                        'errorData' => $decryptedResponse['txn_response']
                    ], 400);
                }
                else {
                    // Log the full response for debugging
                    Log::warning('Unexpected response format:', $decryptedResponse ?? []);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Payment initiation failed: Unexpected response format',
                        'debug' => $decryptedResponse
                    ], 400);
                }
            } else {
                $errorMessage = $responseData['statusMessage'] ?? 'Unknown error from payment gateway';
                return response()->json([
                    'success' => false,
                    'message' => 'Payment initiation failed: ' . $errorMessage
                ], 400);
            }

        } catch (RequestException $e) {
            Log::error('YagoutPay API Request Failed:', [
                'message' => $e->getMessage(),
                'response' => $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : 'No response'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Request failed: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            Log::error('Unexpected Error in PaymentController:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle successful payment callback
     */
    public function paymentSuccess(Request $request)
    {
        Log::info('Payment Success Callback Received:', $request->all());
        
        $transactionData = $request->all();
        
        // If we have transaction data from immediate success
        if (empty($transactionData) && session()->has('last_transaction')) {
            $transactionData = session()->get('last_transaction');
        }
        
        return view('payment.success', [
            'message' => 'Payment was successful! Thank you for your purchase.',
            'data' => $transactionData,
            'transaction' => $transactionData
        ]);
    }

    /**
     * Handle failed payment callback
     */
    public function paymentFailure(Request $request)
    {
        Log::warning('Payment Failure Callback Received:', $request->all());
        
        return view('payment.failure', [
            'message' => 'Payment failed or was cancelled. Please try again.',
            'data' => $request->all()
        ]);
    }

    /**
     * Decrypt the API response from YagoutPay
     */
    private function decryptResponse($encryptedData, $encryptionKey, $iv)
    {
        try {
            // Decode from base64
            $decodedData = base64_decode($encryptedData);
            
            if ($decodedData === false) {
                Log::error('Base64 decoding failed');
                return null;
            }

            // Decrypt using AES-256-CBC
            $decrypted = openssl_decrypt(
                $decodedData, 
                "AES-256-CBC", 
                base64_decode($encryptionKey), 
                OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, 
                $iv
            );
            
            if ($decrypted === false) {
                Log::error('Decryption failed: ' . openssl_error_string());
                return null;
            }
            
            // Remove padding - handle different padding scenarios
            $pad = ord($decrypted[strlen($decrypted) - 1]);
            if ($pad > 0 && $pad <= 16) {
                $decrypted = substr($decrypted, 0, -$pad);
            }
            
            // Parse JSON response
            $result = json_decode($decrypted, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('JSON parsing failed: ' . json_last_error_msg());
                return null;
            }
            
            return $result;
            
        } catch (\Exception $e) {
            Log::error('Decryption error: ' . $e->getMessage());
            return null;
        }
    }
}