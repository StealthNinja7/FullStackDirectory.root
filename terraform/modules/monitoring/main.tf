# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.eks_cluster_name}/cluster"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-logs"
    }
  )
}

# CloudWatch Alarms for EKS
resource "aws_cloudwatch_metric_alarm" "eks_cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when EKS node CPU exceeds 80%"
  treat_missing_data  = "notBreaching"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-cpu-alarm"
    }
  )
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  alarm_description  = "Alert when RDS CPU exceeds 80%"
  treat_missing_data = "notBreaching"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-cpu-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "rds_database_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  alarm_description  = "Alert when RDS connections exceed 80"
  treat_missing_data = "notBreaching"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-connections-alarm"
    }
  )
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }
  alarm_description  = "Alert when Redis CPU exceeds 75%"
  treat_missing_data = "notBreaching"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }
  alarm_description  = "Alert when Redis memory exceeds 90%"
  treat_missing_data = "notBreaching"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
    }
  )
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-alerts"
    }
  )
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}
