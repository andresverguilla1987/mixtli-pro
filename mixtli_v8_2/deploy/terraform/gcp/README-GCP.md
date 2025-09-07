# Terraform – GCP Compute Engine con TLS (Let's Encrypt)

## 1) Prepara
- Proyecto GCP listo y `gcloud auth application-default login` (o creds de servicio).
- Dominio `api.tu-dominio.com` → crea **A record** hacia la IP de la VM cuando la tengas.

## 2) Variables
`terraform.tfvars`:
```hcl
project      = "tu-proyecto"
region       = "us-central1"
zone         = "us-central1-a"
machine_type = "e2-micro"
domain       = "api.tu-dominio.com"
admin_email  = "admin@tu-dominio.com"
```

## 3) Apply
```bash
terraform init
terraform apply -auto-approve
```
Una vez el DNS apunte, si el cert no salió a la primera:
```bash
gcloud compute ssh mixtli-vm -- sudo certbot --nginx -n --agree-tos -m admin@tu-dominio.com -d api.tu-dominio.com
```

## 4) Compose
Usa `docker-compose.prod.no-nginx.yml`. Nginx del host termina TLS y proxya a `:8080`.
