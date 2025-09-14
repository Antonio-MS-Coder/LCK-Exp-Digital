# LCK Experience Digital - Setup Guide

## 🚀 Quick Setup with Firebase

### Prerequisites
- Node.js installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Stripe Payment Link created

## Step 1: Firebase Setup

### 1.1 Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 1.2 Login to Firebase
```bash
firebase login
```

### 1.3 Initialize Firebase (Already configured)
The project is already configured with your Firebase project `lck-experience`.

## Step 2: Set Up Coupons in Firebase

### 2.1 Go to Firebase Console
1. Visit https://console.firebase.google.com
2. Select your project "lck-experience"
3. Go to Realtime Database

### 2.2 Add Coupon Codes
Add this structure to your database:
```json
{
  "coupons": {
    "LCK2025VIP": {
      "active": true,
      "description": "Boleto del Evento",
      "maxUses": 100,
      "usedCount": 0
    },
    "EARLY2025": {
      "active": true,
      "description": "Early Bird Special",
      "maxUses": 50,
      "usedCount": 0
    },
    "DEMO2025": {
      "active": true,
      "description": "Demo Access"
    }
  }
}
```

## Step 3: Upload Conference Videos

### 3.1 Go to Firebase Storage
1. In Firebase Console, go to Storage
2. Create folders: `conferences/day1/` and `conferences/day2/`

### 3.2 Upload Videos
Upload your videos with these exact names:
- `conferences/day1/apertura.mp4`
- `conferences/day1/transformacion-personal.mp4`
- `conferences/day1/liderazgo-consciente.mp4`
- `conferences/day2/bienvenida-dia2.mp4`
- `conferences/day2/innovacion-creatividad.mp4`

## Step 4: Configure Stripe Payment Link

### 4.1 Create Payment Link in Stripe
1. Go to https://dashboard.stripe.com
2. Create a Payment Link for $1,499 MXN
3. Set success URL to: `https://lck-experience.web.app/?success=true`
4. Enable "Don't show confirmation page"

### 4.2 Update Payment Link in Code
Edit `js/main.js` line 2:
```javascript
const STRIPE_PAYMENT_LINK = 'YOUR_ACTUAL_STRIPE_LINK_HERE';
```

## Step 5: Deploy to Firebase Hosting

### 5.1 Build and Deploy
```bash
# Deploy everything
firebase deploy

# Or deploy only hosting
firebase deploy --only hosting
```

Your site will be live at: https://lck-experience.web.app

## Step 6: Test the Platform

### Test Coupon Access
1. Go to https://lck-experience.web.app
2. Click "Tengo un Código"
3. Use code: `DEMO2025`
4. Enter any email
5. You should get access to conferences

### Test Payment Flow
1. Click "Comprar Acceso"
2. Enter email
3. Click "Continuar con Pago Seguro"
4. Complete payment in Stripe
5. Return to site with access granted

## 📊 Firebase Console Links

- **Project Console**: https://console.firebase.google.com/project/lck-experience
- **Realtime Database**: https://console.firebase.google.com/project/lck-experience/database
- **Storage**: https://console.firebase.google.com/project/lck-experience/storage
- **Hosting**: https://console.firebase.google.com/project/lck-experience/hosting
- **Analytics**: https://console.firebase.google.com/project/lck-experience/analytics

## 🔧 Maintenance

### Add New Coupons
In Firebase Realtime Database, add to `coupons/`:
```json
{
  "NEWCODE2025": {
    "active": true,
    "description": "New Promotion",
    "maxUses": 10
  }
}
```

### View Coupon Usage
Check `coupon_usage/` in Realtime Database to see:
- Who used which code
- When it was used
- Email addresses

### Update Videos
1. Upload new video to Storage
2. Update `videoLibrary` in `js/conference.js`
3. Redeploy: `firebase deploy --only hosting`

## 🚨 Troubleshooting

### Videos Not Playing
- Check Storage rules allow public read
- Verify video format is MP4
- Check file paths match exactly

### Coupons Not Working
- Verify Realtime Database rules allow read
- Check coupon is marked as `active: true`
- Verify code matches exactly (case-sensitive)

### Payment Not Granting Access
- Ensure Stripe success URL includes `?success=true`
- Check browser allows localStorage
- Verify return URL is correct

## 💰 Cost Estimates

- **Firebase Hosting**: Free (10GB/month)
- **Firebase Storage**: ~$5-10/month for videos
- **Realtime Database**: Free tier sufficient
- **Total**: ~$10/month

## 📞 Support

For Firebase issues: https://firebase.google.com/support
For Stripe issues: https://support.stripe.com