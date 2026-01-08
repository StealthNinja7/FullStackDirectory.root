# Quick Start Guide

## One-Command Deployment

The fastest way to deploy this infrastructure to AWS:

```bash
# From the repository root
./deploy.sh
```

This script will:
1. ✓ Validate all prerequisites (AWS CLI, Terraform, kubectl)
2. ✓ Initialize Terraform
3. ✓ Create and review infrastructure plan
4. ✓ Provision all AWS resources (VPC, EKS, RDS, Redis, CDN)
5. ✓ Configure kubectl
6. ✓ Deploy Kubernetes manifests
7. ✓ Deploy monitoring stack (Prometheus, Grafana)

**Total Time:** ~15-20 minutes

## Prerequisites

Before running `./deploy.sh`, ensure you have:

### Required Tools
```bash
# AWS CLI v2
aws --version

# Terraform >= 1.0
terraform version

# kubectl >= 1.24
kubectl version --client

# jq (for JSON parsing in scripts)
jq --version
```

### AWS Setup
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

### Infrastructure Access

You need AWS IAM permissions for:
- VPC, Subnets, Route Tables, NAT Gateway
- EKS Cluster, Node Groups, IAM Roles
- RDS PostgreSQL with Multi-AZ
- ElastiCache Redis
- S3, CloudFront
- CloudWatch, SNS
- Secrets Manager
- EC2, IAM

## Step-by-Step Manual Deployment

If you prefer to deploy manually:

### 1. Initialize Terraform

```bash
cd terraform
terraform init
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Plan & Apply Infrastructure

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### 3. Configure kubectl

```bash
# Get cluster name from Terraform output
CLUSTER_NAME=$(terraform output -raw eks_cluster_name)

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name $CLUSTER_NAME
```

### 4. Deploy Application

```bash
cd ../k8s

# Create namespace and secrets
kubectl apply -f 00-namespace-config.yaml

# Deploy application
kubectl apply -f 01-deployment.yaml
kubectl apply -f 02-service-hpa-pdb.yaml
kubectl apply -f 03-ingress-network-policy.yaml

# Deploy monitoring
kubectl apply -f 04-monitoring-prometheus.yaml
kubectl apply -f 05-monitoring-grafana.yaml
```

### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -n fullstack-prod
kubectl get pods -n monitoring

# View logs
kubectl logs -n fullstack-prod deployment/node-api
```

## Accessing the Application

### API Endpoint

```bash
# Get the ALB endpoint
kubectl get ingress -n fullstack-prod

# Or port-forward for testing
kubectl port-forward -n fullstack-prod svc/node-api 3000:80
curl http://localhost:3000/health
```

### Prometheus

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit: http://localhost:9090
```

### Grafana

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit: http://localhost:3000
# Username: admin
# Password: (check in 00-namespace-config.yaml secrets)
```

## Configuration

### Environment Variables

Edit `k8s/00-namespace-config.yaml`:

```yaml
DATABASE_URL: postgresql://user:password@rds-endpoint:5432/appdb
REDIS_URL: rediss://:password@redis-endpoint:6379
JWT_SECRET: your-secret-key
API_KEY: your-api-key
```

### Terraform Variables

Edit `terraform/terraform.tfvars`:

```hcl
aws_region             = "us-east-1"
environment            = "prod"
eks_desired_size       = 3
rds_instance_class     = "db.t3.small"
redis_node_type        = "cache.t3.micro"
enable_monitoring      = true
```

## Cost Estimation

| Environment | Monthly Cost | Components |
|---|---|---|
| **Dev** | $100-200 | Minimal compute, small DB |
| **Staging** | $300-500 | Medium compute, shared DB |
| **Production** | $800-1500 | Full HA, multi-AZ setup |

See [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) for detailed breakdown.

## Monitoring & Maintenance

### Health Checks

```bash
# Check cluster health
kubectl cluster-info
kubectl get nodes

# Check application pods
kubectl get pods -n fullstack-prod
kubectl describe pod -n fullstack-prod <pod-name>

# Check services
kubectl get svc -n fullstack-prod
kubectl get svc -n monitoring
```

### Viewing Logs

```bash
# Application logs
kubectl logs -n fullstack-prod deployment/node-api

# Previous pod logs (if crashed)
kubectl logs -n fullstack-prod deployment/node-api --previous

# Stream logs
kubectl logs -f -n fullstack-prod deployment/node-api

# Monitoring logs
kubectl logs -n monitoring deployment/prometheus
kubectl logs -n monitoring deployment/grafana
```

### Database Access

```bash
# Connect to RDS via EC2 bastion or port-forward
RDS_ENDPOINT=$(terraform -chdir=terraform output -raw rds_endpoint)
psql -h $RDS_ENDPOINT -U dbadmin -d appdb
```

### Redis Access

```bash
# Connect to Redis
REDIS_ENDPOINT=$(terraform -chdir=terraform output -raw redis_endpoint)
redis-cli -h $REDIS_ENDPOINT --tls --insecure ping
```

## Cleanup

### Delete Everything

```bash
./teardown.sh
```

This script will:
- Backup Kubernetes manifests
- Delete all Kubernetes resources
- Destroy all AWS infrastructure
- Clean up Terraform state files

⚠️ **Warning:** This cannot be undone. Ensure you have backups.

### Selective Cleanup

```bash
# Delete only Kubernetes resources
kubectl delete namespace fullstack-prod monitoring

# Or delete specific resources
kubectl delete deployment -n fullstack-prod node-api
kubectl delete svc -n fullstack-prod node-api
```

## Troubleshooting

### Deployment Stuck

```bash
# Check pod events
kubectl describe pod -n fullstack-prod <pod-name>

# Check node status
kubectl get nodes
kubectl describe node <node-name>

# Check cluster events
kubectl get events -n fullstack-prod
```

### Pods Not Starting

```bash
# Common issues:
# 1. Insufficient resources
kubectl describe nodes

# 2. Image pull errors
kubectl logs -n fullstack-prod <pod-name>

# 3. Database connection issues
# Check RDS security group and endpoint
aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName==`fullstack-prod-rds-sg`]'
```

### Terraform Errors

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform apply

# Validate configuration
terraform validate
terraform fmt -recursive .

# View state
terraform show
terraform state list
```

## Next Steps

1. **Customize Application:**
   - Update Node.js API code
   - Update React frontend
   - Configure your domain names

2. **Enable HTTPS:**
   - Create ACM certificate
   - Update Ingress with certificate ARN
   - Configure domain DNS

3. **Setup CI/CD:**
   - Create GitHub Actions workflows
   - Configure Docker image registry
   - Setup automatic deployments

4. **Implement Backup Strategy:**
   - Configure RDS snapshots
   - Enable cross-region backups
   - Test restore procedures

5. **Security Hardening:**
   - Enable WAF rules
   - Configure Network ACLs
   - Setup VPC Flow Logs
   - Enable GuardDuty

## Support

For issues or questions:

1. Check [README.md](README.md) for detailed documentation
2. Review [COST_OPTIMIZATION.md](COST_OPTIMIZATION.md) for cost-related questions
3. See troubleshooting section in README.md
4. Create an issue in GitHub with:
   - Error logs
   - Steps to reproduce
   - Terraform/Kubernetes versions
   - AWS region and account info

---

**Questions?** Refer to the full [README.md](README.md) for comprehensive documentation.
