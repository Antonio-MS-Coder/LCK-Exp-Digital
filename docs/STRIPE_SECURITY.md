# 🔒 Configuración Segura de Stripe

## 📋 Paso 1: Crear Producto en Stripe

1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/products)
2. Crea un producto:
   - **Nombre**: LCK Experience Digital - Acceso Completo
   - **Precio**: $500 MXN (pago único)
3. Copia el **Price ID** (empieza con `price_`)

## 🔑 Paso 2: Crear API Key Restringida

1. Ve a [API Keys](https://dashboard.stripe.com/apikeys)
2. Click en **+ Create restricted key**
3. Nombre: `LCK Experience Functions`
4. Permisos necesarios:

   | Recurso | Permisos |
   |---------|----------|
   | **Checkout Sessions** | ✅ Read ✅ Write |
   | **Customers** | ✅ Read |
   | **Payment Intents** | ✅ Read |
   | **Products** | ✅ Read |
   | **Prices** | ✅ Read |
   | **Webhook Endpoints** | ✅ Read |

5. Click **Create key**
6. Copia la clave (empieza con `rk_live_`)

## 🔗 Paso 3: Configurar Webhook

Ya está configurado en: `https://us-central1-lck-experience.cloudfunctions.net/stripeWebhook`

El Signing Secret que copiaste: `whsec_223fea6cf9cfb1c0f91f8948e28214800b22816f9a1db4b558b655b44ddabaa9`

## 🚀 Paso 4: Ejecutar Configuración

```bash
# Ejecuta el script seguro
./configure-stripe-secure.sh

# Te pedirá:
# 1. Price ID: price_xxxxx (del producto que creaste)
# 2. API Key: rk_live_xxxxx (la clave restringida)
# 3. Webhook Secret: whsec_223fea... (el que ya tienes)

# Después instala y despliega:
cd functions
npm install
cd ..
firebase deploy --only functions

# Finalmente, borra el script:
rm configure-stripe-secure.sh
```

## ✅ Validaciones Implementadas

### 1. **Producto Específico**
El sistema SOLO acepta pagos del producto con el Price ID configurado. Si alguien paga otro producto, se ignora.

### 2. **Pago Único**
```javascript
// Antes de crear sesión de pago:
if (usuario.hasPaid) → "Ya pagaste"
if (usuario.accessType === 'coupon') → "Ya tienes acceso con cupón"
```

### 3. **Webhook Seguro**
- Valida firma de Stripe
- Verifica que sea el producto correcto
- Solo procesa eventos de checkout completado

## 🎫 Sistema de Cupones

Los cupones funcionan independientemente:
- Usuario con cupón válido → **Acceso directo, NO paga**
- Usuario sin cupón → **Opción de pagar**
- Usuario que ya pagó → **Acceso permanente**

## 🔍 Verificación en Firebase

```javascript
// Usuario con cupón:
users/usuario_email/
  accessGranted: true
  accessType: "coupon"
  couponUsed: "LCK2025"

// Usuario que pagó:
users/usuario_email/
  accessGranted: true
  accessType: "paid"
  hasPaid: true
  paymentId: "pi_xxx"
  priceId: "price_xxx"  // Producto específico
```

## 🛡️ Seguridad

- ✅ API Key restringida (solo permisos necesarios)
- ✅ Webhook validates firma
- ✅ Producto específico validado
- ✅ Claves en Firebase Config (no en código)
- ✅ HTTPS obligatorio
- ✅ Pago único por email

## ⚠️ IMPORTANTE

**NUNCA**:
- Subas claves a Git
- Compartas la Secret Key
- Uses claves de TEST en producción

**SIEMPRE**:
- Usa claves restringidas
- Valida el producto específico
- Borra scripts con claves después de usar