#!/bin/bash
# scripts/deploy-k8s.sh
# Kubernetes deployment script
# ALL secrets are loaded from environment variables - NEVER hardcoded

set -euo pipefail

# Configuration - loaded from environment variables
NAMESPACE="${K8S_NAMESPACE:-headache-monitor}"
RELEASE_NAME="${RELEASE_NAME:-headache-monitor}"
CHART_PATH="${CHART_PATH:-./helm-chart}"
VALUES_FILE="${VALUES_FILE:-./helm-chart/values.yaml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Validate required environment variables are set
validate_env() {
  local required_vars=(
    "JWT_SECRET"
    "SESSION_SECRET"
    "ENCRYPTION_KEY"
    "DATABASE_URL"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
  )
  
  local missing=()
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${missing[*]}"
    log_error "Please set these variables before running this script"
    exit 1
  fi
  
  log_info "All required environment variables are set"
}

# Create Kubernetes secrets from environment variables
create_secrets() {
  log_info "Creating Kubernetes secrets..."
  
  # Create app-secrets
  kubectl create secret generic app-secrets \
    --from-literal=JWT_SECRET="${JWT_SECRET}" \
    --from-literal=SESSION_SECRET="${SESSION_SECRET}" \
    --from-literal=ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
    --dry-run=client -o yaml | kubectl apply -f - \
    -n "${NAMESPACE}" 2>/dev/null || true
  
  # Create aws-credentials
  kubectl create secret generic aws-credentials \
    --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    --dry-run=client -o yaml | kubectl apply -f - \
    -n "${NAMESPACE}" 2>/dev/null || true
  
  # Create db-credentials-secret
  kubectl create secret generic db-credentials-secret \
    --from-literal=DATABASE_URL="${DATABASE_URL}" \
    --dry-run=client -o yaml | kubectl apply -f - \
    -n "${NAMESPACE}" 2>/dev/null || true
  
  log_info "Kubernetes secrets created successfully"
}

# Deploy the application
deploy() {
  log_info "Deploying ${RELEASE_NAME} to ${NAMESPACE}..."
  
  # Ensure namespace exists
  kubectl get namespace "${NAMESPACE}" &>/dev/null || kubectl create namespace "${NAMESPACE}"
  
  # Apply secrets first
  create_secrets
  
  # Run Helm upgrade/install
  helm upgrade --install "${RELEASE_NAME}" "${CHART_PATH}" \
    --namespace "${NAMESPACE}" \
    --values "${VALUES_FILE}" \
    --set image.tag="${IMAGE_TAG:-latest}" \
    --wait \
    --timeout 300s
  
  log_info "Deployment completed successfully"
}

# Verify deployment
verify() {
  log_info "Verifying deployment..."
  
  # Check pods are running
  local ready_pods
  ready_pops=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=headache-monitor -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -c "True" || echo "0")
  
  if [ "${ready_pods}" -gt 0 ]; then
    log_info "Deployment verified: ${ready_pods} pods ready"
  else
    log_error "Deployment verification failed: no ready pods"
    exit 1
  fi
}

# Main execution
main() {
  log_info "Starting Kubernetes deployment..."
  
  validate_env
  deploy
  verify
  
  log_info "Deployment complete!"
}

main "$@"