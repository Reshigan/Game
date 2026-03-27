#!/bin/bash
# scripts/restore.sh
# Database restore script
# ALL secrets are loaded from environment variables - NEVER hardcoded

set -euo pipefail

# Configuration - loaded from environment variables
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
DB_NAME="${DB_NAME:-headache_monitor}"
S3_BUCKET="${S3_BUCKET:-headache-monitor-backups}"
RESTORE_FILE="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Validate required environment variables
validate_env() {
  local required_vars=(
    "DATABASE_URL"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
  )
  
  local missing=()
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${missing[*]}"
    exit 1
  fi
}

# Download backup from S3
download_from_s3() {
  local s3_key="$1"
  local local_file="${BACKUP_DIR}/$(basename "${s3_key}")"
  
  log_info "Downloading backup from S3: ${s3_key}"
  
  mkdir -p "${BACKUP_DIR}"
  aws s3 cp "s3://${S3_BUCKET}/${s3_key}" "${local_file}" \
    --region "${AWS_REGION}"
  
  if [ -f "${local_file}" ]; then
    log_info "Backup downloaded successfully: ${local_file}"
    echo "${local_file}"
  else
    log_error "Download failed"
    exit 1
  fi
}

# List available backups
list_backups() {
  log_info "Available backups in S3:"
  aws s3 ls "s3://${S3_BUCKET}/backups/" --recursive --region "${AWS_REGION}" | \
    awk '{print $4}' | sort -r
}

# Restore database from backup
restore_database() {
  local backup_file="$1"
  
  log_info "Restoring database from: ${backup_file}"
  
  # Extract host from DATABASE_URL
  local db_host
  db_host=$(echo "${DATABASE_URL}" | sed -n 's|.*@\(.*\):.*|\1|p')
  
  # Extract password from DATABASE_URL
  local db_password
  db_password=$(echo "${DATABASE_URL}" | sed -n 's|.*:\(.*\)@.*|\1|p')
  
  # Decompress and restore
  gunzip -c "${backup_file}" | PGPASSWORD="${db_password}" psql -h "${db_host}" -U postgres "${DB_NAME}"
  
  if [ $? -eq 0 ]; then
    log_info "Database restore completed successfully"
  else
    log_error "Database restore failed"
    exit 1
  fi
}

# Verify restore
verify_restore() {
  log_info "Verifying restore..."
  
  # Extract credentials
  local db_host
  db_host=$(echo "${DATABASE_URL}" | sed -n 's|.*@\(.*\):.*|\1|p')
  local db_password
  db_password=$(echo "${DATABASE_URL}" | sed -n 's|.*:\(.*\)@.*|\1|p')
  
  local table_count
  table_count=$(PGPASSWORD="${db_password}" psql -h "${db_host}" -U postgres "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
  
  if [ "${table_count:-0}" -gt 0 ]; then
    log_info "Restore verified: ${table_count} tables found"
  else
    log_error "Restore verification failed"
    exit 1
  fi
}

# Main execution
main() {
  log_info "Starting restore process..."
  
  validate_env
  
  if [ -z "${RESTORE_FILE:-}" ]; then
    log_warn "No backup file specified"
    log_info "Listing available backups:"
    list_backups
    exit 0
  fi
  
  # Check if file is S3 key or local path
  if [[ "${RESTORE_FILE}" == s3://* ]]; then
    RESTORE_FILE=$(download_from_s3 "${RESTORTEC_KEY#s3://${S3_BUCKET}/}")
  fi
  
  if [ ! -f "${RESTORE_FILE}" ]; then
    log_error "Backup file not found: ${RESTORE_FILE}"
    exit 1
  fi
  
  restore_database "${RESTORE_FILE}"
  verify_restore
  
  log_info "Restore process completed successfully"
}

main "$@"