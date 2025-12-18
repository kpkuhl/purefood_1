import Stripe from 'stripe';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { test_request_id } = req.body;

    if (!test_request_id) {
      return res.status(400).json({ error: 'Missing test_request_id' });
    }

    // This endpoint would be called by a backend process or webhook
    // when the funding goal is reached

    // Note: You'll need to fetch pledges from Supabase here
    // For now, this is a placeholder showing the Stripe charging logic

    const results = {
      success: [],
      failed: []
    };

    // Example of how to charge a saved payment method:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: pledgeAmount, // in cents
    //   currency: 'usd',
    //   payment_method: savedPaymentMethodId,
    //   customer: customerId, // optional but recommended
    //   confirm: true,
    //   metadata: {
    //     pledge_id: pledgeId,
    //     test_request_id: testRequestId
    //   }
    // });

    res.status(200).json({
      message: 'Pledges processed',
      results
    });
  } catch (error) {
    console.error('Error charging pledges:', error);
    res.status(500).json({ error: error.message });
  }
}
