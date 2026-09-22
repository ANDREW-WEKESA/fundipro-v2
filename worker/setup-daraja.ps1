# FundiPro - Daraja API Setup Script
# Run this script to configure M-Pesa credentials in Cloudflare Workers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FundiPro - Daraja API Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up M-Pesa Daraja API credentials." -ForegroundColor Yellow
Write-Host "You'll need credentials from: https://developer.safaricom.co.ke/" -ForegroundColor Yellow
Write-Host ""

# Function to set a secret
function Set-WorkerSecret {
    param (
        [string]$SecretName,
        [string]$Description
    )
    
    Write-Host "Setting: $SecretName" -ForegroundColor Green
    Write-Host "Description: $Description" -ForegroundColor Gray
    Write-Host "Enter value (it will be hidden): " -ForegroundColor White -NoNewline
    
    wrangler secret put $SecretName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $SecretName set successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to set $SecretName" -ForegroundColor Red
    }
    Write-Host ""
}

# Check if wrangler is installed
Write-Host "Checking for Wrangler CLI..." -ForegroundColor Cyan
$wranglerCheck = Get-Command wrangler -ErrorAction SilentlyContinue

if (-not $wranglerCheck) {
    Write-Host "✗ Wrangler CLI not found!" -ForegroundColor Red
    Write-Host "Please install it first: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Wrangler CLI found" -ForegroundColor Green
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "wrangler.jsonc")) {
    Write-Host "✗ wrangler.jsonc not found!" -ForegroundColor Red
    Write-Host "Please run this script from the worker directory:" -ForegroundColor Yellow
    Write-Host "  cd c:\dev\fundipro-v2\worker" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ In correct directory" -ForegroundColor Green
Write-Host ""

# Prompt for environment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Which environment are you setting up?" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Sandbox (for testing - use test credentials)" -ForegroundColor White
Write-Host "2. Production (for live payments - use production credentials)" -ForegroundColor White
Write-Host ""
$env = Read-Host "Enter choice (1 or 2)"

if ($env -eq "1") {
    Write-Host ""
    Write-Host "Setting up SANDBOX credentials..." -ForegroundColor Yellow
    Write-Host "Use test credentials from Daraja Portal sandbox environment." -ForegroundColor Yellow
    Write-Host ""
} elseif ($env -eq "2") {
    Write-Host ""
    Write-Host "Setting up PRODUCTION credentials..." -ForegroundColor Red
    Write-Host "WARNING: These will process real payments!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Are you sure? Type 'YES' to continue"
    if ($confirm -ne "YES") {
        Write-Host "Setup canceled." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 1: M-Pesa API Credentials" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-WorkerSecret -SecretName "MPESA_CONSUMER_KEY" -Description "Consumer Key from Daraja Portal"
Set-WorkerSecret -SecretName "MPESA_CONSUMER_SECRET" -Description "Consumer Secret from Daraja Portal"
Set-WorkerSecret -SecretName "MPESA_PASSKEY" -Description "Lipa Na M-Pesa Online Passkey"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 2: Business Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your Till Number: 1725732" -ForegroundColor Green
Write-Host ""
Set-WorkerSecret -SecretName "MPESA_SHORTCODE" -Description "Business Shortcode (enter: 1725732)"
Set-WorkerSecret -SecretName "MPESA_TILL_NUMBER" -Description "Till Number (enter: 1725732)"
Set-WorkerSecret -SecretName "PLATFORM_TILL_NUMBER" -Description "Platform Till Number (enter: 1725732)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 3: Support Contact Info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-WorkerSecret -SecretName "SUPPORT_WHATSAPP" -Description "Support WhatsApp (enter: 0107875549)"
Set-WorkerSecret -SecretName "SUPPORT_EMAIL" -Description "Support Email (enter: andrewwekesa675@gmail.com)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List all secrets
Write-Host "Verifying secrets..." -ForegroundColor Cyan
wrangler secret list

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($env -eq "1") {
    Write-Host "1. Verify DARAJA_BASE_URL is set to sandbox:" -ForegroundColor White
    Write-Host "   https://sandbox.safaricom.co.ke" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Deploy your worker:" -ForegroundColor White
    Write-Host "   npm run deploy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Test with sandbox phone: 254708374149" -ForegroundColor White
    Write-Host "   Test PIN: 1234" -ForegroundColor Gray
} else {
    Write-Host "1. Update DARAJA_BASE_URL to production:" -ForegroundColor White
    Write-Host "   Edit src/lib/mpesa.js line 6" -ForegroundColor Gray
    Write-Host "   Change to: https://api.safaricom.co.ke" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Register callback URL in Daraja Portal:" -ForegroundColor White
    Write-Host "   https://fundipro-api.andrewwekesa675.workers.dev/api/payments/mpesa-callback" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Deploy your worker:" -ForegroundColor White
    Write-Host "   npm run deploy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Test with real phone number and small amount first" -ForegroundColor White
}

Write-Host ""
Write-Host "Setup script completed!" -ForegroundColor Green
Write-Host ""
