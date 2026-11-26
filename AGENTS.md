<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Invariante: cero tráfico de tenant sin sesión

Verificado el 25-nov-2026 después de encontrar que la pantalla de login pública pedía
`/api/restaurants/<id>/orders` y abría un SSE con `token=undefined` en cada visita anónima (401s, rate
limit desperdiciado y el id interno de un restaurante demo expuesto en la URL).

**Regla:** la aplicación autenticada (backoffice, KDS, dueño) no hace **ninguna** petición a recursos de
tenant mientras no exista token o sesión válida. Sin sesión no hay `restaurant_id`: nunca un
identificador por defecto.

Si algún día hace falta una vista pública (preview del menú, invitaciones, recuperación de contraseña),
debe nacer en una superficie aparte —`/api/public/...` o endpoints de auth dedicados— con autorización
desacoplada, caché explícita y sus propias pruebas E2E.

`e2e/production.spec.ts` hace cumplir la regla: falla si aparece cualquier petición a
`/api/restaurants/*` o al stream del KDS antes de iniciar sesión.

## CSP y separación de entornos

`connect-src` se deriva de `NEXT_PUBLIC_ENGINE_API_URL`, la misma variable que usa el bundle del cliente. Nunca
listar los dos motores: permitir que el portal de producción llame a la API de demo (y al revés) anula la
separación que sostiene toda la plataforma. Verificación rápida tras cada despliegue:

```
curl -sD - -o /dev/null https://app.escal-ai.com | grep -o "connect-src[^;]*"   # solo el motor de producción
curl -sD - -o /dev/null https://demo.escal-ai.com | grep -o "connect-src[^;]*"  # solo demo-api
```

## Tokens semánticos vs. clases de paleta cruda

El portal mezcla tokens (`text-[var(--text-primary)]`) con clases de la paleta de Tailwind (`text-emerald-600`).
Los tokens son lo que hace funcionar claro/oscuro; las clases crudas son las que rompieron el contraste.

`npm run tokens:check` (incluido en `npm run check`) **congela el conjunto actual** y falla si aparece una clase de
paleta nueva. No reescribe nada: migrar un archivo significa quitar sus entradas con `npm run tokens:update`, así que
el trinquete solo gira en un sentido.

Estado: **245 clases en 8 archivos** pendientes de migrar. El resto del camino es visual, no mecánico:

1. Elegir un archivo (los más cargados: `KdsBoard` 88, `OnboardingWizardModal` 65, `StripePrepayPanel` 62).
2. Añadir el token que falte en `globals.css` (superficie, texto y borde para cada estado: éxito, error, aviso).
3. Reemplazar clases y **verificar contraste en Chrome real** con la skill `auditar-contraste-wcag-chrome`, en modo
   claro y oscuro — un diff no muestra si el texto dejó de leerse.
4. `npm run tokens:update` para bajar el baseline.

Nunca al revés: si una clase nueva "hace falta", se define como token; no se añade al baseline.
