output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "instance_id" {
  value = aws_db_instance.main.id
}

output "database_name" {
  value = aws_db_instance.main.db_name
}

output "username" {
  value = aws_db_instance.main.username
}

output "password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}

output "read_replica_endpoint" {
  value = aws_db_instance.read_replica.endpoint
}
