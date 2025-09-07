# RDS Proxy con IAM auth (recomendado para tokens de corta vida)
resource "aws_iam_role" "rds_proxy_role" {
  name = "mixtli-rds-proxy-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "rds.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_db_proxy" "mixtli_proxy" {
  name                   = "mixtli-proxy"
  debug_logging          = false
  engine_family          = "POSTGRESQL"
  idle_client_timeout    = 1800
  require_tls            = true
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_security_group_ids = [aws_security_group.mixtli_sg.id]
  vpc_subnet_ids         = [var.subnet_id]  # ajusta subnets
  auth {
    description = "IAM auth"
    iam_auth    = "REQUIRED"
    auth_scheme = "SECRETS"
    secret_arn  = "" # opcional si usas secreto para fallback de password
  }
}

resource "aws_db_proxy_default_target_group" "default" {
  db_proxy_name = aws_db_proxy.mixtli_proxy.name
}

resource "aws_db_proxy_target" "target" {
  db_proxy_name         = aws_db_proxy.mixtli_proxy.name
  target_group_name     = aws_db_proxy_default_target_group.default.name
  db_instance_identifier = aws_db_instance.mixtli_rds.id
}

output "rds_proxy_endpoint" { value = aws_db_proxy.mixtli_proxy.endpoint }
