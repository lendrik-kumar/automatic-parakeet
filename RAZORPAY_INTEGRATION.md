# Razorpay Payment Integration - API Documentation

## Overview

This document describes the Razorpay payment integration for the Sprint Shoes E-Commerce platform. The integration supports:

- ✅ Multi-currency payments (USD & INR)
- ✅ Automatic payment capture
- ✅ Signature verification for security
- ✅ Webhook handling for payment status updates
- ✅ Cash on Delivery (COD) support
- ✅ Idempotent payment processing

## Environment Configuration

Required environment variables (already configured in `.env`):

```env
RAZORPAY_KEY_ID=rzp_test_SVRkXmuJFZJllF
RAZORPAY_KEY_SECRET=nSAwpNgcVli2UaSD7f6Z8vN5
RAZORPAY_WEBHOOK_SECRET=<optional-for-production>
RAZORPAY_CAPTURE_MODE=automatic
RAZORPAY_DEFAULT_CURRENCY=INR
RAZORPAY_PAYMENT_TIMEOUT=15
```

---

## Payment Flow

### Step 1: Create Order & Initiate Payment

**Endpoint**: `POST /api/orders/process-payment`  
**Authentication**: Required (User JWT token)  
**Description**: Creates an order and initiates payment (or marks as PENDING for COD)

**Request Body**:
```json
{
  "addressId": "clxxx...",
  "couponCode": "SUMMER20",  // Optional
  "paymentMethod": "RAZORPAY"  // or "COD"
}
```

**Response (Razorpay Payment)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "clxxx...",
      "orderNumber": "ORD-1234567890",
      "status": "PENDING",
      "totalAmount": "15999.00",
      "currency": "INR",
      "items": [...]
    },
    "payment": {
      "id": "clyyy...",
      "status": "PENDING",
      "paymentMethod": "RAZORPAY",
      "razorpayOrderId": "order_NZXjlaFCVU9VBz",
      "amount": "15999.00",
      "currency": "INR"
    },
    "razorpayConfig": {
      "keyId": "rzp_test_SVRkXmuJFZJllF",
      "orderId": "order_NZXjlaFCVU9VBz",
      "amount": 1599900,  // Amount in paise (INR) or cents (USD)
      "currency": "INR",
      "name": "Sprint Shoes",
      "description": "Order #ORD-1234567890",
      "prefill": {
        "name": "John Doe",
        "email": "john@example.com",
        "contact": "+919876543210"
      }
    }
  }
}
```

**Response (COD Payment)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "clxxx...",
      "orderNumber": "ORD-1234567890",
      "status": "PENDING",
      "totalAmount": "15999.00",
      "currency": "INR"
    },
    "payment": {
      "id": "clyyy...",
      "status": "PENDING",
      "paymentMethod": "COD",
      "amount": "15999.00",
      "currency": "INR"
    }
  }
}
```

---

### Step 2: Frontend Opens Razorpay Checkout

Use the `razorpayConfig` from Step 1 response to open Razorpay checkout modal.

**Frontend Code Example** (React/Next.js):

```typescript
import { useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutPage() {
  const handlePayment = async () => {
    // Step 1: Call your API to create order
    const response = await fetch('http://localhost:3000/api/orders/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        addressId: 'clxxx...',
        paymentMethod: 'RAZORPAY',
      }),
    });

    const { data } = await response.json();

    // For COD, no need to open Razorpay
    if (data.payment.paymentMethod === 'COD') {
      // Redirect to order confirmation page
      window.location.href = `/orders/${data.order.id}`;
      return;
    }

    // Step 2: Open Razorpay checkout
    const options = {
      key: data.razorpayConfig.keyId,
      amount: data.razorpayConfig.amount,
      currency: data.razorpayConfig.currency,
      name: data.razorpayConfig.name,
      description: data.razorpayConfig.description,
      order_id: data.razorpayConfig.orderId,
      prefill: data.razorpayConfig.prefill,
      theme: {
        color: '#3399cc',
      },
      handler: async function (razorpayResponse: any) {
        // Step 3: Payment successful, verify on backend
        await verifyPayment({
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
          orderId: data.order.id,
        });
      },
      modal: {
        ondismiss: function () {
          alert('Payment cancelled');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const verifyPayment = async (paymentData: any) => {
    try {
      const response = await fetch('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.success) {
        // Payment verified successfully
        window.location.href = `/orders/${paymentData.orderId}/success`;
      } else {
        alert('Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Payment verification failed');
    }
  };

  return (
    <button onClick={handlePayment}>
      Proceed to Payment
    </button>
  );
}
```

**Load Razorpay Script**:

Add this to your `index.html` or load dynamically:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

### Step 3: Verify Payment

**Endpoint**: `POST /api/payments/verify`  
**Authentication**: Required (User JWT token)  
**Description**: Verifies payment signature and updates payment status

**Request Body**:
```json
{
  "razorpayOrderId": "order_NZXjlaFCVU9VBz",
  "razorpayPaymentId": "pay_NZXjlaFCVU9VBz",
  "razorpaySignature": "8f7e9d2c1b0a3f4e5d6c7b8a9f0e1d2c",
  "orderId": "clxxx..."  // Optional, for additional validation
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "id": "clyyy...",
      "status": "COMPLETED",
      "razorpayPaymentId": "pay_NZXjlaFCVU9VBz",
      "amount": "15999.00",
      "currency": "INR"
    },
    "order": {
      "id": "clxxx...",
      "orderNumber": "ORD-1234567890",
      "status": "CONFIRMED"
    }
  }
}
```

**Response (Failure)**:
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```

---

## Webhook Integration

**Endpoint**: `POST /api/payments/webhook`  
**Authentication**: Signature verification (no JWT required)  
**Description**: Receives payment status updates from Razorpay

**Headers**:
```
X-Razorpay-Signature: <webhook-signature>
Content-Type: application/json
```

**Supported Events**:
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `payment.authorized` - Payment authorized (manual capture)
- `order.paid` - Order marked as paid

**Webhook Configuration**:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`, `payment.authorized`, `order.paid`
4. Copy webhook secret and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

**Note**: The webhook endpoint automatically verifies the signature and processes payments idempotently (duplicate events are ignored).

---

## Currency Support

The system automatically detects currency based on amount format:

- **INR (Indian Rupees)**: Amount sent to Razorpay in **paise** (multiply by 100)
  - Example: ₹159.99 → 15999 paise
- **USD (US Dollars)**: Amount sent to Razorpay in **cents** (multiply by 100)
  - Example: $159.99 → 15999 cents

The currency is determined from the order's `totalAmount` or can be set via `RAZORPAY_DEFAULT_CURRENCY` env variable.

---

## Testing

### Test Card Details (Razorpay Test Mode)

**Successful Payment**:
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment**:
- Card Number: `4111 1111 1111 1112`
- CVV: Any 3 digits
- Expiry: Any future date

**UPI (Success)**:
- UPI ID: `success@razorpay`

**UPI (Failure)**:
- UPI ID: `failure@razorpay`

### Testing Webhooks Locally

Use ngrok or similar tool to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Add to Razorpay webhook: https://abc123.ngrok.io/api/payments/webhook
```

---

## Error Handling

### Common Errors

**1. Invalid signature** (400)
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```

**2. Payment already processed** (400)
```json
{
  "success": false,
  "message": "Payment already processed"
}
```

**3. Payment not found** (404)
```json
{
  "success": false,
  "message": "Payment not found"
}
```

**4. Razorpay API error** (500)
```json
{
  "success": false,
  "message": "Failed to create Razorpay order: <error-details>"
}
```

---

## Security Best Practices

1. ✅ **Always verify payment signature** on backend (never trust frontend)
2. ✅ **Use HTTPS** in production for webhook endpoint
3. ✅ **Configure webhook secret** in production
4. ✅ **Validate order amount** before processing payment
5. ✅ **Implement idempotency** to prevent duplicate processing
6. ✅ **Log all payment activities** for audit trail
7. ✅ **Never expose** `RAZORPAY_KEY_SECRET` to frontend

---

## Migration from Mock to Production

When ready to go live:

1. **Get production keys** from Razorpay Dashboard
2. **Update environment variables**:
   ```env
   RAZORPAY_KEY_ID=rzp_live_XXX
   RAZORPAY_KEY_SECRET=XXX
   RAZORPAY_WEBHOOK_SECRET=XXX
   ```
3. **Configure production webhook** in Razorpay Dashboard
4. **Test with real transactions** (small amounts first)
5. **Monitor webhook logs** for any issues

---

## Troubleshooting

### Payment stuck in PENDING status

**Cause**: Webhook not configured or failing  
**Solution**: Check Razorpay webhook logs, verify webhook secret

### Signature verification fails

**Cause**: Incorrect key secret or webhook secret  
**Solution**: Verify environment variables match Razorpay Dashboard

### Cannot create Razorpay order

**Cause**: Invalid API keys or network issue  
**Solution**: Check logs for exact error, verify API keys

### Amount mismatch error

**Cause**: Amount not in smallest currency unit (paise/cents)  
**Solution**: Ensure amount is multiplied by 100 before sending to Razorpay

---

## Support

For Razorpay-specific issues:
- Documentation: https://razorpay.com/docs/
- Support: https://razorpay.com/support/

For integration issues:
- Check server logs: `npm run dev`
- Review payment records in database
- Test with Razorpay test cards
