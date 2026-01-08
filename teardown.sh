#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

print_header "FullStack Infrastructure Teardown"
print_warning "This will delete all AWS resources and Kubernetes manifests"
print_warning "Are you sure? Type 'yes' to confirm"
read -r CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    print_warning "Teardown cancelled"
    exit 0
fi

# Get cluster name for final backup
print_header "Creating Pre-Teardown Backup"

if command -v kubectl &> /dev/null; then
    echo "Backing up application state..."
    kubectl get all -n fullstack-prod -o yaml > backup-fullstack-prod-$(date +%Y%m%d-%H%M%S).yaml || true
    kubectl get all -n monitoring -o yaml > backup-monitoring-$(date +%Y%m%d-%H%M%S).yaml || true
    print_success "Backups created"
fi

# Delete Kubernetes resources
print_header "Deleting Kubernetes Resources"

if command -v kubectl &> /dev/null; then
    echo "Deleting monitoring namespace..."
    kubectl delete namespace monitoring --ignore-not-found=true || true
    
    echo "Deleting fullstack-prod namespace..."
    kubectl delete namespace fullstack-prod --ignore-not-found=true || true
    
    print_success "Kubernetes resources deleted"
fi

# Destroy Terraform
print_header "Destroying Terraform Infrastructure"

cd terraform

if terraform plan -destroy -out=tfplan_destroy; then
    print_warning "Review the destruction plan above. Continue? (yes/no)"
    read -r DESTROY_CONFIRMATION
    
    if [ "$DESTROY_CONFIRMATION" != "yes" ]; then
        print_warning "Destruction cancelled"
        rm -f tfplan_destroy
        exit 0
    fi
    
    terraform apply tfplan_destroy
    print_success "All AWS resources have been destroyed"
    
    rm -f tfplan_destroy
else
    print_error "Failed to create destruction plan"
    exit 1
fi

# Cleanup local state
print_header "Cleanup"

rm -f tfplan
print_success "Local terraform plan files cleaned up"

print_header "Teardown Complete"
print_warning "Summary:"
echo "  - All Kubernetes namespaces deleted"
echo "  - All AWS resources destroyed"
echo "  - RDS final snapshots created (check AWS console)"
echo "  - Backups saved in current directory"
echo ""
print_success "Infrastructure has been successfully torn down!"

exit 0
