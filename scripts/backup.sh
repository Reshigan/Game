#!/bin/bash
# scripts/backup.sh
# Database backup script
# ALL secrets are loaded from environment variables - NEVER hardcoded

set -euo pipefail

# Configuration - loaded from environment variables
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_NAME="${DB_NAME:-headache_monitor}"
S3_BUCKET="${S3_BUCKET:-headache-monitor-backups}"

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

# Create backup directory
setup_backup_dir() {
  log_info "Setting up backup directory..."
  mkdir -p "${BACKUP_DIR}"
  chmod 700 "${BACKUP_DIR}"
}

# Create database backup
create_backup() {
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/${DB_NAME}_${timestamp}.sql.gz"
  
  log_info "Creating database backup: ${backup_file}"
  
  # Extract host from DATABASE_URL
  local db_host
  db_host=$(echo "${DATABASE_URL}" | sed -n 's|.*@\(.*\):.*|\1|p')
  
  # Extract password from DATABASE_URL
  local db_password
  db_password=$(echo "${DATABASE_URL}" | sed -n 's|.*:\(.*\)@.*|\1|p')
  
  # Perform backup using pg_dump
  PGPASSWORD="${db_password}" pg_dump -h "${db_host}" -U postgres "${DB_NAME}" | gzip > "${backup_file}"
  
  if [ -f "${backup_file}" ]; then
    log_info "Backup created successfully: ${backup_file}"
    echo "${backup_file}"
  else
    log_error "Backup creation failed"
    exit 1
  fi
}

# Upload backup to S3
upload_to_s3() {
  local backup_file="$1"
  local s3_key="backups/$(basename "${backup_file}")"
  
  log_info "Uploading backup to S3: ${s3_key}"
  
  aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/${s3_key}" \
    --region "${AWS_REGION}" \
    --storage-class STANDARD_IA
  
  log_info "Backup uploaded successfully"
}

# Clean old backups
cleanup_old_backups() {
  log_info "Cleaning backups older than ${RETENTION_DAYS} days..."
  
  # Local cleanup
  find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
  
  # S3 cleanup
  aws s3 ls "s3://${S3_BUCKET}/backups/" --recursive | \
    while read -r line; do
      local file_date
      file_date=$(echo "${line}" | awk '{print $1}')
      local file_name
      file_name=$(echo "${line}" | awk '{print $4}')
      
      if [ -n "${file_date}" ] && [ -n "${file_name}" ]; then
        if [ "$(date -d "${file_date}" +%s)" -lt "$(date -d "-${RETENTION_DAYS} days" +%s)" ]; then
          aws s3 rm "s3://${S3_BUCKET}/${file_name}" --region "${AWS_REGION}"
        fi
      fi
    done
  
  log_info "Cleanup completed"
}

# Main execution
main() {
  log_info "Starting backup process..."
  
  validate_env
  setup_backup_dir
  
  local backup_file
  backup_file=$(create_backup)
  upload_to_s3 "${backup_file}"
  cleanup_old_backups
  
  log_info "Backup process completed successfully"
}

main "$@"