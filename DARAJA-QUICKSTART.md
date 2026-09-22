# Daraja API - Quick Start Guide

Get M-Pesa STK Push working in 15 minutes!

## Prerequisites

- ✅ Cloudflare Workers account
- ✅ Safaricom M-Pesa Till Number: **1725732**
- ⏳ Daraja API account (we'll create this)

---

## 5-Step Setup

### Step 1: Register on Daraja (5 min)

1. Go to: https://developer.safaricom.co.ke/
2. Click "Sign Up" and create account
3. Verify email and phone number
4. Log in to dashboard

### Step 2: Create App (2 min)

1. Click "My Apps" → "Add a New App"
2. Name: `FundiPro Payment`
3. Select API: **Lipa Na M-Pesa Online**
4. Click "Create App"

### Step 3: Get Credentials (2 min)

From your app dashboard, copy:

- **Consumer Key** (looks like: `a1B2c3D4e5F6g7H8`)
- **Consumer Secret** (looks like: `A1B2C3D4E5F6G7H8`)
- Go to APIs → Lipa Na M-Pesa Online → Copy **Passkey** (long string)

**Start with SANDBOX credentials for testing!**

### Step 4: Configure Cloudflare (3 min)

Run the setup script:

```powershell
cd c:\dev\fundipro-v2\worker
.\setup-daraja.ps1
```

The script will prompt you to enter:
1. Consumer Key
2. Consumer Secret
3. Passkey
4. Shortcode: `1725732`
5. Till Number: `1725732`
6. Support contacts

**Or do it manually:**

```powershell
wrangler secret put MPESA_CONSUMER_KEY       # Paste your Consumer Key
wrangler secret put MPESA_CONSUMER_SECRET    # Paste your Consumer Secret
wrangler secret put MPESA_PASSKEY            # Paste your Passkey
wrangler secret put MPESA_SHORTCODE          # Enter: 1725732
wrangler secret put MPESA_TILL_NUMBER        # Enter: 1725732
wrangler secret put PLATFORM_TILL_NUMBER     # Enter: 1725732
wrangler secret put SUPPORT_WHATSAPP         # Enter: 0107875549
wrangler secret put SUPPORT_EMAIL            # Enter: andrewwekesa675@gmail.com
```

### Step 5: Deploy (3 min)

```powershell
# 1. Run database migration
wrangler d1 execute fundipro-db --remote --file=./migrations/0002_add_till_number.sql
# Type 'Y' when prompted

# 2. Deploy worker
npm run deploy

# 3. Build and deploy frontend
cd ../client
npm run build
vercel --prod
```

---

## Test It!

### Sandbox Testing (Recommended First)

1. **Go to:** https://fundipro-v21.vercel.app
2. **Log in** as a Pro fundi (or create one)
3. **Navigate to:** "Your Storefront" page
4. **Click:** "Pay Now with M-Pesa STK Push"
5. **Watch:** Status changes on screen

**For sandbox, it auto-succeeds after a few seconds!**

### Test with Real Phone (Sandbox)

Temporarily update your fundi's phone to sandbox test number:

```sql
UPDATE users SET phone = '254708374149' WHERE id = 'your-user-id';
```

Then click "Pay Now with M-Pesa STK Push"

**Sandbox test numbers:**
- `254708374149` - Always succeeds ✅
- `254708374150` - Always fails ❌
- Test PIN: `1234`

---

## Go Live (Production)

When ready for real payments:

### 1. Get Production Credentials

- In Daraja Portal, switch to **Production** environment
- Get new Consumer Key, Secret, and Passkey
- Re-run setup script with production values

### 2. Update Code

Edit `worker/src/lib/mpesa.js` line 6:

```javascript
// Change from:
const DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke";

// To:
const DARAJA_BASE_URL = "https://api.safaricom.co.ke";
```

### 3. Register Callback

In Daraja Portal production app:
- Add callback URL: `https://fundipro-api.andrewwekesa675.workers.dev/api/payments/mpesa-callback`

### 4. Deploy Again

```powershell
cd c:\dev\fundipro-v2\worker
npm run deploy
```

### 5. Test with KES 1

- Use a real phone number
- Try KES 1 payment first
- Verify callback is received
- Then enable full KES 1200 payments

---

## Monitoring

### View Live Logs

```powershell
wrangler tail
```

Shows:
- STK Push requests
- M-Pesa callbacks
- Payment status updates
- Errors

### Check Payments

```powershell
wrangler d1 execute fundipro-db --remote --command="SELECT * FROM payments ORDER BY created_at DESC LIMIT 10"
```

### Test Script

```powershell
.\test-stk-push.ps1
```

---

## Troubleshooting

### "M-Pesa credentials not configured"

```powershell
wrangler secret list  # Verify secrets exist
wrangler secret put MPESA_CONSUMER_KEY  # Re-add if missing
```

### "STK Push failed"

- Check phone format: must be `254XXXXXXXXX`
- Verify Consumer Key/Secret are correct
- Check Daraja API status

### "Callback not received"

- Ensure worker is deployed (not local dev)
- Verify callback URL in Daraja Portal
- Check `wrangler tail` logs

### "Payment stuck in pending"

- Customer may have canceled
- Wait 60 seconds, then check status
- Query M-Pesa confirmation SMS

---

## Cost & Limits

**Safaricom Charges:**
- ~1-2% + KES 1-5 per transaction
- For KES 1200: ~KES 15-30 per payment
- Charged to merchant (you)

**API Limits:**
- Daraja: ~10 requests/second
- Cloudflare: 100,000 requests/day (free)

---

## Quick Reference

| What | Value |
|------|-------|
| **Till Number** | 1725732 |
| **API URL** | https://fundipro-api.andrewwekesa675.workers.dev |
| **Callback URL** | /api/payments/mpesa-callback |
| **Frontend** | https://fundipro-v21.vercel.app |
| **Sandbox Test Phone** | 254708374149 |
| **Test PIN** | 1234 |

---

## Need Help?

- **Daraja Support:** support@safaricom.co.ke
- **Daraja Docs:** https://developer.safaricom.co.ke/docs
- **Check Status:** *234# (Safaricom line)

---

## Files Reference

- `worker/src/lib/mpesa.js` - M-Pesa integration
- `worker/src/routes/payments.js` - Payment endpoints
- `worker/setup-daraja.ps1` - Setup script
- `worker/test-stk-push.ps1` - Test script
- `client/src/pages/fundi/StorefrontEditor.jsx` - Payment UI

---

That's it! You should now have M-Pesa STK Push working. 🎉
