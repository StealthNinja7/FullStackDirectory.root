# Cost Optimization Guide

## Overview

This guide provides strategies to minimize cloud infrastructure costs while maintaining production-grade reliability and performance.

## Cost Optimization Strategies

### 1. Compute (EKS & EC2)

#### Current Setup
- **EKS Cluster:** $73/month
- **3× t3.medium nodes:** ~$90-270/month (depending on usage)

#### Cost Optimization Options

| Strategy | Cost Reduction | Trade-offs |
|----------|---|---|
| **Spot Instances** | 70-90% | Interruption risk (2-min notice) |
| **Reserved Instances** | 40-60% | 1-3 year commitment |
| **Graviton2 (t4g)** | 20% | Limited availability |
| **Auto-scaling (0-2 min)** | 30% | Slower startup |
| **Scheduled Scaling** | 50% (off-peak) | Complex configuration |

#### Recommended: Hybrid Approach

```hcl
# Mix on-demand and Spot instances
resource "aws_eks_node_group" "on_demand" {
  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"
  desired_size   = 1  # Always available
  min_size       = 1
  max_size       = 3
}

resource "aws_eks_node_group" "spot" {
  instance_types = ["t3.medium", "t3a.medium", "m5.large"]
  capacity_type  = "SPOT"
  desired_size   = 2  # 70% cheaper
  min_size       = 0
  max_size       = 7
}
```

**Estimated Savings:** $80-120/month

### 2. Database (RDS)

#### Current Setup
- Multi-AZ PostgreSQL (db.t3.small): ~$300-500/month
- 30-day automated backup: Included

#### Cost Optimization

| Option | Cost | Trade-offs |
|--------|------|-----------|
| Single-AZ instead of Multi-AZ | -50% | No automatic failover, downtime risk |
| db.t3.small → db.t3.micro | -60% | Lower performance, suitable for low traffic |
| Use RDS Reserved Instances | -40% | 1-year commitment |
| Connection pooling (PgBouncer) | -20% (reduced connections) | Manages connection pools |
| Reduced backup window | -10% | Less frequent backups |

#### Production-Grade but Cost-Optimized

```hcl
# For staging/dev environments
variable "rds_instance_class" {
  default = "db.t3.micro"  # vs db.t3.small
}

# For production with cost consciousness
resource "aws_db_instance" "main" {
  instance_class      = "db.t3.small"
  multi_az            = false  # Single-AZ (can re-enable for HA)
  allocated_storage   = 20
  backup_retention_period = 7  # Instead of 30
  
  # Enable automatic backups to S3 for long-term retention
  skip_final_snapshot = false
}

# Add cross-region read replica on demand
resource "aws_db_instance" "cross_region_replica" {
  count                    = var.environment == "prod" ? 1 : 0
  replicate_source_db      = aws_db_instance.main.identifier
  availability_zone        = "us-west-2a"  # Cross-region
}
```

**Estimated Savings:** $100-200/month (single-AZ), $150-300/month (smaller instance)

### 3. Cache Layer (Redis/ElastiCache)

#### Current Setup
- 2-node cluster (cache.t3.micro): ~$100-200/month

#### Cost Optimization

| Strategy | Savings | Notes |
|----------|---------|-------|
| cache.t3.micro → cache.t2.micro | 20% | Older generation but sufficient |
| Reduce nodes (1 node) | 50% | Loss of redundancy, HA |
| Use Redis on EC2 | 30% | Self-managed complexity |
| ElastiCache serverless | Flexible | Pay per request (variable cost) |

#### Balanced Approach

```hcl
variable "redis_node_type" {
  default = "cache.t3.micro"  # vs cache.t2.micro (older, cheaper)
}

variable "redis_num_cache_clusters" {
  default = 1  # Single node for dev/staging
  # For production: 2-3 for high availability
}

# Backup optimization
resource "aws_elasticache_replication_group" "main" {
  snapshot_retention_limit = 3  # Instead of 5 (saves storage)
}
```

**Estimated Savings:** $50-100/month

### 4. Data Transfer & CDN

#### Current Setup
- CloudFront + S3: Usage-based (~$50-200/month)

#### Cost Optimization

| Strategy | Benefit |
|----------|---------|
| Enable S3 Intelligent-Tiering | Moves cold data to cheaper storage tiers |
| CloudFront origin shield | Reduces origin load, but adds cost |
| Regional S3 bucket | If you don't need global distribution |
| Compress responses | Reduces data transfer volume |
| Cache aggressive headers | Fewer origin requests |

```hcl
# S3 Lifecycle policies
resource "aws_s3_lifecycle_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    id     = "archive-old-versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

**Estimated Savings:** $10-50/month

### 5. Monitoring & Logging

#### Current Setup
- CloudWatch Logs, Prometheus, Grafana
- Monitoring costs: ~$20-50/month

#### Cost Optimization

| Strategy | Savings |
|----------|---------|
| Reduce log retention (7 days → 3 days) | 30% |
| Log sampling/filtering | 40-60% |
| Use CloudWatch Insights instead of CloudWatch Logs | Variable |

```hcl
# Reduce log retention for non-critical services
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.eks_cluster_name}"
  retention_in_days = 3  # Instead of 7
}
```

**Estimated Savings:** $10-20/month

## Environment-Specific Configurations

### Development Environment

```hcl
# dev.tfvars
environment           = "dev"
eks_desired_size      = 1
eks_min_size          = 1
eks_max_size          = 3
eks_instance_types    = ["t3.small"]  # Smaller instances
rds_instance_class    = "db.t3.micro"
redis_node_type       = "cache.t2.micro"
redis_num_cache_clusters = 1

# Expected monthly cost: ~$150-250
```

### Staging Environment

```hcl
# staging.tfvars
environment           = "staging"
eks_desired_size      = 2
eks_min_size          = 1
eks_max_size          = 5
eks_instance_types    = ["t3.small"]
rds_instance_class    = "db.t3.small"
redis_node_type       = "cache.t3.micro"
redis_num_cache_clusters = 1

# Expected monthly cost: ~$350-450
```

### Production Environment (Cost-Optimized)

```hcl
# prod-cost-optimized.tfvars
environment           = "prod"

# Use on-demand + Spot mix
eks_desired_size      = 2  # 1 on-demand + 2 Spot
eks_min_size          = 1
eks_max_size          = 10
eks_instance_types    = ["t3.medium"]

# Single-AZ with enhanced backup strategy
rds_instance_class    = "db.t3.small"
# multi_az = false (save 50%)
rds_allocated_storage = 20

# Minimal HA setup
redis_node_type       = "cache.t3.micro"
redis_num_cache_clusters = 1  # Accept single point of failure risk

# Expected monthly cost: ~$500-700
```

### Production Environment (HA/Reliability)

```hcl
# prod-ha.tfvars
environment           = "prod"

# Full on-demand cluster
eks_desired_size      = 3
eks_instance_types    = ["t3.medium"]

# Multi-AZ for highest reliability
rds_instance_class    = "db.t3.medium"
# multi_az = true
# backup_retention_period = 30

# Full HA setup
redis_node_type       = "cache.t3.small"
redis_num_cache_clusters = 3

# Expected monthly cost: ~$1200-1500
```

## Cost Monitoring & Alerts

### AWS Budgets

```bash
# Create a monthly budget alert
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json \
  --notifications-with-subscribers file://notifications.json
```

### Cost Anomaly Detection

```bash
aws ce create-anomaly-detector \
  --frequency DAILY \
  --monitor-specification '{"Tags": {"Key": "Project", "Values": ["fullstack-app"]}}'
```

### Query Cost Analysis

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Recommended Cost Optimization Roadmap

### Phase 1: Quick Wins (Save $200-300/month)
1. ✅ Use Spot instances for non-critical workloads
2. ✅ Reduce RDS backup retention
3. ✅ Enable S3 lifecycle policies
4. ✅ Optimize log retention

**Estimated Implementation Time:** 1-2 hours

### Phase 2: Medium Effort (Save $300-500/month)
1. Set up scheduled scaling (scale down off-peak)
2. Switch to smaller RDS instance for appropriate workloads
3. Implement connection pooling (PgBouncer)
4. Use reserved instances for predictable workloads

**Estimated Implementation Time:** 4-8 hours

### Phase 3: Long-term (Save $500-1000/month)
1. Multi-region deployment with cost awareness
2. Advanced monitoring and optimization
3. Custom RI/Savings Plans strategy
4. Evaluate managed services vs. self-hosted

**Estimated Implementation Time:** 20-40 hours

## Estimated Cost Savings Summary

| Configuration | Before | After | Savings |
|---|---|---|---|
| Dev | $250 | $100-150 | 40-60% |
| Staging | $450 | $250-350 | 30-45% |
| Prod (Cost-optimized) | $1200 | $500-700 | 42-58% |
| Prod (HA) | $1500 | $1200 | 20% |

## References

- [AWS Cost Optimization Best Practices](https://aws.amazon.com/architecture/cost-optimization-pillar/)
- [EKS Cost Optimization Guide](https://aws.github.io/aws-eks-best-practices/cost_optimization/)
- [RDS Cost Optimization](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/User.CostOptimization.html)
- [ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)

---

**Last Updated:** January 2026
