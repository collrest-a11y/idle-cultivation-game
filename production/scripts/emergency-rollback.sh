#!/bin/bash
# Emergency Rollback Script
# Idle Cultivation Game - Rapid Production Recovery

set -e

# Configuration
APP_NAME="idle-cultivation-game"
DEPLOY_DIR="/app"
BACKUP_DIR="/app/backups"
LOG_FILE="/var/log/emergency-rollback.log"
MAX_ROLLBACK_TIME=900  # 15 minutes maximum rollback time

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

critical() {
    echo -e "${RED}${BOLD}[CRITICAL]${NC} $1" | tee -a $LOG_FILE
}

# Send emergency notification
send_emergency_notification() {
    local message=$1
    local status=${2:-"emergency"}

    critical "EMERGENCY NOTIFICATION: $message"

    # Log to system log
    logger -t "emergency-rollback" "$status: $message"

    # Send to monitoring system (implement based on your setup)
    # Example: Slack, PagerDuty, email, etc.

    # Slack notification example:
    # curl -X POST -H 'Content-type: application/json' \
    #      --data "{\"text\":\"🚨 EMERGENCY ROLLBACK: $message\"}" \
    #      "$SLACK_EMERGENCY_WEBHOOK"

    # PagerDuty integration example:
    # curl -X POST "https://events.pagerduty.com/v2/enqueue" \
    #      -H "Content-Type: application/json" \
    #      -d "{\"routing_key\":\"$PAGERDUTY_KEY\",\"event_action\":\"trigger\",\"payload\":{\"summary\":\"$message\",\"severity\":\"critical\"}}"
}

# Verify emergency situation
verify_emergency() {
    critical "EMERGENCY ROLLBACK INITIATED"
    critical "=============================="

    warning "This script will immediately rollback the production system"
    warning "All current user sessions may be interrupted"
    warning "Data since last backup may be lost"

    if [ "${1:-}" != "--force" ]; then
        echo ""
        read -p "Are you sure you want to proceed with emergency rollback? (type 'EMERGENCY' to confirm): " confirm

        if [ "$confirm" != "EMERGENCY" ]; then
            log "Emergency rollback cancelled by user"
            exit 0
        fi
    fi

    log "Emergency rollback confirmed - proceeding immediately"
}

# Stop all services immediately
emergency_stop_services() {
    log "Emergency stop of all services..."

    # Stop application service
    systemctl --user stop $APP_NAME || warning "Failed to stop $APP_NAME service"

    # Stop web server
    sudo systemctl stop nginx || warning "Failed to stop nginx"

    # Stop any running background processes
    pkill -f "node.*$APP_NAME" || true

    success "Services stopped"
}

# Find most recent backup
find_latest_backup() {
    log "Searching for latest backup..."

    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    # Find the most recent backup
    LATEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | head -n1)

    if [ -z "$LATEST_BACKUP" ]; then
        error "No backups found in $BACKUP_DIR"
        exit 1
    fi

    log "Latest backup found: $LATEST_BACKUP"
    echo "$LATEST_BACKUP"
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_path=$1

    log "Verifying backup integrity: $backup_path"

    # Check if backup directory exists and is not empty
    if [ ! -d "$backup_path" ] || [ -z "$(ls -A "$backup_path")" ]; then
        error "Backup directory is empty or doesn't exist: $backup_path"
        return 1
    fi

    # Check for essential files
    essential_files=("package.json" "game.js" "index.html")
    for file in "${essential_files[@]}"; do
        if [ ! -f "$backup_path/$file" ]; then
            error "Essential file missing from backup: $file"
            return 1
        fi
    done

    # Check backup timestamp
    backup_timestamp=$(basename "$backup_path" | sed 's/backup_//')
    backup_date=$(date -d "${backup_timestamp:0:8} ${backup_timestamp:9:2}:${backup_timestamp:11:2}:${backup_timestamp:13:2}" +%s 2>/dev/null || echo "0")
    current_date=$(date +%s)
    backup_age=$((current_date - backup_date))

    if [ $backup_age -gt 86400 ]; then  # 24 hours
        warning "Backup is older than 24 hours (age: $((backup_age / 3600)) hours)"
    fi

    success "Backup integrity verified"
    return 0
}

# Restore from backup
restore_from_backup() {
    local backup_path=$1

    log "Restoring from backup: $backup_path"

    # Create a backup of current state before rollback
    CURRENT_BACKUP="$BACKUP_DIR/pre_rollback_$(date +%Y%m%d_%H%M%S)"
    if [ -d "$DEPLOY_DIR/current" ]; then
        log "Creating backup of current state: $CURRENT_BACKUP"
        cp -r "$DEPLOY_DIR/current" "$CURRENT_BACKUP" || warning "Failed to backup current state"
    fi

    # Remove current deployment symlink
    if [ -L "$DEPLOY_DIR/current" ]; then
        rm "$DEPLOY_DIR/current"
    fi

    # Create new deployment from backup
    ROLLBACK_DEPLOY="$DEPLOY_DIR/rollback_$(date +%Y%m%d_%H%M%S)"
    cp -r "$backup_path" "$ROLLBACK_DEPLOY"

    # Create symlink to rollback deployment
    ln -sfn "$ROLLBACK_DEPLOY" "$DEPLOY_DIR/current"

    success "Application restored from backup"
}

# Restore database from backup
restore_database() {
    log "Checking for database backup..."

    # Look for database backup file
    DB_BACKUP=$(find "$BACKUP_DIR" -name "*.sql" -type f | sort -r | head -n1)

    if [ -n "$DB_BACKUP" ]; then
        warning "Database backup found: $DB_BACKUP"

        read -p "Do you want to restore the database? This will overwrite current data (y/N): " restore_db

        if [ "$restore_db" = "y" ] || [ "$restore_db" = "Y" ]; then
            log "Restoring database from: $DB_BACKUP"

            # Create current database backup before restore
            CURRENT_DB_BACKUP="$BACKUP_DIR/pre_rollback_db_$(date +%Y%m%d_%H%M%S).sql"
            pg_dump -h localhost -U gameuser idle_cultivation_db > "$CURRENT_DB_BACKUP" || warning "Failed to backup current database"

            # Restore database
            psql -h localhost -U gameuser -d idle_cultivation_db < "$DB_BACKUP"

            success "Database restored from backup"
        else
            warning "Database restore skipped - application may be inconsistent"
        fi
    else
        warning "No database backup found - database not restored"
    fi
}

# Restart services
restart_services() {
    log "Restarting services..."

    cd "$DEPLOY_DIR/current"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm ci --production
    fi

    # Start application service
    systemctl --user start $APP_NAME

    # Wait for service to start
    sleep 10

    # Check if service is running
    if systemctl --user is-active --quiet $APP_NAME; then
        success "Application service restarted"
    else
        error "Failed to restart application service"
        systemctl --user status $APP_NAME
        return 1
    fi

    # Start web server
    sudo systemctl start nginx

    if sudo systemctl is-active --quiet nginx; then
        success "Web server restarted"
    else
        error "Failed to restart web server"
        return 1
    fi

    success "All services restarted"
}

# Verify rollback success
verify_rollback_success() {
    log "Verifying rollback success..."

    local health_checks_passed=0
    local total_checks=4

    # Check if application is responding
    if curl -f -s --max-time 10 "http://localhost:3000/health" > /dev/null; then
        success "Health endpoint responding"
        ((health_checks_passed++))
    else
        error "Health endpoint not responding"
    fi

    # Check if application service is running
    if systemctl --user is-active --quiet $APP_NAME; then
        success "Application service is running"
        ((health_checks_passed++))
    else
        error "Application service is not running"
    fi

    # Check web server
    if sudo systemctl is-active --quiet nginx; then
        success "Web server is running"
        ((health_checks_passed++))
    else
        error "Web server is not running"
    fi

    # Quick systems health check
    cd "$DEPLOY_DIR/current"
    if npm run test:health &> /dev/null; then
        success "Game systems health check passed"
        ((health_checks_passed++))
    else
        warning "Game systems health check failed"
    fi

    # Calculate success rate
    success_rate=$((health_checks_passed * 100 / total_checks))

    if [ $health_checks_passed -eq $total_checks ]; then
        success "Rollback verification successful ($health_checks_passed/$total_checks checks passed)"
        return 0
    elif [ $health_checks_passed -ge $((total_checks * 3 / 4)) ]; then
        warning "Rollback partially successful ($health_checks_passed/$total_checks checks passed)"
        return 1
    else
        error "Rollback verification failed ($health_checks_passed/$total_checks checks passed)"
        return 2
    fi
}

# Generate rollback report
generate_rollback_report() {
    local status=$1
    local duration=$2

    REPORT_FILE="/tmp/emergency-rollback-report.json"

    cat << EOF > $REPORT_FILE
{
    "timestamp": "$(date -Iseconds)",
    "rollback_status": "$status",
    "duration_seconds": $duration,
    "backup_used": "$LATEST_BACKUP",
    "rollback_reason": "${ROLLBACK_REASON:-Emergency situation}",
    "verification_status": "$VERIFICATION_STATUS",
    "services_restarted": true,
    "database_restored": ${DATABASE_RESTORED:-false},
    "log_file": "$LOG_FILE"
}
EOF

    success "Rollback report generated: $REPORT_FILE"
}

# Main rollback function
main() {
    local start_time=$(date +%s)

    # Verify this is an emergency
    verify_emergency "$@"

    # Send initial notification
    send_emergency_notification "Emergency rollback initiated - system will be unavailable during recovery"

    # Stop services immediately
    emergency_stop_services

    # Find and verify backup
    LATEST_BACKUP=$(find_latest_backup)

    if ! verify_backup_integrity "$LATEST_BACKUP"; then
        error "Backup verification failed - cannot proceed with rollback"
        send_emergency_notification "Emergency rollback FAILED - backup integrity check failed"
        exit 1
    fi

    # Restore from backup
    restore_from_backup "$LATEST_BACKUP"

    # Ask about database restore
    restore_database

    # Restart services
    if ! restart_services; then
        error "Failed to restart services after rollback"
        send_emergency_notification "Emergency rollback FAILED - services could not be restarted"
        exit 1
    fi

    # Verify rollback success
    if verify_rollback_success; then
        VERIFICATION_STATUS="success"
        STATUS="success"
    else
        VERIFICATION_STATUS="partial"
        STATUS="partial"
    fi

    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Generate report
    generate_rollback_report "$STATUS" "$duration"

    # Final status
    if [ "$STATUS" = "success" ]; then
        success "========================================"
        success "EMERGENCY ROLLBACK COMPLETED SUCCESSFULLY"
        success "Duration: $duration seconds"
        success "Backup used: $LATEST_BACKUP"
        success "All systems verified and operational"
        success "========================================"

        send_emergency_notification "Emergency rollback completed successfully in $duration seconds - system is operational"
    else
        warning "========================================"
        warning "EMERGENCY ROLLBACK PARTIALLY SUCCESSFUL"
        warning "Duration: $duration seconds"
        warning "Some systems may require manual intervention"
        warning "Check logs: $LOG_FILE"
        warning "========================================"

        send_emergency_notification "Emergency rollback partially successful - manual intervention may be required"
    fi

    # Check if rollback took too long
    if [ $duration -gt $MAX_ROLLBACK_TIME ]; then
        warning "Rollback took longer than target ($duration > $MAX_ROLLBACK_TIME seconds)"
    fi
}

# Handle command line arguments
case "${1:-}" in
    "--help" | "-h")
        echo "Emergency Rollback Script for Idle Cultivation Game"
        echo ""
        echo "Usage: $0 [--force]"
        echo ""
        echo "Options:"
        echo "  --force    Skip confirmation prompt (use only in automated scenarios)"
        echo "  --help     Show this help message"
        echo ""
        echo "This script will:"
        echo "1. Stop all services immediately"
        echo "2. Restore application from latest backup"
        echo "3. Optionally restore database"
        echo "4. Restart all services"
        echo "5. Verify system functionality"
        echo ""
        echo "WARNING: This will cause service interruption and potential data loss"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac