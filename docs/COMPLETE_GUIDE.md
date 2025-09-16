# LCK Experience Digital - Guía Completa

## Estructura del Proyecto

### Archivos Principales
- **index.html** - Página de inicio con registro/login
- **conferences.html** - Galería de conferencias disponibles
- **conference.html** - Reproductor de conferencias individual
- **admin.html** - Panel de administración
- **admin-login.html** - Login de administradores

### Configuración Firebase
- **firebase.json** - Configuración de hosting
- **database.rules.json** - Reglas de seguridad de Realtime Database
- **storage.rules** - Reglas de seguridad de Storage
- **.firebaserc** - Proyecto Firebase configurado (lck-experience)

### JavaScript Core
- **js/firebase-config.js** - Configuración de Firebase
- **js/auth-flow-v2.js** - Sistema de autenticación principal
- **js/auth-persistent.js** - Manejo de sesiones persistentes
- **js/stripe-integration.js** - Integración con Stripe
- **js/conference-gallery.js** - Galería de conferencias
- **js/conference-system.js** - Sistema de reproducción
- **js/admin-auth.js** - Autenticación de admins
- **js/admin-multi-session.js** - Control de sesiones múltiples
- **js/admin.js** - Panel de administración

## Acceso de Usuarios

### Tipos de Acceso
1. **Cupón** - Usuario con código de cupón válido
2. **Pago** - Usuario que pagó vía Stripe Payment Link
3. **Admin** - Acceso otorgado manualmente por admin

### Validación de Acceso
El sistema verifica múltiples condiciones:
- `accessGranted === true` (acceso general)
- `hasPaid === true` (pagó vía Stripe)
- `accessType === 'coupon'` (tiene cupón)
- `accessType === 'paid'` (marcado como pagado)
- `accessType === 'admin'` (otorgado por admin)

## Integración con Stripe

### Configuración
- **Price ID**: `price_1S7LehLlZVNmVdHrak5QfTgz`
- **Webhook Endpoint**: `/stripe-webhook`
- **Eventos Procesados**:
  - `charge.succeeded`
  - `checkout.session.completed`
  - `payment_intent.succeeded`

### Flujo de Pago
1. Usuario sin acceso ve botón de pago
2. Click redirige a Stripe Payment Link
3. Stripe procesa pago y envía webhook
4. Firebase Function actualiza estado del usuario
5. Usuario obtiene acceso automático

## Panel de Administración

### Funciones Principales
- Ver usuarios registrados y su estado
- Otorgar/revocar acceso manualmente
- Gestionar cupones (crear, activar/desactivar)
- Ver estadísticas de conferencias
- Administrar otros admins

### Roles de Admin
- **user** - Usuario normal
- **admin** - Administrador básico
- **super_admin** - Administrador completo

## Solución de Problemas

### Pagos No Procesados
Si un webhook falla, usar el manual de corrección:
1. Verificar pago en Dashboard de Stripe
2. Obtener email del cliente
3. Actualizar manualmente en Firebase Console:
```javascript
{
  "hasPaid": true,
  "accessGranted": true,
  "accessType": "paid",
  "paymentDate": "2024-09-15",
  "manuallyFixed": true
}
```

### Verificación de Acceso
En la consola del navegador:
```javascript
// Ver estado del usuario actual
const user = firebase.auth().currentUser;
const snapshot = await firebase.database()
  .ref(`users/${user.email.replace(/\./g, '_')}`)
  .once('value');
console.log('User data:', snapshot.val());
```

## Despliegue

### Requisitos
- Node.js 18+
- Firebase CLI instalado
- Cuenta de Firebase con proyecto configurado

### Pasos de Despliegue
1. Instalar dependencias de Functions:
   ```bash
   cd functions && npm install
   ```

2. Configurar variables de entorno:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   ```

3. Desplegar:
   ```bash
   firebase deploy
   ```

## Seguridad

### Mejores Prácticas
- Nunca subir llaves privadas a GitHub
- Usar Firebase Security Rules estrictas
- Validar webhooks con signature verification
- Limitar acceso de escritura en Storage
- Usar HTTPS siempre
- Rotar llaves periódicamente

### Variables Sensibles
Mantener seguras:
- Stripe Webhook Secret
- Firebase Service Account
- Llaves API restringidas
- Credenciales de admin

## Mantenimiento

### Tareas Regulares
- Revisar logs de webhooks fallidos
- Limpiar sesiones inactivas
- Actualizar cupones expirados
- Verificar usuarios con problemas de acceso
- Respaldar base de datos

### Monitoreo
- Firebase Console → Functions → Logs
- Stripe Dashboard → Webhooks → Events
- Firebase Console → Database → Actividad en tiempo real