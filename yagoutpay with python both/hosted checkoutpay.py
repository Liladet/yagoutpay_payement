import hashlib
import base64
import random
import string
from flask import Flask, Response
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

app = Flask(__name__)

MERCHANT_ID = "your_merchant_id"
MERCHANT_KEY = base64.b64decode("your_32_byte_base64_encoded_key_here==")
IV = b"0123456789abcdef"
AGGREGATOR_ID = "yagout"
URL = "https://uatcheckout.yagoutpay.com/ms-transaction-core-1-0/paymentRedirection/checksumGatewayPage"


def encrypt_aes(plaintext: str) -> str:
    cipher = AES.new(MERCHANT_KEY, AES.MODE_CBC, IV)
    padded = pad(plaintext.encode("utf-8"), AES.block_size)
    return base64.b64encode(cipher.encrypt(padded)).decode("utf-8")


def generate_request(amount="1", name="Test User", email="test@email.com", phone="0909260339"):
    order_no = ''.join(random.choices(string.digits, k=5))

    txn_details = "|".join([
        AGGREGATOR_ID,
        MERCHANT_ID,
        order_no,
        amount,
        "ETH",
        "ETB",
        "SALE",
        "https://b1b88f72e1d8.ngrok-free.app/yagoutpay/success",
        "https://b1b88f72e1d8.ngrok-free.app/yagoutpay/failure",
        "WEB"
    ])

    # Pipe counts adjusted to exactly match docs
    pg_details = "|||"
    card_details = "|||||"
    cust_details = "|".join([name, email, phone, "", "Y"])
    bill_details = "|||||"
    ship_details = "|||||||"
    item_details = "||"
    upi_details = ""          # <-- empty string, NOT pipes
    other_details = "|||||"

    full_message = "~".join([
        txn_details,
        pg_details,
        card_details,
        cust_details,
        bill_details,
        ship_details,
        item_details,
        upi_details,
        other_details
    ])

    hash_input = f"{MERCHANT_ID}~{order_no}~{amount}~ETH~ETB"
    sha256_hex = hashlib.sha256(hash_input.encode()).hexdigest()

    enc_message = encrypt_aes(full_message)
    enc_hash = encrypt_aes(sha256_hex)

    return enc_message, enc_hash


@app.route("/pay")
def pay():
    enc_message, enc_hash = generate_request()

    html_form = f"""
    <!DOCTYPE html>
    <html>
    <body onload="document.forms[0].submit()">
      <form method="POST" action="{URL}">
        <input type="hidden" name="me_id" value="{MERCHANT_ID}" />
        <input type="hidden" name="merchant_request" value="{enc_message}" />
        <input type="hidden" name="hash" value="{enc_hash}" />
        <noscript><input type="submit" value="Pay Now" /></noscript>
      </form>
    </body>
    </html>
    """
    return Response(html_form, mimetype="text/html")


if __name__ == "__main__":
    app.run(port=5000, debug=True)
