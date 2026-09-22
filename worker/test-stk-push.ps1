# Test STK Push Integration
# This script tests if your M-Pesa STK Push is working correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FundiPro - STK Push Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "https://fundipro-api.andrewwekesa675.workers.dev"
$TEST_PHONE = "254708374149"  # Sandbox test number (always succeeds)

Write-Host "Testing API endpoint: $API_URL" -ForegroundColor Yellow
Write-Host ""

# Test 1: Check if API is reachable
Write-Host "Test 1: Checking API health..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$API_URL/api/health" -Method Get
    Write-Host "✓ API is reachable" -ForegroundColor Green
    Write-Host "  Response: $($health | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ API is not reachable" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Check config endpoint
Write-Host "Test 2: Checking config endpoint..." -ForegroundColor Cyan
try {
    $config = Invoke-RestMethod -Uri "$API_URL/api/config" -Method Get
    Write-Host "✓ Config endpoint works" -ForegroundColor Green
    Write-Host "  Till Number: $($config.platform_till_number)" -ForegroundColor Gray
    Write-Host "  Support: $($config.support_whatsapp)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Config endpoint failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Test authentication (you'll need a valid token)
Write-Host "Test 3: STK Push Endpoint Test" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test STK Push, you need to:" -ForegroundColor Yellow
Write-Host "1. Log in to FundiPro web app" -ForegroundColor White
Write-Host "2. Open browser DevTools (F12)" -ForegroundColor White
Write-Host "3. Go to Application → Local Storage" -ForegroundColor White
Write-Host "4. Copy the 'token' value" -ForegroundColor White
Write-Host ""
$token = Read-Host "Paste your auth token (or press Enter to skip)"

if ($token) {
    Write-Host ""
    Write-Host "Testing STK Push with token..." -ForegroundColor Cyan
    
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $body = @{
            tier = "pro"
            phone = $TEST_PHONE
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$API_URL/api/payments/stk-push" -Method Post -Headers $headers -Body $body
        
        Write-Host "✓ STK Push initiated successfully!" -ForegroundColor Green
        Write-Host "  Payment ID: $($response.paymentId)" -ForegroundColor Gray
        Write-Host "  Checkout Request ID: $($response.checkoutRequestID)" -ForegroundColor Gray
        Write-Host "  Message: $($response.message)" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "Waiting for callback (30 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Check payment status
        Write-Host "Checking payment status..." -ForegroundColor Cyan
        $status = Invoke-RestMethod -Uri "$API_URL/api/payments/$($response.paymentId)/status" -Method Get -Headers $headers
        
        Write-Host "Payment Status: $($status.payment.status)" -ForegroundColor $(if ($status.payment.status -eq "success") { "Green" } else { "Yellow" })
        Write-Host "M-Pesa Ref: $($status.payment.mpesa_ref)" -ForegroundColor Gray
        
    } catch {
        Write-Host "✗ STK Push test failed" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Skipped authentication test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Manual Testing:" -ForegroundColor Yellow
Write-Host "1. Go to: https://fundipro-v21.vercel.app" -ForegroundColor White
Write-Host "2. Log in as a Pro/Business fundi" -ForegroundColor White
Write-Host "3. Go to 'Your Storefront' page" -ForegroundColor White
Write-Host "4. Click 'Pay Now with M-Pesa STK Push'" -ForegroundColor White
Write-Host "5. Check your phone for payment prompt" -ForegroundColor White
Write-Host ""
Write-Host "For Sandbox testing:" -ForegroundColor Yellow
Write-Host "- Use phone: 254708374149 (always succeeds)" -ForegroundColor White
Write-Host "- Use PIN: 1234" -ForegroundColor White
Write-Host ""
Write-Host "Monitor logs:" -ForegroundColor Yellow
Write-Host "  wrangler tail" -ForegroundColor White
Write-Host ""
