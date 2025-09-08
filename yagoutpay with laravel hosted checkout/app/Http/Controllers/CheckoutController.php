<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    private $merchantId = "your_merchant_id"; // Replace with your actual merchant ID
    private $merchantKey = "your_base64_encoded_key"; // Replace with your actual base64 encoded key
    private $iv = "0123456789abcdef";
    private $aggregatorId = "yagout";
    private $url = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage";

    private function encryptAes($plaintext)
    {
        $key = base64_decode($this->merchantKey);
        $iv = $this->iv;
        \Log::info('Key (hex): ' . bin2hex($key));
        \Log::info('IV (hex): ' . bin2hex($iv));
        \Log::info('Plaintext: ' . $plaintext);

        // Manual PKCS7 padding as per YagoutPay documentation
        $size = 16;
        $pad = $size - (strlen($plaintext) % $size);
        $padtext = $plaintext . str_repeat(chr($pad), $pad);

        $cipher = openssl_encrypt(
            $padtext,
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING,
            $iv
        );
        if ($cipher === false) {
            \Log::error('Encryption failed: ' . openssl_error_string());
            throw new \Exception('Encryption failed: ' . openssl_error_string());
        }
        \Log::info('Cipher (hex): ' . bin2hex($cipher));
        $encoded = base64_encode($cipher);
        \Log::info('Encrypted (base64): ' . $encoded);
        return $encoded;
    }

    private function generateRequest($amount = "1", $name = "Test User", $email = "test@email.com", $phone = "0909260339")
    {
        $orderNo = "ReJqc"; // Fixed for testing

        $txnDetails = implode('|', [
            $this->aggregatorId,
            $this->merchantId,
            $orderNo,
            $amount,
            "ETH",
            "ETB",
            "SALE",
            url('/yagoutpay/success'),
            url('/yagoutpay/failure'),
            "WEB"
        ]);

        $pgDetails = "|||";
        $cardDetails = "|||||";
        $custDetails = implode('|', [$name, $email, $phone, "", "Y"]);
        $billDetails = "|||||";
        $shipDetails = "|||||||";
        $itemDetails = "||";
        $upiDetails = "";
        $otherDetails = "|||||";

        $fullMessage = implode('~', [
            $txnDetails,
            $pgDetails,
            $cardDetails,
            $custDetails,
            $billDetails,
            $shipDetails,
            $itemDetails,
            $upiDetails,
            $otherDetails
        ]);

        $hashInput = "{$this->merchantId}~{$orderNo}~{$amount}~ETH~ETB";
        $sha256Hex = hash('sha256', $hashInput);

        \Log::info('YagoutPay Debug: ' . json_encode([
            'Order No' => $orderNo,
            'Hash Input' => $hashInput,
            'SHA256 Hex' => $sha256Hex,
            'Full Message' => $fullMessage,
            'Full Message Length' => strlen($fullMessage)
        ]));

        $encMessage = $this->encryptAes($fullMessage);
        $encHash = $this->encryptAes($sha256Hex);

        \Log::info('Encrypted Message: ' . $encMessage);
        \Log::info('Encrypted Hash: ' . $encHash);

        return [
            'enc_message' => $encMessage,
            'enc_hash' => $encHash
        ];
    }

    public function pay()
    {
        try {
            $data = $this->generateRequest();
            return view('checkout.pay', [
                'merchant_id' => $this->merchantId,
                'url' => $this->url,
                'enc_message' => $data['enc_message'],
                'enc_hash' => $data['enc_hash']
            ]);
        } catch (\Exception $e) {
            \Log::error('Payment error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function testEncrypt()
    {
        try {
            $encrypted = $this->encryptAes('test');
            return response()->json(['encrypted' => $encrypted]);
        } catch (\Exception $e) {
            \Log::error('Test encryption error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}