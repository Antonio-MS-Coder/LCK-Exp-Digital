# Guía de Seguridad para API Keys - LCK Experience

## 🔐 Configuración de Restricciones para tu API Key

Tu API Key: `AIzaSyD_a4lOdRq1nwV5EV6XLkhnvNBjd9kGfjU`

### Paso 1: Acceder a Google Cloud Console
1. Ve a: https://console.cloud.google.com/apis/credentials?project=lck-experience
2. Busca tu API key en la lista

### Paso 2: Configurar Restricciones de Aplicación
1. Haz clic en tu API key para editarla
2. En "Application restrictions", selecciona **"HTTP referrers (websites)"**
3. Agrega estos referrers permitidos:
   ```
   https://lck-experience.web.app/*
   https://lck-experience.firebaseapp.com/*
   http://localhost:*
   http://127.0.0.1:*
   ```

### Paso 3: Configurar Restricciones de API
1. En "API restrictions", selecciona **"Restrict key"**
2. Marca SOLO estas APIs necesarias:
   - ✅ Firebase Auth API
   - ✅ Firebase Realtime Database API
   - ✅ Cloud Storage for Firebase API
   - ✅ Firebase Installations API
   - ✅ Identity Toolkit API
   - ✅ Token Service API

### Paso 4: Guardar Cambios
1. Haz clic en **"SAVE"**
2. Los cambios toman efecto en 5-10 minutos

## ⚠️ IMPORTANTE: Llaves Sensibles

### Llaves que NUNCA deben estar en GitHub:
- ❌ **Stripe Secret Key** (sk_live_...)
- ❌ **Firebase Admin SDK Service Account**
- ❌ **Webhook Secrets**

### Llaves que SÍ pueden estar públicas (con restricciones):
- ✅ **Firebase Web API Key** (con restricciones HTTP)
- ✅ **Stripe Publishable Key** (pk_live_...)

## 🛡️ Configuración Actual de Seguridad

### Firebase Security Rules
- **Realtime Database**: Configurado en `database.rules.json`
- **Storage**: Configurado en `storage.rules`

### Stripe
- **Publishable Key**: `pk_live_xIt38KoSpBKHsLEG6SN4fb7K00zKbJ96Qj` (OK público)
- **Secret Key**: Debe estar SOLO en Firebase Functions environment config

## 📝 Verificación de Seguridad

### Para verificar que las restricciones funcionan:
1. Abre la consola del navegador (F12)
2. Ve a tu sitio: https://lck-experience.web.app
3. Verifica que Firebase funciona normalmente
4. Intenta usar la API key desde otro dominio - debe ser rechazada

### Monitoreo de Uso
1. Ve a: https://console.cloud.google.com/apis/dashboard?project=lck-experience
2. Revisa el uso de APIs
3. Configura alertas de cuota si es necesario

## 🚨 Si tu llave fue comprometida:

1. **Regenera la llave inmediatamente** en Google Cloud Console
2. **Actualiza** `firebase-config.js` con la nueva llave
3. **Despliega** los cambios
4. **Aplica restricciones** a la nueva llave

## 📊 Mejores Prácticas Implementadas

- ✅ Firebase Security Rules estrictas
- ✅ Autenticación requerida para acceso
- ✅ Validación de pagos del lado del servidor
- ✅ Webhooks con verificación de firma
- ✅ No hay llaves secretas en el código frontend

---

**Última actualización**: 2025-09-16
**Proyecto**: LCK Experience Digital