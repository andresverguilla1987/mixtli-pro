terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "mixtli" {
  name   = "mixtli-prod"
  region = var.region
  size   = var.size
  image  = "ubuntu-22-04-x64"
  ssh_keys = [ var.ssh_key_fingerprint ]

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    repo_url = var.repo_url
    branch   = var.branch
    tailscale_authkey = var.tailscale_authkey
  })
}

resource "digitalocean_firewall" "mixtli_fw" {
  name = "mixtli-fw"
  droplet_ids = [ digitalocean_droplet.mixtli.id ]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0","::/0"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0","::/0"]
  }
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0","::/0"]
  }
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0","::/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0","::/0"]
  }
}
