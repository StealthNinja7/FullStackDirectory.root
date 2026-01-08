# Generate random password for DB
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}-${var.environment}-db-password"
  recovery_window_in_days = 0

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id      = aws_secretsmanager_secret.db_password.id
  secret_string  = random_password.db_password.result
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name           = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids     = var.private_subnet_ids
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-subnet-group"
    }
  )
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier          = "${var.project_name}-${var.environment}-postgres"
  engine              = "postgres"
  engine_version      = "15.3"
  instance_class      = var.instance_class
  allocated_storage   = var.allocated_storage
  
  db_name             = "appdb"
  username            = "dbadmin"
  password            = random_password.db_password.result
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]
  
  multi_az               = true
  publicly_accessible    = false
  storage_encrypted      = true
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  enable_cloudwatch_logs_exports = ["postgresql"]
  enable_enhanced_monitoring      = var.enable_monitoring
  monitoring_interval            = var.enable_monitoring ? 60 : 0
  monitoring_role_arn            = var.enable_monitoring ? aws_iam_role.rds_monitoring[0].arn : null
  
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-postgres"
    }
  )
}

# IAM Role for RDS Monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_monitoring ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.enable_monitoring ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS Read Replica
resource "aws_db_instance" "read_replica" {
  identifier             = "${var.project_name}-${var.environment}-postgres-replica"
  replicate_source_db   = aws_db_instance.main.identifier
  instance_class        = var.instance_class
  publicly_accessible   = false
  auto_minor_version_upgrade = true
  skip_final_snapshot   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-postgres-replica"
    }
  )
}
