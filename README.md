# Full-Stack Production Infrastructure Blueprint

A cloud-agnostic, production-ready infrastructure blueprint for deploying a modern full-stack application with React frontend, Node.js API, PostgreSQL database, and Redis caching on AWS EKS.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Monitoring & Observability](#monitoring--observability)
- [Cost Optimization](#cost-optimization)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL USERS / CLIENTS                           │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │  AWS CloudFront CDN                      │
        │  • SSL/TLS Termination                   │
        │  • Global Edge Caching                   │
        │  • DDoS Protection (AWS Shield)          │
        │  • Geographic Failover                   │
        └──────────────────┬───────────────────────┘
                           │
        ┌──────────────────┴────────────────────┐
        │                                       │
        ▼                                       ▼
    ┌─────────────────┐           ┌──────────────────────┐
    │ S3 Bucket       │           │ Application ALB      │
    │ • React SPA     │           │ • Path-based routing │
    │ • Assets        │           │ • SSL termination    │
    │ • Versioning    │           │ • Health checks      │
    └─────────────────┘           └────────────┬─────────┘
                                               │
                    ┌──────────────────────────┴──────────────────────┐
                    │                                                  │
                    ▼                                                  ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │                    AWS VPC (10.0.0.0/16)                          │
        │  ┌─────────────────────────────────────────────────────────────┐  │
        │  │                  Public Subnets                             │  │
        │  │  • NAT Gateway                                              │  │
        │  │  • Internet Gateway                                         │  │
        │  └─────────────────────────────────────────────────────────────┘  │
        │                                                                    │
        │  ┌─────────────────────────────────────────────────────────────┐  │
        │  │                  Private Subnets                            │  │
        │  │                                                             │  │
        │  │  ┌──────────────────────────────────────────────────────┐  │  │
        │  │  │      EKS Kubernetes Cluster                         │  │  │
        │  │  │                                                      │  │  │
        │  │  │  ┌────────────────────────────────────────────────┐ │  │  │
        │  │  │  │  fullstack-prod Namespace                      │ │  │  │
        │  │  │  │                                                │ │  │  │
        │  │  │  │  ┌──────┐  ┌──────┐  ┌──────┐               │ │  │  │
        │  │  │  │  │Node  │  │Node  │  │Node  │  (min: 3)    │ │  │  │
        │  │  │  │  │API 1 │  │API 2 │  │API 3 │  (max: 10)   │ │  │  │
        │  │  │  │  └────┬─┘  └────┬─┘  └────┬─┘               │ │  │  │
        │  │  │  │       └──────┬───┴────┬────┘                │ │  │  │
        │  │  │  │              ▼        ▼                      │ │  │  │
        │  │  │  │        ┌──────────────────┐                │ │  │  │
        │  │  │  │        │ Service (ClusterIP)              │ │  │  │
        │  │  │  │        │ Port: 80/3000    │                │ │  │  │
        │  │  │  │        └──────────────────┘                │ │  │  │
        │  │  │  │                                            │ │  │  │
        │  │  │  │  HPA: CPU 70%, Memory 80%                 │ │  │  │
        │  │  │  │  PDB: Min Available 2                     │ │  │  │
        │  │  │  └────────────────────────────────────────────┘ │  │  │
        │  │  │                                                  │  │  │
        │  │  │  ┌────────────────────────────────────────────┐ │  │  │
        │  │  │  │  monitoring Namespace                      │ │  │  │
        │  │  │  │                                            │ │  │  │
        │  │  │  │  ┌──────────┐  ┌───────────┐             │ │  │  │
        │  │  │  │  │Prometheus│  │  Grafana  │             │ │  │  │
        │  │  │  │  │Port 9090 │  │ Port 3000 │             │ │  │  │
        │  │  │  │  └──────────┘  └───────────┘             │ │  │  │
        │  │  │  └────────────────────────────────────────────┘ │  │  │
        │  │  └──────────────────────────────────────────────────┘  │  │
        │  │                                                         │  │
        │  │  ┌──────────────────────────────────────────────────┐  │  │
        │  │  │  Security Groups                                │  │  │
        │  │  │  • Worker SG: TCP 0-65535 from VPC CIDR        │  │  │
        │  │  │  • DB SG: PostgreSQL 5432 from Worker SG       │  │  │
        │  │  │  • Cache SG: Redis 6379 from Worker SG         │  │  │
        │  │  │  • ALB SG: HTTP/HTTPS from 0.0.0.0/0          │  │  │
        │  │  └──────────────────────────────────────────────────┘  │  │
        │  └─────────────────────────────────────────────────────────┘  │
        │                                                                │
        │  ┌─────────────────────────────────────────────────────────┐  │
        │  │  Data & Cache Layer                                     │  │
        │  │                                                         │  │
        │  │  ┌──────────────────────┐  ┌──────────────────────┐   │  │
        │  │  │  RDS PostgreSQL      │  │ ElastiCache Redis    │   │  │
        │  │  │  • Multi-AZ          │  │ • Cluster Mode       │   │  │
        │  │  │  • Automated Backup  │  │ • Multi-AZ           │   │  │
        │  │  │  • Read Replica      │  │ • Encryption (TLS)   │   │  │
        │  │  │  • PITR Support      │  │ • Auth Token         │   │  │
        │  │  │  • Port: 5432        │  │ • Port: 6379         │   │  │
        │  │  └──────────────────────┘  └──────────────────────┘   │  │
        │  └─────────────────────────────────────────────────────────┘  │
        └────────────────────────────────────────────────────────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
                ▼                                     ▼
        ┌──────────────────────┐          ┌──────────────────────┐
        │  AWS CloudWatch      │          │  AWS Secrets Manager │
        │  • Logs              │          │  • DB Password       │
        │  • Metrics           │          │  • Redis Password    │
        │  • Alarms            │          │  • API Keys          │
        │  • Dashboards        │          │  • JWT Secrets       │
        └──────────────────────┘          └──────────────────────┘
```

## Quick Start

### Prerequisites

- AWS Account with appropriate IAM permissions
- Terraform >= 1.0
- `aws-cli` v2
- `kubectl` >= 1.24
- `helm` >= 3.0 (optional, for advanced deployments)
- Docker (for building custom images)

### Installation & Deployment

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd FullStackDirectory.root
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   # Or use environment variables:
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   export AWS_DEFAULT_REGION=us-east-1
   ```

3. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

4. **Review and customize variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

5. **Plan the deployment:**
   ```bash
   terraform plan -out=tfplan
   ```

6. **Apply Terraform configuration:**
   ```bash
   terraform apply tfplan
   ```

7. **Configure kubectl:**
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name fullstack-prod-eks
   ```

8. **Deploy Kubernetes manifests:**
   ```bash
   kubectl apply -f ../k8s/00-namespace-config.yaml
   kubectl apply -f ../k8s/01-deployment.yaml
   kubectl apply -f ../k8s/02-service-hpa-pdb.yaml
   kubectl apply -f ../k8s/03-ingress-network-policy.yaml
   kubectl apply -f ../k8s/04-monitoring-prometheus.yaml
   kubectl apply -f ../k8s/05-monitoring-grafana.yaml
   ```

9. **Verify deployment:**
   ```bash
   kubectl get pods -n fullstack-prod
   kubectl get svc -n fullstack-prod
   ```

## Directory Structure

```
FullStackDirectory.root/
├── terraform/                          # Infrastructure as Code
│   ├── main.tf                        # Provider & core configuration
│   ├── variables.tf                   # Input variables
│   ├── modules.tf                     # Module composition
│   ├── outputs.tf                     # Output values
│   ├── terraform.tfvars.example       # Example variable values
│   └── modules/
│       ├── vpc/                       # VPC, Subnets, NAT, IGW
│       ├── security/                  # Security Groups, WAF
│       ├── eks/                       # EKS Cluster, Node Groups, IRSA
│       ├── rds/                       # PostgreSQL, Read Replicas
│       ├── redis/                     # ElastiCache Redis Cluster
│       ├── cdn/                       # S3, CloudFront CDN
│       └── monitoring/                # CloudWatch, Alarms, SNS
│
├── k8s/                               # Kubernetes Manifests
│   ├── 00-namespace-config.yaml       # Namespaces, ConfigMaps, Secrets
│   ├── 01-deployment.yaml             # Node.js API Deployment
│   ├── 02-service-hpa-pdb.yaml        # Service, HPA, PDB
│   ├── 03-ingress-network-policy.yaml # ALB Ingress, Network Policies
│   ├── 04-monitoring-prometheus.yaml  # Prometheus & RBAC
│   └── 05-monitoring-grafana.yaml     # Grafana Dashboards
│
└── README.md                          # This file
```

## Configuration

### Terraform Variables

Edit `terraform/terraform.tfvars`:

```hcl
aws_region             = "us-east-1"
environment            = "prod"
project_name           = "fullstack-app"

# VPC
vpc_cidr               = "10.0.0.0/16"
availability_zones     = ["us-east-1a", "us-east-1b", "us-east-1c"]
enable_nat_gateway     = true

# EKS
eks_cluster_version    = "1.28"
eks_desired_size       = 3
eks_min_size           = 1
eks_max_size           = 10
eks_instance_types     = ["t3.medium"]

# RDS
rds_instance_class     = "db.t3.small"
rds_allocated_storage  = 20

# Redis
redis_node_type        = "cache.t3.micro"
redis_num_cache_clusters = 2

# Monitoring
enable_monitoring      = true

# Tags
tags = {
  CostCenter = "engineering"
  Owner      = "platform-team"
}
```

### Kubernetes Secrets

Update ConfigMaps and Secrets in `k8s/00-namespace-config.yaml`:

```yaml
- DATABASE_URL: postgresql://user:pass@rds-endpoint/appdb
- REDIS_URL: rediss://:password@redis-endpoint:6379
- JWT_SECRET: your-secret-key
```

## Monitoring & Observability

### Prometheus

Metrics are automatically scraped from:
- Kubernetes nodes and pods
- Node.js API application (`/metrics` endpoint)
- RDS and Redis via CloudWatch

Access Prometheus:
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090
```

### Grafana

Pre-configured dashboards for:
- Kubernetes cluster health
- Node.js application metrics
- RDS database performance
- Redis cache statistics

Access Grafana:
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit http://localhost:3000 (admin/password)
```

### CloudWatch Alarms

Automatic alarms for:
- EKS node CPU > 80%
- RDS CPU > 80%
- RDS connections > 80
- Redis CPU > 75%
- Redis memory > 90%

## Cost Optimization

### Production Cost-Optimized Configuration

For cost-conscious deployments, see [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md).

Key strategies:
- Use Reserved Instances for compute
- Spot instances for non-critical workloads
- Auto-scaling policies
- Scheduled scaling for off-peak
- Database connection pooling
- Redis eviction policies

**Estimated Monthly Costs (Multi-AZ Production):**
- EKS: $73 (cluster) + $150-300 (nodes)
- RDS: $200-400 (multi-AZ with backup)
- Redis: $100-200 (cluster with multi-AZ)
- Data Transfer: $50-100
- **Total: ~$600-1100/month** (varies by region and usage)

## Security

### Best Practices Implemented

✅ **Network Security:**
- VPC isolation with public/private subnets
- NAT Gateway for outbound traffic
- Security Groups with principle of least privilege
- Network Policies for pod-to-pod communication

✅ **Data Security:**
- RDS encryption at rest (KMS)
- Redis encryption in transit (TLS)
- Database and cache credentials in Secrets Manager
- RDS automated backups (30-day retention)

✅ **Access Control:**
- IRSA (IAM Roles for Service Accounts)
- Kubernetes RBAC policies
- Pod security context (non-root user)
- Read-only root filesystem

✅ **Monitoring:**
- CloudWatch Logs for audit trails
- VPC Flow Logs for network analysis
- Application logging (structured JSON)
- Prometheus metrics collection

### Required Updates

Before deploying to production:

1. **ACM Certificate:** Update Ingress with your SSL certificate ARN
2. **Domain Names:** Replace `example.com` with your domains
3. **Secrets:** Rotate auto-generated DB/Redis passwords
4. **Backup:** Enable S3 versioning and lifecycle policies
5. **WAF:** Configure AWS WAF rules for DDoS protection

## Deployment Steps

### Step 1: Infrastructure Provisioning

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Step 2: Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name fullstack-prod-eks
kubectl cluster-info
```

### Step 3: Deploy Application

```bash
# Create namespace and secrets
kubectl apply -f ../k8s/00-namespace-config.yaml

# Deploy API server
kubectl apply -f ../k8s/01-deployment.yaml
kubectl apply -f ../k8s/02-service-hpa-pdb.yaml

# Configure ingress and network policies
kubectl apply -f ../k8s/03-ingress-network-policy.yaml

# Deploy monitoring stack
kubectl apply -f ../k8s/04-monitoring-prometheus.yaml
kubectl apply -f ../k8s/05-monitoring-grafana.yaml
```

### Step 4: Verify & Test

```bash
# Check pod status
kubectl get pods -n fullstack-prod
kubectl logs -n fullstack-prod deployment/node-api

# Test API endpoint
kubectl port-forward -n fullstack-prod svc/node-api 3000:80
curl http://localhost:3000/health
```

## Troubleshooting

### Common Issues

#### 1. EKS Cluster Not Responding
```bash
# Check cluster status
aws eks describe-cluster --name fullstack-prod-eks

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name fullstack-prod-eks
```

#### 2. Pod CrashLoopBackOff
```bash
# Check logs
kubectl logs -n fullstack-prod deployment/node-api --previous

# Check resource limits
kubectl describe pod -n fullstack-prod <pod-name>
```

#### 3. RDS Connection Failed
```bash
# Verify security group rules
aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName==`fullstack-prod-rds-sg`]'

# Test connection from pod
kubectl exec -it -n fullstack-prod <pod-name> -- psql -h <rds-endpoint> -U dbadmin
```

#### 4. Redis Connection Issues
```bash
# Check ElastiCache cluster status
aws elasticache describe-replication-groups --replication-group-id fullstack-prod-redis

# Test from pod
kubectl exec -it -n fullstack-prod <pod-name> -- redis-cli -h <redis-endpoint> ping
```

## Cleanup

To remove all resources:

```bash
# Delete Kubernetes resources
kubectl delete namespace fullstack-prod monitoring
