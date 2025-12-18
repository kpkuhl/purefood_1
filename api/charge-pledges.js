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

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the test request exists and is funded
    const { data: testRequest, error: requestError } = await supabase
      .from('test_requests')
      .select('id, current_funding, test_cost, status, product_name')
      .eq('id', test_request_id)
      .single();

    if (requestError) throw requestError;

    if (!testRequest) {
      return res.status(404).json({ error: 'Test request not found' });
    }

    // Check if funding goal is reached
    if (testRequest.current_funding < testRequest.test_cost) {
      return res.status(400).json({
        error: 'Funding goal not reached',
        current: testRequest.current_funding,
        goal: testRequest.test_cost
      });
    }

    // Fetch all pending pledges for this test request
    const { data: pledges, error: pledgesError } = await supabase
      .from('pledges')
      .select('id, amount, stripe_payment_method_id, user_id')
      .eq('test_request_id', test_request_id)
      .eq('status', 'pending');

    if (pledgesError) throw pledgesError;

    if (!pledges || pledges.length === 0) {
      return res.status(200).json({
        message: 'No pending pledges to charge',
        results: { success: [], failed: [] }
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Charge each pledge
    for (const pledge of pledges) {
      try {
        // Create and confirm payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: pledge.amount,
          currency: 'usd',
          payment_method: pledge.stripe_payment_method_id,
          confirm: true,
          off_session: true,
          metadata: {
            pledge_id: pledge.id.toString(),
            test_request_id: test_request_id.toString(),
            product_name: testRequest.product_name
          }
        });

        // Update pledge status to 'charged'
        const { error: updateError } = await supabase
          .from('pledges')
          .update({
            status: 'charged',
            charged_at: new Date().toISOString()
          })
          .eq('id', pledge.id);

        if (updateError) {
          console.error(`Error updating pledge ${pledge.id}:`, updateError);
        }

        results.success.push({
          pledge_id: pledge.id,
          amount: pledge.amount,
          payment_intent_id: paymentIntent.id
        });

        console.log(`Successfully charged pledge ${pledge.id} for $${pledge.amount / 100}`);

      } catch (error) {
        console.error(`Error charging pledge ${pledge.id}:`, error);

        // Update pledge status to 'failed'
        const { error: updateError } = await supabase
          .from('pledges')
          .update({ status: 'failed' })
          .eq('id', pledge.id);

        if (updateError) {
          console.error(`Error updating failed pledge ${pledge.id}:`, updateError);
        }

        results.failed.push({
          pledge_id: pledge.id,
          amount: pledge.amount,
          error: error.message
        });
      }
    }

    // Update test request status to 'funded' if all charges succeeded
    if (results.failed.length === 0) {
      const { error: statusError } = await supabase
        .from('test_requests')
        .update({ status: 'funded' })
        .eq('id', test_request_id);

      if (statusError) {
        console.error(`Error updating test request status:`, statusError);
      }
    }

    res.status(200).json({
      message: 'Pledges processed',
      results,
      summary: {
        total: pledges.length,
        successful: results.success.length,
        failed: results.failed.length,
        total_charged: results.success.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Error charging pledges:', error);
    res.status(500).json({ error: error.message });
  }
}
