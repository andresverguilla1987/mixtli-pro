# Simple RDS PostgreSQL (no público por default; ajusta según VPC)
resource "aws_db_subnet_group" "mixtli_db_subnets" {
  name       = "mixtli-db-subnets"
  subnet_ids = [var.subnet_id]  # ajusta si usas múltiples subnets
}

resource "aws_db_instance" "mixtli_rds" {
  identifier              = "mixtli-rds"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  username                = "mixtli"
  password                = "mixtli-password-change"
  db_subnet_group_name    = aws_db_subnet_group.mixtli_db_subnets.name
  vpc_security_group_ids  = [aws_security_group.mixtli_sg.id]
  skip_final_snapshot     = true
  publicly_accessible     = false
  deletion_protection     = false
}

output "rds_endpoint" { value = aws_db_instance.mixtli_rds.address }
