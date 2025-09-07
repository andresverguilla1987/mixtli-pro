# Demo patch: Force enable 2FA

## Qué agrega
- Mantiene `window=1` (tolerancia TOTP ±30s).
- Permite **forzar** el enable en demo si el reloj no cuadra.

## Cómo forzar
- Con query param: `POST /security/2fa/enable?force=1`
- O con header: `X-Demo-Force: 1`
- (Opcional) variable: `ALLOW_DEMO_FORCE=1` para aceptar siempre el bypass si se pide.

Body:
```json
{ "code": "000000" }
```

## Pasos
1) Reemplaza tu `server.onefile.js` con este archivo.
2) Start Command en Render: `node server.onefile.js`
3) Redeploy.

En tu página de demo, para el paso 3, cambia la llamada a Enable por el endpoint con `?force=1` si el código real sigue fallando.
