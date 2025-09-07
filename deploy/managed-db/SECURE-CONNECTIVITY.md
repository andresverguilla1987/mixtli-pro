# Conectividad segura a DB

## GCP Cloud SQL
- Usa **Cloud SQL Auth Proxy** (role Ansible `cloudsql_proxy`).
- Apunta `DATABASE_URL` a `127.0.0.1:5432` (el proxy maneja TLS/identidad).

## AWS RDS (IAM) con **RDS Proxy**
- Crea `aws_db_proxy` con `iam_auth = REQUIRED` (ver `rds_proxy.tf`).
- Conecta tu app al **endpoint del proxy** (TLS). Para autenticación IAM, genera **tokens** de 15 min en la app o usa el proxy con usuarios/secretos gestionados en Secrets Manager.
- Alternativa: sin proxy, la app debe renovar `generate-db-auth-token` en cada conexión; muchos ORMs no lo soportan bien.

## Notas
- Activa `sslmode=require` si usarás conexión directa con certificados del proveedor.
- Mantén secretos en variables de entorno seguras o Secret Managers.
