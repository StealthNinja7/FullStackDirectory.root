# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr               = var.vpc_cidr
  availability_zones     = var.availability_zones
  enable_nat_gateway     = var.enable_nat_gateway
  
  tags = var.tags
}

# Security Module
module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  
  tags = var.tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"

  project_name       = var.project_name
  environment        = var.environment
  cluster_version    = var.eks_cluster_version
  desired_size       = var.eks_desired_size
  min_size           = var.eks_min_size
  max_size           = var.eks_max_size
  instance_types     = var.eks_instance_types
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  security_group_id  = module.security.worker_security_group_id
  
  tags = var.tags
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  project_name            = var.project_name
  environment             = var.environment
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  db_security_group_id    = module.security.db_security_group_id
  
  enable_monitoring       = var.enable_monitoring
  
  tags = var.tags
}

# Redis ElastiCache Module
module "redis" {
  source = "./modules/redis"

  project_name            = var.project_name
  environment             = var.environment
  node_type              = var.redis_node_type
  num_cache_clusters     = var.redis_num_cache_clusters
  
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  cache_security_group_id = module.security.cache_security_group_id
  
  tags = var.tags
}

# S3 & CDN Module
module "cdn" {
  source = "./modules/cdn"

  project_name = var.project_name
  environment  = var.environment
  
  tags = var.tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  project_name   = var.project_name
  environment    = var.environment
  enable_enabled = var.enable_monitoring
  
  eks_cluster_name   = module.eks.cluster_name
  rds_instance_id    = module.rds.instance_id
  redis_cluster_id   = module.redis.cluster_id
  
  tags = var.tags
}
