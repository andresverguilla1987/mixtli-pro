# Terraform: Cloudflare CNAME proxied → Render

Variables:
- `cf_api_token` (API Token con permisos DNS edit para la zona)
- `cf_zone_id` (Zone ID de tu dominio en Cloudflare)
- `subdomain` (ej. `api`)
- `render_target` (ej. `mixtli-api-xxxxx.onrender.com`)

Ejemplo `terraform.tfvars`:
```hcl
cf_api_token = "cf-xxxx"
cf_zone_id   = "xxxxxxxxxxxxxxxxxxxxxx"
subdomain    = "api"
render_target = "mixtli-api-xxxxx.onrender.com"
proxied      = true
```

Comandos:
```bash
terraform init
terraform apply -auto-approve
```
