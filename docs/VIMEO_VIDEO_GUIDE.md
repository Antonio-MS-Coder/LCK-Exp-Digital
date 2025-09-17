# Guía para Subir Videos de Vimeo - LCK Experience

## 🎥 Configuración Recomendada de Privacidad en Vimeo

### Opción Recomendada: **"Unlisted"** (No listado)

1. **Ve a tu video en Vimeo**
2. **Click en "Settings" (Configuración)**
3. **En "Privacy" selecciona: "Unlisted"**
   - ✅ El video NO aparece en búsquedas de Vimeo
   - ✅ Solo personas con el link pueden verlo
   - ✅ Se puede embeder en cualquier sitio
   - ✅ NO requiere hash especial de privacidad
   - ✅ Funciona perfectamente con nuestro sistema

### Configuración de Embed:
1. **En "Embed" → "Where can this be embedded?"**
2. **Selecciona: "Anywhere"**

## 📋 Proceso para Subir Videos al Admin Panel

### Paso 1: Configurar Video en Vimeo
1. Sube tu video a Vimeo
2. Configura privacidad como **"Unlisted"**
3. Permite embed **"Anywhere"**
4. Copia el código embed

### Paso 2: Agregar en Admin Panel
1. Ve a **Admin Panel → Conferencias**
2. En la sección amarilla **"Importar desde Vimeo"**
3. **Pega el código embed** completo
4. Click en **"Extraer Información Automáticamente"**
5. Se llenarán automáticamente:
   - URL del video
   - Video ID
   - Thumbnail
6. **Completa manualmente**:
   - Título (si no se extrajo)
   - Ponente
   - Descripción
   - Duración
7. Click en **"Subir Conferencia"**

## ⚠️ Importante

### Si ya tienes videos con "Hide from Vimeo":
Los videos configurados como "Hide from Vimeo" con hash de privacidad también funcionarán, pero es más complejo. Si es posible, cambia a "Unlisted" para simplicidad.

### URLs de Ejemplo:

**Unlisted (Recomendado):**
```
https://player.vimeo.com/video/123456789
```

**Hide from Vimeo (Más complejo):**
```
https://player.vimeo.com/video/123456789?h=abc123def456
```

## 🔧 Solución de Problemas

### Video no se reproduce:
1. Verifica que el video esté configurado como **"Unlisted"**
2. Verifica que embed esté permitido **"Anywhere"**
3. Si el video tiene hash (?h=xxx), asegúrate de copiar la URL completa

### Thumbnail no aparece:
- El sistema intenta obtener el thumbnail automáticamente
- Si no funciona, puedes agregar manualmente una URL de imagen

## 📝 Notas

- **"Unlisted"** es la opción más simple y confiable
- No requiere manejo especial de hashes de privacidad
- Los usuarios no necesitan cuenta de Vimeo para ver los videos
- Los videos no aparecerán en búsquedas públicas de Vimeo

---

**Última actualización**: 2025-09-16