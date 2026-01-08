output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_arn" {
  value = aws_eks_cluster.main.arn
}

output "cluster_certificate_authority_data" {
  value = aws_eks_cluster.main.certificate_authority[0].data
}

output "node_group_id" {
  value = aws_eks_node_group.main.id
}

output "oidc_provider_arn" {
  value = aws_iam_openid_connect_provider.cluster.arn
}
