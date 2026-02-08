# PureFood - Crowdfunded Food Testing Platform

**Live Demo:** [https://kpkuhl.github.io/purefood_1/](https://kpkuhl.github.io/purefood_1/)

## Overview

PureFood is a crowdfunding platform that enables consumers to collectively fund laboratory testing of everyday food products. Instead of relying on guesswork about what's in your food, PureFood provides data-driven insights through professional lab testing for contaminants like heavy metals, pesticides, PFAS, and microplastics.

## Features

- **Food Test Requests**: Users can submit requests to test specific food products
- **Crowdfunding System**: Community members can pledge to support test requests
- **Stripe Integration**: Secure payment processing with conditional charging (only charged when funding goals are met)
- **User Authentication**: Secure sign-up and login system powered by Supabase
- **Progress Tracking**: Real-time funding progress bars for each test request
- **User Profiles**: View your test requests and pledges
- **Educational Content**: Information about which foods benefit most from testing

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Serverless functions (Vercel)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe (SetupIntent API for conditional charging)
- **Deployment**: GitHub Pages / Vercel

## Available Test Types

- **Heavy Metals**: Testing for lead, arsenic, mercury, and cadmium
- **Pesticides**: Detection of common agricultural chemicals
- **PFAS**: Forever chemicals testing
- **Microplastics**: Plastic contamination analysis

## Getting Started

### Prerequisites

- Node.js (for local development)
- Supabase account
- Stripe account

### Environment Variables

Create environment variables in your deployment platform (Vercel):

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Database Setup

Follow the instructions in [DATABASE_SETUP.md](DATABASE_SETUP.md) to set up your Supabase database tables and Row Level Security policies.

### Stripe Configuration

See [STRIPE_INTEGRATION.md](STRIPE_INTEGRATION.md) for details on how the Stripe payment integration works with conditional charging.

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/kpkuhl/purefood_1.git
cd purefood_1
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables (see above)

4. Deploy serverless functions to Vercel or run locally with Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

5. Open your browser to `http://localhost:3000`

## Project Structure

```
purefood_1/
├── index.html                 # Main landing page
├── auth.html                  # Sign in/sign up page
├── food-test-request.html     # Submit new test requests
├── test-request-detail.html   # View individual test request details
├── test-type-selection.html   # Select types of tests to run
├── profile.html               # User profile and pledges
├── foods-benefit.html         # Educational content
├── api/                       # Serverless functions
│   ├── config.js              # Configuration endpoint
│   ├── create-setup-intent.js # Stripe payment setup
│   ├── charge-pledges.js      # Process successful funding
│   └── expire-pledges.js      # Handle expired requests
├── DATABASE_SETUP.md          # Database schema documentation
├── STRIPE_INTEGRATION.md      # Stripe integration guide
├── package.json
└── vercel.json                # Vercel deployment configuration
```

## How It Works

1. **Request Submission**: Users submit test requests for specific food products, selecting which tests to run
2. **Funding Period**: Each request has an active period (1-90 days) to reach its funding goal
3. **Pledge Collection**: Other users pledge money to support the test request
4. **Payment Authorization**: Payment methods are authorized but not charged immediately using Stripe SetupIntents
5. **Conditional Charging**:
   - If funding goal is reached: All pledges are charged and testing proceeds
   - If funding goal is not reached: No charges occur and pledges expire
6. **Test Results**: Results are published once testing is complete (coming soon)

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/kpkuhl/purefood_1/issues).
