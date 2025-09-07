resource "google_sql_database_instance" "mixtli" {
  name             = "mixtli-sql"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled = true
      authorized_networks = [] # agrega tu IP/VM si accederás externo
    }
  }
}

resource "google_sql_user" "mixtli_user" {
  name     = "mixtli"
  instance = google_sql_database_instance.mixtli.name
  password = "mixtli-password-change"
}

resource "google_sql_database" "mixtli_db" {
  name     = "mixtli"
  instance = google_sql_database_instance.mixtli.name
}

output "cloudsql_public_ip" { value = google_sql_database_instance.mixtli.public_ip_address }
