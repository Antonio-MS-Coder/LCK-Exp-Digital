# LCK Experience Digital - Conference Platform

A modern, secure digital conference platform for LCK Experience 2025 with Stripe payment integration and coupon system.

## Features

- 🎫 **Dual Access System**: Pay with Stripe or use a coupon code
- 💳 **Secure Payments**: Stripe integration for credit card payments
- 🎥 **Live Streaming**: Real-time conference streaming with multi-language support
- 💬 **Live Chat**: Interactive chat during conferences
- 📅 **Schedule Management**: Day-by-day conference schedule
- 📱 **Responsive Design**: Works on all devices
- 🔐 **JWT Authentication**: Secure user sessions
- 📊 **MongoDB Database**: User and payment data management

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Payment**: Stripe API
- **Authentication**: JWT
- **Styling**: Custom CSS with CSS Variables

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Stripe Account

### Installation

1. Clone the repository:
```bash
cd "LCK Experience Digital"
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- Stripe API keys
- JWT secret
- Port number

4. Update Stripe public key:
Edit `js/main.js` and replace:
```javascript
const STRIPE_PUBLIC_KEY = 'pk_test_YOUR_STRIPE_PUBLIC_KEY';
```

### Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Configuration

### Valid Coupon Codes

Default coupon codes (modify in `server/server.js`):
- `LCK2025VIP` - Event ticket holders
- `EARLY2025` - Early bird special
- `SPEAKER2025` - Speaker access

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add webhook endpoint: `https://yourdomain.com/webhook/stripe`
4. Configure webhook to listen for `payment_intent.succeeded` events

### MongoDB Schema

**Users Collection:**
```javascript
{
  email: String,
  couponCode: String (optional),
  couponType: String (optional),
  paymentStatus: String,
  paymentIntentId: String (optional),
  accessType: String ('coupon' | 'paid'),
  createdAt: Date,
  paidAt: Date (optional),
  active: Boolean
}
```

**Payments Collection:**
```javascript
{
  email: String,
  paymentIntentId: String,
  amount: Number,
  currency: String,
  createdAt: Date
}
```

## Project Structure

```
LCK Experience Digital/
├── index.html              # Landing page
├── conference.html         # Conference streaming page
├── css/
│   ├── styles.css         # Landing page styles
│   └── conference.css     # Conference page styles
├── js/
│   ├── main.js           # Landing page logic & Stripe
│   └── conference.js     # Conference page logic
├── server/
│   └── server.js         # Express server & API
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

- `POST /api/validate-coupon` - Validate coupon code
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `POST /api/activate-user` - Activate user after payment
- `GET /api/conference-access` - Get conference access (protected)
- `POST /webhook/stripe` - Stripe webhook handler

## Deployment

### Recommended Platforms

- **Frontend**: Vercel, Netlify, or GitHub Pages
- **Backend**: Heroku, Railway, or Render
- **Database**: MongoDB Atlas

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=strong-random-secret
```

## Security Considerations

- Always use HTTPS in production
- Keep API keys secure
- Implement rate limiting
- Add CORS restrictions
- Use strong JWT secrets
- Enable MongoDB authentication
- Implement proper error handling
- Add logging for audit trails

## Support

For issues or questions, contact the LCK Experience technical team.

## License

© 2025 LCK Experience. All rights reserved.