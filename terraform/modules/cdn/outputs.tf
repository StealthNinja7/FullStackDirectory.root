output "s3_bucket_name" {
  value = aws_s3_bucket.static_assets.id
}

output "s3_bucket_arn" {
  value = aws_s3_bucket.static_assets.arn
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  value = aws_cloudfront_distribution.main.arn
}
