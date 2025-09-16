# 🚀 Quick Setup Guide - LCK Experience Digital

## ✅ What's Already Done:
- ✅ Site deployed at: https://lck-experience.web.app
- ✅ Stripe Payment Link integrated ($1,499 MXN)
- ✅ Database rules configured
- ✅ Firebase Hosting active

## 📋 Steps to Complete Setup:

### 1️⃣ Add Coupon Codes (2 minutes)
1. Open this file in your browser:
   ```
   /Users/tonomurrieta/Desktop/Life Changing Knowledge/LCK Experience Digital/setup-coupons.html
   ```
2. Click "Agregar Cupones Iniciales" to add default codes:
   - `LCK2025VIP` - For event ticket holders
   - `EARLY2025` - Early bird special
   - `SPEAKER2025` - Speaker access
   - `DEMO2025` - For testing

### 2️⃣ Configure Stripe Settings (Important!)
1. Go to your Stripe Dashboard
2. Find your Payment Link settings
3. Set the success URL to:
   ```
   https://lck-experience.web.app/?success=true
   ```
4. Enable "Don't show Stripe's payment confirmation page"

### 3️⃣ Test Everything
1. **Test Coupon Access:**
   - Go to https://lck-experience.web.app
   - Click "Tengo un Código"
   - Use code: `DEMO2025`
   - Enter any email
   - You should get access ✅

2. **Test Payment:**
   - Click "Comprar Acceso"
   - Enter your email
   - Click "Continuar con Pago Seguro"
   - Complete test payment in Stripe
   - You'll return with access granted ✅

### 4️⃣ Upload Videos (When Ready)
1. Go to Firebase Console > Storage
2. Create folders:
   - `conferences/day1/`
   - `conferences/day2/`
3. Upload videos with these exact names:
   - `apertura.mp4`
   - `transformacion-personal.mp4`
   - `liderazgo-consciente.mp4`
   - etc.

## 🔧 Management Tools:

### View/Add Coupons:
Open `setup-coupons.html` in any browser

### View Usage Analytics:
Firebase Console > Realtime Database > `coupon_usage`

### Monitor Users:
Firebase Console > Analytics

## 🎯 Your Live URLs:
- **Main Site**: https://lck-experience.web.app
- **Firebase Console**: https://console.firebase.google.com/project/lck-experience
- **Stripe Dashboard**: https://dashboard.stripe.com

## 💡 Tips:
- Coupons are case-insensitive (users can type lowercase)
- Each coupon use is logged with email and timestamp
- Videos will show "Próximamente" until uploaded
- Payment success auto-grants access

## 🚨 Troubleshooting:
- **Coupon not working?** Check Firebase Realtime Database
- **Payment not granting access?** Verify Stripe success URL
- **Videos not playing?** Check Firebase Storage permissions

## Ready to Launch! 🎉
Your platform is fully functional and live!