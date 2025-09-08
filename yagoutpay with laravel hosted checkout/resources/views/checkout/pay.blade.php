<!DOCTYPE html>
<html>
<head>
    <title>Payment Redirect</title>
</head>
<body onload="document.forms[0].submit()">
    <form method="POST" action="{{ $url }}">
        <input type="hidden" name="me_id" value="{{ $merchant_id }}" />
        <input type="hidden" name="merchant_request" value="{{ $enc_message }}" />
        <input type="hidden" name="hash" value="{{ $enc_hash }}" />
        <noscript><input type="submit" value="Pay Now" /></noscript>
    </form>
</body>
</html>