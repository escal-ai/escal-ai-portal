## v0.10.0-portal-e2e-a11y

- Suite E2E con Playwright contra los portales desplegados: producción en solo lectura (no anuncia la
  línea de prueba ni los atajos de demo, pide código de tienda, no filtra correos de owner en el HTML) y
  demo completo (aviso de entorno, línea de prueba y login de cocina con atajo).
- Escaneo de accesibilidad con axe en ambas pantallas de login. Corregidas dos violaciones **críticas**
  (el botón de borrar del teclado no tenía nombre accesible; el selector de restaurante no tenía
  etiqueta asociada) y dos fallos de contraste que quedaban por debajo de AA.
- El gate bloquea ahora violaciones críticas y serias; hoy ambas pantallas están en cero.
- Script `npm run e2e`.

# Changelog — escal-ai-portal

## v0.9.5-portal-no-demo-tokens (2026-11-25)

### Seguridad
- Eliminado `src/lib/demo-tokens.ts` y el fallback `demoTokens` de `page.tsx`. Los tokens demo
  firmados seguían viajando en un chunk diferido del build (presente también en producción). Ahora
  el acceso demo llega solo por link firmado del backend (`?demo_token=`, TTL 7 días) o por código
  de tienda.
- Verificado sobre el build desplegado en `app.escal-ai.com`: 0 chunks con `DEMO_TOKENS`.

### Notas
- Desplegado con `serviceInstanceDeployV2` (commit `f8d6d32`) porque el servicio no tiene
  *deployment trigger*: la GitHub App de Railway no tiene acceso a este repositorio.

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

## v0.9.3-demo-links (2026-11-25)

- El portal demo consume `?demo_token=<firma>`: lo canjea por una sesión acotada a ese prospecto,
  la guarda y borra el token de la barra de direcciones para que no quede en el historial.
- El enlace caduca en 7 días (lo firma el backend) y solo abre el tenant para el que se emitió.

## v0.9.4-portal-quality (2026-11-25)

- **Cero errores de ESLint** (antes 5 de reglas React 19): los dos `setState` en efectos se resolvieron
  con `useSyncExternalStore` (idioma del navegador) y moviendo el spinner fuera del efecto; las dos
  funciones usadas antes de declararse (`submitKitchenPin`, `loadInventory`) pasaron a declaraciones
  hoisted; el reloj del KDS usa inicializador perezoso.
- Quedan 2 excepciones documentadas (`eslint-disable-next-line` con motivo) para arranques únicos que
  muestran spinner: son intencionales, no bucles de estado.
- Limpieza de 8 imports y variables sin usar (`Bell`, `Plus`, `Flame`, `PhoneCall`, `Save`, `Building2`,
  `ExternalLink`, `PortalRole`); el aviso del `useSyncExternalStore` de idioma ya no existe.
- Warnings restantes: 3 `exhaustive-deps` (cambiarlos alteraría el comportamiento de polling/SSE, se
  dejan conscientes) y 1 `<img>` que pide `next/image`.
