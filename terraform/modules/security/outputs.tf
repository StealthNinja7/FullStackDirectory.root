output "worker_security_group_id" {
  value = aws_security_group.worker.id
}

output "db_security_group_id" {
  value = aws_security_group.rds.id
}

output "cache_security_group_id" {
  value = aws_security_group.cache.id
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}
