<?php

namespace App\Helpers;

class YagoutPayHelper
{
    public static function encrypt($data, $key)
    {
        $iv = "0123456789abcdef"; // static IV from docs
        $paddedData = self::pkcs7Pad($data, 16);
        $encrypted = openssl_encrypt($paddedData, "AES-256-CBC", base64_decode($key), OPENSSL_RAW_DATA, $iv);
        return base64_encode($encrypted);
    }

    public static function decrypt($data, $key)
    {
        $iv = "0123456789abcdef";
        $decoded = base64_decode($data);
        $decrypted = openssl_decrypt($decoded, "AES-256-CBC", base64_decode($key), OPENSSL_RAW_DATA, $iv);
        return self::pkcs7Unpad($decrypted);
    }

    private static function pkcs7Pad($text, $blocksize)
    {
        $pad = $blocksize - (strlen($text) % $blocksize);
        return $text . str_repeat(chr($pad), $pad);
    }

    private static function pkcs7Unpad($text)
    {
        $pad = ord($text[strlen($text) - 1]);
        return substr($text, 0, -1 * $pad);
    }
}
