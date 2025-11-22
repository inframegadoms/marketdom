# Solución para Error de Hidratación

## Problema
Error: "Text content did not match. Server: 'Precio (MXN)' Client: 'Precio (ARS)'"

Este error ocurre porque Next.js tiene archivos en caché con la versión antigua del código.

## Solución Rápida

### Opción 1: Limpiar caché y reiniciar (Recomendado)

1. **Detén el servidor de desarrollo** (presiona Ctrl+C en la terminal donde está corriendo)

2. **Elimina la carpeta .next**:
   ```bash
   # En Windows (PowerShell o CMD)
   rmdir /s /q .next
   
   # O manualmente desde el explorador de archivos
   ```

3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

### Opción 2: Reinicio completo

1. Detén el servidor (Ctrl+C)
2. Elimina `.next` y `node_modules/.cache` si existe
3. Reinicia: `npm run dev`

### Opción 3: Hard Refresh en el navegador

1. Presiona `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)
2. O abre las herramientas de desarrollador (F12) > Network > Marca "Disable cache"

## Verificación

Después de limpiar el caché, el error debería desaparecer y deberías ver "Precio (MXN)" tanto en el servidor como en el cliente.

