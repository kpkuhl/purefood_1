export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;

  // For debugging - remove after verification
  console.log('Environment variables available:', {
    hasNextPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasNextPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_ANON_KEY,
    hasStripeKey: !!stripePublishableKey
  });

  res.status(200).json({
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey,
    stripePublishableKey: stripePublishableKey,
    debug: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      hasStripeKey: !!stripePublishableKey
    }
  });
}
