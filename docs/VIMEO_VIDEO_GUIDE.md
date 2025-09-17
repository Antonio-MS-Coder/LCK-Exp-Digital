# Guía para Videos de Vimeo - LCK Experience

## 🎥 Configuración IMPORTANTE en Vimeo

### Para Videos "Unlisted" (No listados)

1. **Ve a tu video en Vimeo**
2. **Click en "Settings" (Configuración)**
3. **En "Privacy" selecciona: "Unlisted"**
   - ✅ El video NO aparece en búsquedas de Vimeo
   - ✅ Solo personas con el link pueden verlo
   - ✅ Se puede embeder en cualquier sitio
   - ⚠️ **IMPORTANTE**: El video tendrá un hash único en la URL

4. **En "Embed" → "Where can this be embedded?"**
   - Selecciona: **"Anywhere"**

### URL de Video Unlisted

Cuando configuras un video como "Unlisted", Vimeo te dará una URL como:
```
https://vimeo.com/123456789/abc123def456
```

**El hash (abc123def456) es OBLIGATORIO** para que el video funcione.

## 📋 Proceso para Subir Videos al Admin Panel

### Paso 1: Configurar Video en Vimeo
1. Sube tu video a Vimeo
2. Configura privacidad como **"Unlisted"**
3. Permite embed **"Anywhere"**
4. **COPIA LA URL COMPLETA CON EL HASH**

### Paso 2: Agregar en Admin Panel
1. Ve a **Admin Panel → Conferencias**
2. En la sección **"Importar Video de Vimeo"**
3. **Pega la URL completa** (incluye el hash si es unlisted)
   - Ejemplo: `https://vimeo.com/1119273722/abc123def456`
4. Click en **"Obtener Información del Video"**
5. Se llenarán automáticamente:
   - Título
   - Ponente/Autor
   - Duración
   - Thumbnail
6. **Completa cualquier campo faltante**
7. Click en **"Subir Conferencia"**

## ⚠️ Solución de Problemas

### Error 403 - Video no se reproduce:

**Causa**: El hash de privacidad no está incluido en la URL

**Solución**:
1. Ve a Vimeo y copia la URL completa del video
2. La URL debe incluir el hash: `https://vimeo.com/VIDEO_ID/HASH`
3. En el admin panel, actualiza la conferencia con la URL completa
4. El sistema automáticamente incluirá el hash en el embed

### Video muestra "Sorry, We're having a little trouble":

**Causas posibles**:
1. El video NO está configurado como "Unlisted"
2. El embed NO está permitido "Anywhere"
3. Falta el hash de privacidad en la URL

**Solución**:
1. Verifica la configuración de privacidad en Vimeo
2. Asegúrate de copiar la URL completa con hash
3. Actualiza la conferencia en el admin panel

## 📝 Notas Importantes

- **SIEMPRE** usa la URL completa con hash para videos Unlisted
- El hash es único para cada video y es obligatorio
- Sin el hash correcto, el video mostrará error 403
- Los videos "Private" NO funcionarán, deben ser "Unlisted"

## Ejemplo de URLs

✅ **Correcto (Unlisted con hash):**
```
https://vimeo.com/1119273722/abc123def456
```

❌ **Incorrecto (sin hash):**
```
https://vimeo.com/1119273722
```

---

**Última actualización**: 2025-09-16