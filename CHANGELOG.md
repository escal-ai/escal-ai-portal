# Changelog — escal-ai-portal

## v0.9.0-demo-gating (2026-11-25)

Separación demo/producción en el portal.

### Añadido
- `NEXT_PUBLIC_APP_ENV` (`production` por defecto) con `IS_DEMO` como única fuente de verdad.
- Banner fijo "MODO DEMOSTRACIÓN" en el despliegue demo (contraste AA, `role="status"`).
- Campo **Código de tienda** cuando el backend no publica el directorio (producción): el
  dispositivo recuerda el código en `localStorage` y después solo pide el PIN.
- `resolveTenant(code)` en `api-client` → `GET /api/auth/tenant?code=`.

### Cambiado
- Los enlaces mágicos `?restaurant=` / `?pin=` se ignoran en producción (siguen activos en demo).
- La sesión de respaldo demo solo existe en el despliegue demo.

### Seguridad
- Los tokens demo y los atajos de demostración **no viajan en el bundle de producción**
  (verificado compilando ambos entornos).

### Verificación
- `next build` verde en `NEXT_PUBLIC_APP_ENV=production` y `=demo`.
- ESLint: sin errores nuevos (quedan 4 preexistentes de React 19, plan 9.5).
