variable "do_token" { type = string }
variable "region"    { type = string  default = "sfo3" }
variable "size"      { type = string  default = "s-1vcpu-1gb" }
variable "ssh_key_fingerprint" { type = string }  # tu llave pública registrada en DO
variable "repo_url"  { type = string  description = "Git repo (https) con este bundle" }
variable "branch"    { type = string  default = "main" }
variable "tailscale_authkey" { type = string  description = "Auth key de Tailscale (ephemeral)" }
