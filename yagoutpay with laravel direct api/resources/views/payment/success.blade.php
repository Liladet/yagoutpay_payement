<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Success - YagoutPay</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .success-icon {
            font-size: 4rem;
            color: #28a745;
        }
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 0 30px rgba(40, 167, 69, 0.2);
            margin-top: 2rem;
        }
        body {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
        }
        .transaction-details {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card">
                    <div class="card-body text-center py-5">
                        <div class="success-icon mb-3">
                            ✅
                        </div>
                        <h2 class="card-title text-success mb-3">Payment Successful!</h2>
                        <p class="card-text lead">{{ $message }}</p>
                        
                        @if(!empty($data))
                        <div class="transaction-details text-start mt-4">
                            <h5 class="mb-3">Transaction Details:</h5>
                            <div class="row">
                                @foreach($data as $key => $value)
                                    @if(!empty($value))
                                    <div class="col-md-6 mb-2">
                                        <strong>{{ ucfirst(str_replace('_', ' ', $key)) }}:</strong> 
                                        <span class="text-muted">{{ $value }}</span>
                                    </div>
                                    @endif
                                @endforeach
                            </div>
                        </div>
                        @endif

                        <div class="mt-5">
                            <a href="{{ url('/') }}" class="btn btn-primary btn-lg">
                                Make Another Payment
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>