# 🔧 Arreglo Manual para Pagos No Procesados

## Problema
El webhook de Stripe no procesó algunos pagos correctamente. Los usuarios pagaron pero no tienen acceso.

## Solución Rápida

### Opción 1: Desde la Consola de Firebase (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com/project/lck-experience/database/lck-experience-default-rtdb/data)
2. Busca `users` → `email_del_usuario` (con puntos reemplazados por guiones bajos)
3. Edita y agrega/actualiza estos campos:
   ```json
   {
     "hasPaid": true,
     "accessGranted": true,
     "accessType": "paid",
     "paymentDate": 1757961600000,
     "paymentMethod": "payment_link",
     "manuallyVerified": true
   }
   ```

### Opción 2: Desde la Consola del Navegador

1. Ve a https://lck-experience.web.app
2. Abre la consola del navegador (F12)
3. Asegúrate de estar logueado como admin
4. Pega y ejecuta este código:

```javascript
// Función para marcar usuario como pagado
async function markUserAsPaid(email) {
    const database = firebase.database();
    const emailKey = email.replace(/\./g, '_');

    try {
        await database.ref(`users/${emailKey}`).update({
            hasPaid: true,
            accessGranted: true,
            accessType: 'paid',
            paymentDate: Date.now(),
            paymentMethod: 'payment_link',
            manuallyVerified: true,
            verifiedBy: firebase.auth().currentUser.email,
            notes: 'Pago verificado manualmente - Payment Link Stripe'
        });

        console.log(`✅ Usuario ${email} marcado como pagado`);
        return true;
    } catch (error) {
        console.error(`❌ Error:`, error);
        return false;
    }
}

// Usar la función (reemplaza con el email real)
markUserAsPaid('usuario@ejemplo.com');
```

### Opción 3: Verificar Múltiples Usuarios

Si tienes varios usuarios que pagaron, usa este código:

```javascript
// Lista de usuarios que pagaron (reemplaza con emails reales)
const usuariosQuePagaron = [
    'usuario1@ejemplo.com',
    'usuario2@ejemplo.com',
    // Agrega más emails aquí
];

// Procesar todos
async function procesarPagos() {
    for (const email of usuariosQuePagaron) {
        await markUserAsPaid(email);
        await new Promise(r => setTimeout(r, 500)); // Espera 500ms entre cada uno
    }
    console.log('✅ Todos los pagos procesados');
}

// Ejecutar
procesarPagos();
```

## Verificación

Después de marcar el pago:

1. El usuario debería poder acceder a las conferencias inmediatamente
2. En Firebase verás:
   - `hasPaid: true`
   - `accessGranted: true`
   - `accessType: "paid"`

## Para Verificar en Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/payments)
2. Busca el pago por email
3. Verifica que el pago fue exitoso
4. Copia el Payment ID para referencia

## Prevención Futura

El webhook ya está arreglado para procesar automáticamente:
- `charge.succeeded` - Para Payment Links
- `checkout.session.completed` - Para Checkout Sessions
- `payment_intent.succeeded` - Para otros pagos

## Nota Importante

⚠️ **Solo marca como pagado a usuarios que realmente pagaron en Stripe**

Para verificar:
1. Revisa en Stripe Dashboard que el pago existe
2. Confirma el email del cliente
3. Verifica el monto ($500 MXN)

## Usuarios Afectados Conocidos

Si el usuario con email que compraste necesita acceso, ejecuta:

```javascript
// En la consola del navegador (estando en el sitio)
markUserAsPaid('EMAIL_DEL_USUARIO_QUE_PAGO');
```

Reemplaza `EMAIL_DEL_USUARIO_QUE_PAGO` con el email real.