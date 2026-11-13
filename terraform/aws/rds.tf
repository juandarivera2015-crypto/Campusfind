# PaaS relational database: Amazon RDS for MySQL 8 (same engine the Sequelize models target).
resource "aws_security_group" "rds" {
  name        = "${var.name}-${var.environment}-rds"
  description = "MySQL access from EKS nodes only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "MySQL from EKS worker nodes"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_db_parameter_group" "mysql" {
  name   = "${var.name}-${var.environment}-mysql8"
  family = "mysql8.0"

  parameter {
    name  = "require_secure_transport"
    value = "1"
  }
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }
}

resource "aws_db_instance" "mysql" {
  identifier     = "${var.name}-${var.environment}"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  db_name  = "campusfind"
  username = "campusfind"
  password = random_password.db.result

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.mysql.name
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period         = 7
  deletion_protection             = var.environment == "production"
  skip_final_snapshot             = var.environment != "production"
  final_snapshot_identifier       = "${var.name}-${var.environment}-final"
  performance_insights_enabled    = true
  enabled_cloudwatch_logs_exports = ["error", "slowquery"]
  auto_minor_version_upgrade      = true
}
