# Terraform – AWS EC2 con TLS (Let's Encrypt) + Nginx (host)

## 1) Prepara
- Crea/par **key pair** en EC2 y anota `key_name`.
- Ten un **dominio** (ej. `api.ejemplo.com`) y crea un **A record** a la IP pública (o a la EIP tras apply).
- Sube este bundle a un repo Git.

## 2) Variables
`terraform.tfvars`:
```hcl
aws_region   = "us-east-1"
instance_type = "t3.micro"
key_name     = "mi-key"
domain       = "api.tu-dominio.com"
admin_email  = "admin@tu-dominio.com"
associate_eip = true
# opcional vpc_id/subnet_id si usas VPC custom
```

## 3) Apply
```bash
terraform init
terraform apply -auto-approve
```
Espera a que el **DNS** apunte a la IP. Certbot en el cloud-init intentará emitir el cert; si aún no apunta, vuelve a correr:
```bash
ssh ubuntu@<ip> sudo certbot --nginx -n --agree-tos -m admin@tu-dominio.com -d api.tu-dominio.com
```

## 4) Compose
En la VM se usa `docker-compose.prod.no-nginx.yml` (TLS en host).  
API: `http://127.0.0.1:8080` atrás de Nginx.
