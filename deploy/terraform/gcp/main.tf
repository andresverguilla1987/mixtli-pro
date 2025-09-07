terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.43"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}

resource "google_compute_network" "default" {
  name                    = "mixtli-vpc"
  auto_create_subnetworks = true
}

resource "google_compute_firewall" "allow_http_https_ssh" {
  name    = "mixtli-allow-http-https-ssh"
  network = google_compute_network.default.name

  allow {
    protocol = "tcp"
    ports    = ["22","80","443"]
  }
  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_instance" "mixtli" {
  name         = "mixtli-vm"
  machine_type = var.machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-jammy-v20240830"
      size  = 20
    }
  }

  network_interface {
    network = google_compute_network.default.name
    access_config {} # ephemeral public IP
  }

  metadata_startup_script = templatefile("${path.module}/startup.sh", {
    domain      = var.domain
    admin_email = var.admin_email
    ssh_username = var.ssh_username
  })
}
