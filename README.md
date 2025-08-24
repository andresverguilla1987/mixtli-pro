# Mixtli – CI/CD Pack (Postman + GitHub Actions)

Incluye:

- **Postman**: colección *Mixtli API – Smoke Auto* y *environment* preconfigurado con `BASE_URL=https://mixtli-pro.onrender.com`.
- **GitHub Actions**: workflow `ci.yml` que corre la colección y, si todo pasa, **despliega a Render**.
- **Script local**: `scripts/run-tests.sh` para correr Newman localmente.

## Uso rápido

1. Copia todo el contenido de este ZIP en la **raíz de tu repo**.
2. En GitHub → *Settings* → *Secrets and variables* → *Actions* crea:
   - `RENDER_SERVICE_ID`
   - `RENDER_API_KEY`
3. Commit a `main` → corre CI y despliega si pasa.

Para ejecutar local:
```bash
bash scripts/run-tests.sh
```
