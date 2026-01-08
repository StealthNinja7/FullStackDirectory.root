#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
print_header "Checking Prerequisites"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi
print_success "AWS CLI installed: $(aws --version)"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed"
    exit 1
fi
print_success "Terraform installed: $(terraform version -json | jq -r '.terraform_version')"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed"
    exit 1
fi
print_success "kubectl installed: $(kubectl version --client --short)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-us-east-1}
print_success "AWS Account: $AWS_ACCOUNT"
print_success "AWS Region: $AWS_REGION"

# Terraform Initialization and Planning
print_header "Initializing Terraform"

cd terraform

if [ -d ".terraform" ]; then
    print_warning "Terraform already initialized, skipping init"
else
    terraform init
    print_success "Terraform initialized"
fi

# Check for terraform.tfvars
if [ ! -f "terraform.tfvars" ]; then
    print_warning "terraform.tfvars not found"
    print_warning "Copying from terraform.tfvars.example..."
    cp terraform.tfvars.example terraform.tfvars
    print_warning "Please edit terraform.tfvars with your values before continuing"
    exit 1
fi

# Format and validate Terraform
print_header "Validating Terraform Configuration"

terraform fmt -recursive .
print_success "Terraform formatted"

terraform validate
print_success "Terraform configuration is valid"

# Plan Terraform
print_header "Creating Terraform Plan"

terraform plan -out=tfplan
print_success "Terraform plan created: tfplan"

# Ask for confirmation
print_warning "Review the plan above. Do you want to apply these changes? (yes/no)"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    print_warning "Deployment cancelled"
    exit 1
fi

# Apply Terraform
print_header "Applying Terraform Configuration"

terraform apply tfplan
print_success "Infrastructure provisioned successfully"

# Get cluster information
CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
print_success "EKS Cluster Name: $CLUSTER_NAME"

# Update kubeconfig
print_header "Configuring kubectl"

aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
print_success "kubeconfig updated"

# Verify cluster connection
print_header "Verifying Cluster Connection"

kubectl cluster-info
print_success "Cluster is accessible"

# Deploy Kubernetes manifests
print_header "Deploying Kubernetes Manifests"

cd ..

# Create namespaces and secrets
print_header "Creating Kubernetes Resources"
kubectl apply -f k8s/00-namespace-config.yaml
print_success "Namespace and config created"

# Deploy application
kubectl apply -f k8s/01-deployment.yaml
kubectl apply -f k8s/02-service-hpa-pdb.yaml
print_success "Application deployment created"

# Configure ingress
kubectl apply -f k8s/03-ingress-network-policy.yaml
print_success "Ingress and network policies configured"

# Deploy monitoring
kubectl apply -f k8s/04-monitoring-prometheus.yaml
kubectl apply -f k8s/05-monitoring-grafana.yaml
print_success "Monitoring stack deployed"

# Wait for pods to be ready
print_header "Waiting for Pods to be Ready"

echo "Waiting for API pods to be ready..."
kubectl rollout status deployment/node-api -n fullstack-prod --timeout=5m

echo "Waiting for Prometheus to be ready..."
kubectl rollout status deployment/prometheus -n monitoring --timeout=5m || true

echo "Waiting for Grafana to be ready..."
kubectl rollout status deployment/grafana -n monitoring --timeout=5m || true

print_success "All pods are ready"

# Display information
print_header "Deployment Summary"

echo ""
echo "Infrastructure:"
echo "  EKS Cluster: $(terraform -chdir=terraform output -raw eks_cluster_name)"
echo "  API Endpoint: $(terraform -chdir=terraform output -raw eks_cluster_endpoint)"
echo "  RDS Endpoint: $(terraform -chdir=terraform output -raw rds_endpoint 2>/dev/null || echo 'N/A')"
echo "  Redis Endpoint: $(terraform -chdir=terraform output -raw redis_endpoint 2>/dev/null || echo 'N/A')"
echo ""
echo "Access Points:"
echo "  API Service:"
kubectl get svc node-api -n fullstack-prod -o wide || true
echo ""
echo "  Prometheus:"
echo "    kubectl port-forward -n monitoring svc/prometheus 9090:9090"
echo "    Then visit: http://localhost:9090"
echo ""
echo "  Grafana:"
echo "    kubectl port-forward -n monitoring svc/grafana 3000:3000"
echo "    Then visit: http://localhost:3000"
echo ""

print_success "Deployment completed successfully!"
print_header "Next Steps"

echo "1. Update secrets in k8s/00-namespace-config.yaml with actual values:"
echo "   - DATABASE_URL (from RDS endpoint)"
echo "   - REDIS_URL (from Redis endpoint)"
echo "   - JWT_SECRET and API_KEY"
echo ""
echo "2. Configure Ingress with your domain and SSL certificate"
echo ""
echo "3. Monitor the application:"
echo "   kubectl logs -n fullstack-prod deployment/node-api"
echo ""
echo "4. Clean up resources when done:"
echo "   ./teardown.sh"
echo ""

exit 0
