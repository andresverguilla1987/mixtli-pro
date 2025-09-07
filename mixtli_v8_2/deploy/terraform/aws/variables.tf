variable "aws_region" { type = string  default = "us-east-1" }
variable "instance_type" { type = string default = "t3.micro" }
variable "key_name" { type = string } # existing EC2 key pair name
variable "domain" { type = string }   # e.g. api.example.com
variable "admin_email" { type = string } # for Let's Encrypt

variable "vpc_id" { type = string  default = null }
variable "subnet_id" { type = string default = null }
variable "associate_eip" { type = bool default = true }
