# Role: Cloud SQL Auth Proxy (GCP)

Variables a definir (por host o en `group_vars/all.yml`):
```yaml
gcp_instance: "tu-proyecto:region:instancia"   # Instance Connection Name
gcp_sa_key_path: "/root/cloudsql/sa.json"      # Ruta al JSON de la SA
```
Copia la credencial de la Service Account a `{{ gcp_sa_key_path }}` antes de correr el role.

Luego, apunta `DATABASE_URL` a `postgresql://USER:PASS@127.0.0.1:5432/mixtli?schema=public`.
