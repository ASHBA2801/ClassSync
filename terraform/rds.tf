# Subnet group for RDS PostgreSQL
resource "aws_db_subnet_group" "postgres" {
  name        = "${var.app_name}-${var.environment}-db-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
  description = "Subnet group for ClassSync PostgreSQL RDS"

  tags = {
    Name = "${var.app_name}-${var.environment}-db-subnet-group"
  }
}

# Parameter group for custom DB parameters if needed
resource "aws_db_parameter_group" "postgres" {
  name        = "${var.app_name}-${var.environment}-postgres16-pg"
  family      = "postgres16"
  description = "Custom parameter group for ClassSync PostgreSQL 16"

  parameter {
    name  = "rds.force_ssl"
    value = "0" # Allowed; set to 1 if enforcing strict SSL connection
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier             = "${var.app_name}-${var.environment}-db"
  engine                 = "postgres"
  engine_version         = "16.1" # or latest 16.x
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  publicly_accessible = false
  skip_final_snapshot = var.environment == "production" ? false : true
  final_snapshot_identifier = "${var.app_name}-${var.environment}-final-snapshot"

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Sun:04:30-Sun:05:30"
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.app_name}-${var.environment}-postgres"
  }
}
