# Mixtli Demo Kit

Activa endpoints de demo para sembrar y resetear datos rápido durante presentaciones.

## Variables de entorno
- `DEMO_ENABLED=true`
- `DEMO_PIN=un-pin-seguro`

## Instalación
```bash
bash render/install-demo.sh
git add apps/api/src/demo.ts apps/api/src/demo-data.ts render/ postman/ README-DEMO.md .env.demo.example
git commit -m "feat(demo): demo endpoints + seed/reset"
git push origin main
```

## Build/Start en Render
No cambies tus comandos actuales. Solo asegúrate de definir `DEMO_ENABLED` y `DEMO_PIN` en **Environment**.

## Endpoints
- `GET /demo/status`
- `POST /demo/seed` (Header `x-demo-pin: <DEMO_PIN>`)
- `POST /demo/reset` (Header `x-demo-pin: <DEMO_PIN>`)

## Uso rápido
```bash
# Estado
curl -s https://<tu-app>.onrender.com/demo/status

# Seed
curl -s -X POST https://<tu-app>.onrender.com/demo/seed \
  -H "x-demo-pin: $DEMO_PIN"

# Reset
curl -s -X POST https://<tu-app>.onrender.com/demo/reset \
  -H "x-demo-pin: $DEMO_PIN"
```

## Notas
- Si tu modelo no se llama `User`, edita `demo.ts` y cambia `prisma.user` al nombre correcto (p. ej. `prisma.usuario`). 
- Los usuarios demo se identifican por su email `*@mixtli.example`. Ajusta `demo-data.ts` a tu gusto.
