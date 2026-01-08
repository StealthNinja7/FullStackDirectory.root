output "endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  value = aws_elasticache_replication_group.main.port
}

output "cluster_id" {
  value = aws_elasticache_replication_group.main.id
}

output "password_secret_arn" {
  value = aws_secretsmanager_secret.redis_password.arn
}

output "connection_string" {
  value     = "rediss://:${random_password.redis_password.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive = true
}
