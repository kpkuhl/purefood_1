export default async function handler(req, res) {
  // Verify this is a cron job request
  // Option 1: Use Vercel's built-in cron secret (recommended)
  // Vercel automatically sets CRON_SECRET for cron jobs
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Import Supabase dynamically
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find expired test requests that haven't reached funding goal
    const { data: expiredRequests, error: queryError } = await supabase
      .from('test_requests')
      .select('id, current_funding, test_cost, product_name')
      .lt('expiration_date', new Date().toISOString())
      .eq('status', 'pending');

    if (queryError) throw queryError;

    const results = {
      expired_count: 0,
      pledges_cancelled: 0,
      expired_requests: []
    };

    if (!expiredRequests || expiredRequests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No expired requests found',
        results
      });
    }

    // Process each expired request
    for (const request of expiredRequests) {
      // Only expire if funding goal was not reached
      if ((request.current_funding || 0) < (request.test_cost || 0)) {
        // Update test request status to 'expired'
        const { error: updateError } = await supabase
          .from('test_requests')
          .update({ status: 'expired' })
          .eq('id', request.id);

        if (updateError) {
          console.error(`Error updating test request ${request.id}:`, updateError);
          continue;
        }

        // Cancel all pending pledges for this request
        const { data: cancelledPledges, error: cancelError } = await supabase
          .from('pledges')
          .update({ status: 'cancelled' })
          .eq('test_request_id', request.id)
          .eq('status', 'pending')
          .select('id');

        if (cancelError) {
          console.error(`Error cancelling pledges for request ${request.id}:`, cancelError);
          continue;
        }

        results.expired_count++;
        results.pledges_cancelled += cancelledPledges?.length || 0;
        results.expired_requests.push({
          id: request.id,
          product_name: request.product_name,
          pledges_cancelled: cancelledPledges?.length || 0
        });

        console.log(`Expired request ${request.id} (${request.product_name}), cancelled ${cancelledPledges?.length || 0} pledges`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Expiration check completed',
      results
    });
  } catch (error) {
    console.error('Error in expire-pledges cron:', error);
    res.status(500).json({ error: error.message });
  }
}
