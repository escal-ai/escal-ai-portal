This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pruebas contra lo desplegado (`npm run e2e`)

Requiere `npx playwright install chromium` una vez.

```bash
npm run e2e                       # las 7 pruebas
npx playwright test --project=demo
npx playwright test --project=a11y
```

- **production**: solo lectura sobre `app.escal-ai.com`. No inicia sesión nunca.
- **demo**: flujo interactivo sobre `demo.escal-ai.com` (login de cocina con atajo). Los datos demo se
  purgan cada noche y nunca se cobra ni se marca un teléfono real.
- **a11y**: axe con WCAG 2 A/AA en ambas pantallas de login. Bloquea violaciones **críticas y serias**;
  las moderadas se imprimen como deuda visual.

No necesita secretos: ningún test usa credenciales de owner.

## Despliegue: este repo NO se despliega solo

A diferencia del motor (`escal-ai-voice-engine`), que tiene `deploymentTrigger` en GitHub, el portal se
despliega a mano. Trampas confirmadas:

- `redeploy` (MCP/CLI) reconstruye el despliegue **anterior**: se queda en el commit viejo sin avisar.
  Comprobar siempre `deployments { meta { commitHash } }` después.
- La vía correcta es `serviceInstanceDeployV2(serviceId, environmentId, commitSha)` con el SHA explícito.
- Ese mutation devuelve `Not Authorized` de forma intermitente; reintentar suele bastar.

Servicios: `escal-ai-portal` (`db2427bf-ad20-472d-9c2d-2f4bd6b5b4fc`, entorno producción) y `portal-demo`
(`e8f0e758-a6d1-40dc-ae5e-0e4c0508f78b`, entorno demo).

