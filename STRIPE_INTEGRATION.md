# Stripe Integration for PureFood

This document explains how to integrate Stripe for delayed pledge charging using SetupIntents.

## Overview

The application uses Stripe SetupIntents to securely collect payment methods without charging immediately. Charges are only processed when:
1. The funding pool reaches 100% of the goal
2. OR the test request expires (after 1-90 days)

## Setup Steps

### 1. Install Dependencies

```bash
npm install stripe
```

### 2. Set Environment Variables

Add these to your Vercel environment variables:

- `STRIPE_SECRET_KEY` - Your Stripe secret key (sk_test_... or sk_live_...)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (pk_test_... or pk_live_...)

Get these from: https://dashboard.stripe.com/apikeys

### 3. Update Database Schema

Run the SQL commands in `DATABASE_SETUP.md` to add:
- `expiration_date` and `active_days` columns to `test_requests`
- `stripe_payment_method_id`, `stripe_setup_intent_id`, and `status` columns to `pledges`

### 4. Frontend Integration

You'll need to add Stripe.js to your HTML pages where pledges are collected:

```html
<script src="https://js.stripe.com/v3/"></script>
```

## Pledge Flow

### Step 1: User Initiates Pledge

When a user clicks "Pledge $X" on a test request:

1. Call `/api/create-setup-intent` with:
   - `amount` (in cents)
   - `test_request_id`
   - `user_email`

2. The API returns a `client_secret`

### Step 2: Collect Payment Method

Use Stripe Elements to securely collect card details:

```javascript
const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

// When user submits
const {error, setupIntent} = await stripe.confirmCardSetup(
  clientSecret,
  {
    payment_method: {
      card: cardElement,
    }
  }
);

if (!error) {
  // Save to database:
  // - setupIntent.id as stripe_setup_intent_id
  // - setupIntent.payment_method as stripe_payment_method_id
  // - amount
  // - user_id
  // - test_request_id
  // - status: 'pending'
}
```

### Step 3: Store Pledge in Database

Insert into `pledges` table with:
- `user_id`
- `test_request_id`
- `amount`
- `stripe_payment_method_id`
- `stripe_setup_intent_id`
- `status: 'pending'`

Update `test_requests.current_funding` by adding the pledge amount.

### Step 4: Check if Pool is Full

After each pledge, check if `current_funding >= test_cost`:

```javascript
if (current_funding >= test_cost) {
  // Pool is full! Trigger charging process
  await fetch('/api/charge-pledges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_request_id })
  });
}
```

### Step 5: Charge All Pledges

When the pool fills (or you manually trigger it):

```javascript
// For each pledge with status='pending':
const paymentIntent = await stripe.paymentIntents.create({
  amount: pledge.amount,
  currency: 'usd',
  payment_method: pledge.stripe_payment_method_id,
  confirm: true,
  metadata: {
    pledge_id: pledge.id,
    test_request_id: pledge.test_request_id
  }
});

// Update pledge:
// - status: 'charged' (or 'failed')
// - charged_at: now()

// Update test_request:
// - status: 'funded'
```

### Step 6: Handle Expiration

For requests that don't reach 100% funding before expiration:

1. Run a scheduled job (e.g., Vercel Cron, GitHub Actions) daily
2. Find test_requests where:
   - `expiration_date < NOW()`
   - `status = 'pending'`
   - `current_funding < test_cost`

3. For each expired request:
   - Delete all associated pledges (or mark status='cancelled')
   - Update test_request status to 'expired'
   - Optionally: notify users their pledge was cancelled

## Example Pledge UI Component

```html
<div id="pledge-form">
  <input type="number" id="pledge-amount" placeholder="Enter pledge amount">
  <div id="card-element"></div>
  <button onclick="submitPledge()">Pledge</button>
  <div id="error-message"></div>
</div>

<script src="https://js.stripe.com/v3/"></script>
<script>
const stripe = Stripe('pk_test_YOUR_KEY');
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

async function submitPledge() {
  const amount = parseInt(document.getElementById('pledge-amount').value);
  const amountCents = Math.round(amount * 100);

  // Create SetupIntent
  const response = await fetch('/api/create-setup-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountCents,
      test_request_id: currentTestRequestId,
      user_email: currentUser.email
    })
  });

  const { client_secret } = await response.json();

  // Confirm card setup
  const {error, setupIntent} = await stripe.confirmCardSetup(client_secret, {
    payment_method: { card: cardElement }
  });

  if (error) {
    document.getElementById('error-message').textContent = error.message;
    return;
  }

  // Save to database
  await supabaseClient.from('pledges').insert({
    user_id: currentUser.id,
    test_request_id: currentTestRequestId,
    amount: amountCents,
    stripe_payment_method_id: setupIntent.payment_method,
    stripe_setup_intent_id: setupIntent.id,
    status: 'pending'
  });

  // Update current funding
  // ... (see existing code in index.html)

  alert('Pledge submitted! You will only be charged if the pool fills.');
}
</script>
```

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

Any future expiry date, any 3-digit CVC

## Security Notes

1. Never store raw card numbers - let Stripe handle all card data
2. Always use HTTPS in production
3. Validate amounts server-side before creating PaymentIntents
4. Use webhook signing to verify Stripe events
5. Consider adding Stripe Customer objects for better UX
6. Implement idempotency keys for charge operations

## Next Steps

1. Add the Stripe.js script to index.html
2. Replace current pledge flow with SetupIntent collection
3. Implement the charging logic in /api/charge-pledges.js
4. Set up a cron job for handling expirations
5. Add Stripe webhook endpoint for payment confirmations
6. Test the full flow with test mode credentials
7. Add proper error handling and user notifications
8. Consider adding email notifications for pledge status updates
