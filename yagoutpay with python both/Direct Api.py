import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.padding import PKCS7
import json
import requests
import urllib3
import time
import random

# Disable SSL warnings for testing environment
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def generate_unique_order_no():
    """Generate a unique order number using timestamp and random digits"""
    timestamp = int(time.time() * 1000)  # Current time in milliseconds
    random_part = random.randint(100, 999)  # Random 3-digit number
    return f"{timestamp}{random_part}"[-12:]  # Take last 12 digits

def encrypt(text, key_b64):
    """Encrypt text using AES-256-CBC with PKCS7 padding"""
    key = base64.b64decode(key_b64)
    iv = b"0123456789abcdef"
    backend = default_backend()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=backend)
    encryptor = cipher.encryptor()
    padder = PKCS7(128).padder()
    padded_data = padder.update(text.encode()) + padder.finalize()
    ct = encryptor.update(padded_data) + encryptor.finalize()
    return base64.b64encode(ct).decode()

def decrypt(crypt_b64, key_b64):
    """Decrypt text using AES-256-CBC with PKCS7 unpadding"""
    key = base64.b64decode(key_b64)
    iv = b"0123456789abcdef"
    crypt = base64.b64decode(crypt_b64)
    backend = default_backend()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=backend)
    decryptor = cipher.decryptor()
    padtext = decryptor.update(crypt) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    data = unpadder.update(padtext) + unpadder.finalize()
    return data.decode()

# Test environment credentials (verify with YagoutPay)
MERCHANT_ID = "your_mid"  # Update if incorrect
ENCRYPTION_KEY = "your_enckey"  # Update if incorrect
AGGREGATOR_ID = "yagout"
API_URL = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/apiRedirection/apiIntegration"

def create_payment_request():
    """Create and encrypt the payment request for Direct API"""
    unique_order_no = generate_unique_order_no()
    print(f"Generated Order Number: {unique_order_no}")

    # Construct the payload as per Direct API requirements
    payload = {
        "card_details": {
            "cardNumber": "",  # Leave empty for wallet; populate for card payment
            "expiryMonth": "",
            "expiryYear": "",
            "cvv": "",
            "cardName": ""
        },
        "other_details": {
            "udf1": "",
            "udf2": "",
            "udf3": "",
            "udf4": "",
            "udf5": "",
            "udf6": "",
            "udf7": ""
        },
        "ship_details": {
            "shipAddress": "",
            "shipCity": "",
            "shipState": "",
            "shipCountry": "",
            "shipZip": "",
            "shipDays": "",
            "addressCount": ""
        },
        "txn_details": {
            "agId": AGGREGATOR_ID,
            "meId": MERCHANT_ID,
            "orderNo": unique_order_no,
            "amount": "1",  # Example amount in ETB
            "country": "ETH",
            "currency": "ETB",
            "transactionType": "SALE",
            "sucessUrl": "https://yourdomain.com/success",  # Replace with actual URL
            "failureUrl": "https://yourdomain.com/failure",  # Replace with actual URL
            "channel": "API"
        },
        "item_details": {
            "itemCount": "",
            "itemValue": "",
            "itemCategory": ""
        },
        "cust_details": {
            "customerName": "Test User",
            "emailId": "test@example.com",  # Mandatory field
            "mobileNumber": "0909260339",
            "uniqueId": "",
            "isLoggedIn": "Y"
        },
        "pg_details": {
            "pg_Id": "67ee846571e740418d688c3f",  # Example PG ID
            "paymode": "WA",  # Wallet payment
            "scheme_Id": "7",
            "wallet_type": "telebirr"
        },
        "bill_details": {
            "billAddress": "",
            "billCity": "",
            "billState": "",
            "billCountry": "",
            "billZip": ""
        }
    }

    # Convert to JSON string and encrypt
    json_str = json.dumps(payload, separators=(',', ':'))  # Minimize JSON for exact match
    encrypted_request = encrypt(json_str, ENCRYPTION_KEY)
    print(f"Encrypted Request: {encrypted_request}")

    # Prepare the final request body
    request_body = {
        "merchantId": MERCHANT_ID,
        "merchantRequest": encrypted_request
    }

    return request_body

def process_payment():
    """Send the payment request to the Direct API endpoint"""
    request_body = create_payment_request()
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(API_URL, json=request_body, headers=headers, verify=False)
        print(f"HTTP Status Code: {response.status_code}")

        if response.status_code == 200:
            resp_json = response.json()
            print(f"Response JSON: {resp_json}")
            if resp_json.get('status') == "Success":
                decrypted_response = decrypt(resp_json['response'], ENCRYPTION_KEY)
                print(f"Decrypted Response: {decrypted_response}")
            else:
                print(f"Error Status: {resp_json.get('status')}")
                print(f"Error Message: {resp_json.get('statusMessage', 'No error message provided')}")
        else:
            print(f"HTTP Error: {response.status_code}")
            print(f"Response Text: {response.text}")

    except requests.exceptions.SSLError as e:
        print(f"SSL Error: {e}")
    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: {e}")
    except requests.exceptions.Timeout as e:
        print(f"Timeout Error: {e}")
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")
    except Exception as e:
        print(f"Unexpected Error: {e}")

if __name__ == "__main__":
    process_payment()