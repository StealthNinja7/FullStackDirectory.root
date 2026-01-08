# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-cache-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-cache-subnet-group"
    }
  )
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_description = "Redis cluster for ${var.project_name}-${var.environment}"
  engine                        = "redis"
  engine_version               = "7.0"
  node_type                    = var.node_type
  num_cache_clusters           = var.num_cache_clusters
  parameter_group_name         = aws_elasticache_parameter_group.main.name
  port                         = 6379
  
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token_enabled          = true
  auth_token                  = random_password.redis_password.result
  
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [var.cache_security_group_id]
  
  automatic_minor_version_upgrade = true
  backup_retention_limit         = 5
  snapshot_retention_limit       = 5
  snapshot_window               = "03:00-05:00"
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
    enabled          = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis"
    }
  )
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family      = "redis7"
  name        = "${var.project_name}-${var.environment}-redis-params"
  description = "Parameter group for ${var.project_name}-${var.environment}"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-params"
    }
  )
}

# CloudWatch Log Group for Redis Slow Log
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/slow-log"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-slow-log"
    }
  )
}

# Generate random password for Redis
resource "random_password" "redis_password" {
  length  = 32
  special = true
}

# Store Redis password in Secrets Manager
resource "aws_secretsmanager_secret" "redis_password" {
  name                    = "${var.project_name}-${var.environment}-redis-password"
  recovery_window_in_days = 0

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "redis_password" {
  secret_id      = aws_secretsmanager_secret.redis_password.id
  secret_string  = random_password.redis_password.result
}
