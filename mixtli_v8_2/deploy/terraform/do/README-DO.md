# Terraform – DigitalOcean (VM con Docker + systemd + Tailscale)

## 1) Requisitos
- Cuenta en DigitalOcean y un **SSH key** cargado (toma el fingerprint).
- **Terraform** instalado.
- **Repo** en Git accesible por HTTPS (público o con token en la URL).

## 2) Variables
Crea `terraform.tfvars`:
```hcl
do_token            = "dop_v1_xxx"
ssh_key_fingerprint = "aa:bb:cc:dd:ee:ff:..."
repo_url            = "https://github.com/tu-user/tu-repo.git"
branch              = "main"
tailscale_authkey   = "tskey-auth-xxxxxxxx"
region              = "sfo3"
size                = "s-1vcpu-1gb"
```

## 3) Apply
```bash
terraform init
terraform apply -auto-approve
```

Al terminar verás `droplet_ip`. Abre `http://<droplet_ip>/health`.

## 4) Redeploy
Una vez que pushees a Git:
```bash
ssh root@<droplet_ip> mixtli-redeploy
```

## Notas
- Se instala **Tailscale** y se une a tu tailnet (SSH habilitado).
- **systemd** crea el servicio `mixtli.service` para mantener `docker compose` vivo.
- Nginx corre en el host y hace proxy hacia el Nginx del stack (puerto 80 local).
