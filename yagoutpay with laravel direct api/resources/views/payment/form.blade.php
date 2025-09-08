<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YagoutPay Payment</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .payment-container {
            max-width: 500px;
            margin: 50px auto;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            background: white;
        }
        .btn-pay {
            background-color: #007bff;
            border-color: #007bff;
            width: 100%;
            padding: 12px;
            font-size: 16px;
            font-weight: bold;
        }
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        body {
            background-color: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .form-label {
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="payment-container">
            <h2 class="text-center mb-4">YagoutPay Payment Gateway</h2>
            
            @if(session('error'))
                <div class="alert alert-danger alert-dismissible fade show">
                    {{ session('error') }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            @endif

            @if(session('success'))
                <div class="alert alert-success alert-dismissible fade show">
                    {{ session('success') }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            @endif

            <div class="loading" id="loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Redirecting to payment gateway...</p>
            </div>

            <form id="paymentForm">
                @csrf
                
                <div class="mb-3">
                    <label for="customer_name" class="form-label">Full Name *</label>
                    <input type="text" class="form-control" id="customer_name" name="customer_name" 
                           value="Test User" required>
                </div>

                <div class="mb-3">
                    <label for="email" class="form-label">Email Address *</label>
                    <input type="email" class="form-control" id="email" name="email" 
                           value="test@example.com" required>
                </div>

                <div class="mb-3">
                    <label for="mobile" class="form-label">Mobile Number *</label>
                    <input type="text" class="form-control" id="mobile" name="mobile" 
                           value="0909260339" required>
                </div>

                <div class="mb-3">
                    <label for="amount" class="form-label">Amount (ETB) *</label>
                    <input type="number" class="form-control" id="amount" name="amount" 
                           value="1" min="1" step="0.01" required>
                    <div class="form-text">Enter the amount in Ethiopian Birr</div>
                </div>

                <button type="submit" class="btn btn-primary btn-pay" id="submitBtn">
                    Proceed to Payment
                </button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.getElementById('paymentForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const formData = new FormData(this);
            
            // Show loading, hide button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            loading.style.display = 'block';
            
            try {
                const response = await fetch('{{ route("payment.initiate") }}', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                // ... existing code ...

if (data.success) {
    if (data.paymentUrl) {
        // Redirect to payment gateway (for card payments)
        window.location.href = data.paymentUrl;
    } else if (data.immediateSuccess) {
        // Payment was immediately successful (Telebirr wallet)
        alert('✅ Payment successful via Telebirr!\nTransaction ID: ' + 
              (data.transactionData.ag_ref || 'N/A') +
              '\nAmount: ' + (data.transactionData.amount || 'N/A') + ' ETB');
        
        // Redirect to success page with transaction data
        window.location.href = data.redirectUrl;
    }
} else {
    alert('Error: ' + data.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Proceed to Payment';
    loading.style.display = 'none';
}

// ... existing code ...
                
            } catch (error) {
                alert('An error occurred: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Proceed to Payment';
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>