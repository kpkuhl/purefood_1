import Stripe from 'stripe';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return res.status(500).json({ error: 'Stripe is not configured. Please check environment variables.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { amount, test_request_id, user_email } = req.body;

    if (!amount || !test_request_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata: {
        amount: amount.toString(),
        test_request_id: test_request_id.toString(),
        user_email: user_email || ''
      }
    });

    res.status(200).json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id
    });
  } catch (error) {
    console.error('Error creating SetupIntent:', error);
    res.status(500).json({ error: error.message });
  }
}
