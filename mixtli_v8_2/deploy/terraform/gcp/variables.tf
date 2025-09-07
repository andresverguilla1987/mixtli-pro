variable "project" { type = string }
variable "region"  { type = string  default = "us-central1" }
variable "zone"    { type = string  default = "us-central1-a" }
variable "machine_type" { type = string default = "e2-micro" }
variable "domain" { type = string }       # api.example.com
variable "admin_email" { type = string }  # for Let's Encrypt
variable "ssh_username" { type = string  default = "ubuntu" }
