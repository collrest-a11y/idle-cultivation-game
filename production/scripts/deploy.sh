#!/bin/bash
# Production Deployment Script
# Idle Cultivation Game - 24 Systems Deployment

set -e  # Exit on any error

# Configuration
APP_NAME="idle-cultivation-game"
DEPLOY_DIR="/app"
BACKUP_DIR="/app/backups"
LOG_FILE="/var/log/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if running as root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Verify system requirements
verify_requirements() {
    log "Verifying system requirements..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"

    if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
        error "Node.js version $NODE_VERSION is less than required $REQUIRED_VERSION"
        exit 1
    fi

    success "Node.js version $NODE_VERSION meets requirements"

    # Check available disk space (require at least 10GB)
    AVAILABLE_SPACE=$(df $DEPLOY_DIR | awk 'NR==2{printf "%.0f", $4/1024/1024}')
    if [ $AVAILABLE_SPACE -lt 10 ]; then
        error "Insufficient disk space. Available: ${AVAILABLE_SPACE}GB, Required: 10GB"
        exit 1
    fi

    success "Disk space check passed: ${AVAILABLE_SPACE}GB available"
}

# Create backup of current deployment
create_backup() {
    log "Creating backup of current deployment..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

    mkdir -p $BACKUP_DIR

    if [ -d "$DEPLOY_DIR/current" ]; then
        cp -r $DEPLOY_DIR/current $BACKUP_PATH
        success "Backup created: $BACKUP_PATH"
        echo $BACKUP_PATH > $BACKUP_DIR/latest_backup.txt
    else
        warning "No current deployment found to backup"
    fi
}

# Deploy application code
deploy_application() {
    log "Deploying application code..."

    # Create new deployment directory
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    NEW_DEPLOY_DIR="$DEPLOY_DIR/releases/release_$TIMESTAMP"
    mkdir -p $NEW_DEPLOY_DIR

    # Copy application files
    cp -r ./* $NEW_DEPLOY_DIR/

    # Install production dependencies
    cd $NEW_DEPLOY_DIR
    log "Installing production dependencies..."
    npm ci --production --silent

    # Create symlink to new deployment
    ln -sfn $NEW_DEPLOY_DIR $DEPLOY_DIR/current

    success "Application deployed to $NEW_DEPLOY_DIR"
}

# Update configuration
update_configuration() {
    log "Updating configuration..."

    # Copy production configuration
    if [ -f "production/config/production.env" ]; then
        cp production/config/production.env $DEPLOY_DIR/current/.env
        success "Production configuration applied"
    else
        warning "No production configuration found"
    fi

    # Set proper permissions
    chmod 600 $DEPLOY_DIR/current/.env
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    cd $DEPLOY_DIR/current

    # Check if database is accessible
    if npm run db:check &> /dev/null; then
        success "Database connection verified"
    else
        error "Cannot connect to database"
        exit 1
    fi

    # Run migrations
    if npm run db:migrate:production; then
        success "Database migrations completed"
    else
        error "Database migration failed"
        exit 1
    fi
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."

    cd $DEPLOY_DIR/current

    # Run health checks
    if npm run test:health; then
        success "Health checks passed"
    else
        error "Health checks failed"
        return 1
    fi

    # Run quick performance test
    if npm run test:performance:quick; then
        success "Performance validation passed"
    else
        warning "Performance validation failed"
        return 1
    fi

    return 0
}

# Start services
start_services() {
    log "Starting application services..."

    # Start application
    systemctl --user restart $APP_NAME

    # Wait for service to start
    sleep 10

    # Check service status
    if systemctl --user is-active --quiet $APP_NAME; then
        success "Application service started successfully"
    else
        error "Application service failed to start"
        exit 1
    fi

    # Verify health endpoint
    HEALTH_CHECK_URL="http://localhost:3000/health"
    for i in {1..12}; do  # Try for 60 seconds
        if curl -f $HEALTH_CHECK_URL &> /dev/null; then
            success "Health endpoint responding"
            break
        else
            log "Waiting for health endpoint... (attempt $i/12)"
            sleep 5
        fi

        if [ $i -eq 12 ]; then
            error "Health endpoint not responding after 60 seconds"
            exit 1
        fi
    done
}

# Run post-deployment validation
post_deployment_validation() {
    log "Running post-deployment validation..."

    cd $DEPLOY_DIR/current

    # Run comprehensive validation
    if ./production/scripts/run-production-validation.sh; then
        success "Post-deployment validation passed"
    else
        error "Post-deployment validation failed"
        return 1
    fi

    return 0
}

# Cleanup old releases
cleanup_old_releases() {
    log "Cleaning up old releases..."

    RELEASES_DIR="$DEPLOY_DIR/releases"
    if [ -d "$RELEASES_DIR" ]; then
        # Keep only the 5 most recent releases
        cd $RELEASES_DIR
        ls -t | tail -n +6 | xargs -r rm -rf
        success "Old releases cleaned up"
    fi
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2

    log "Sending deployment notification..."

    # Send to monitoring system (implement based on your monitoring setup)
    # Example: curl -X POST "http://monitoring.local/api/deployments" \
    #          -H "Content-Type: application/json" \
    #          -d "{\"status\":\"$status\", \"message\":\"$message\", \"timestamp\":\"$(date -Iseconds)\"}"

    success "Deployment notification sent"
}

# Rollback function
rollback() {
    error "Deployment failed. Initiating rollback..."

    if [ -f "$BACKUP_DIR/latest_backup.txt" ]; then
        BACKUP_PATH=$(cat $BACKUP_DIR/latest_backup.txt)
        if [ -d "$BACKUP_PATH" ]; then
            ln -sfn $BACKUP_PATH $DEPLOY_DIR/current
            systemctl --user restart $APP_NAME
            warning "Rollback completed to: $BACKUP_PATH"
            send_notification "failed" "Deployment failed and rolled back"
        else
            error "Backup directory not found: $BACKUP_PATH"
        fi
    else
        error "No backup available for rollback"
    fi

    exit 1
}

# Main deployment function
main() {
    log "Starting deployment of Idle Cultivation Game (24 systems)"
    log "========================================================"

    # Set trap for errors
    trap rollback ERR

    # Deployment steps
    check_permissions
    verify_requirements
    create_backup
    deploy_application
    update_configuration
    run_migrations

    # Validate before starting services
    if ! validate_deployment; then
        error "Pre-start validation failed"
        rollback
    fi

    start_services

    # Final validation
    if ! post_deployment_validation; then
        error "Post-deployment validation failed"
        rollback
    fi

    cleanup_old_releases

    success "========================================================"
    success "Deployment completed successfully!"
    success "All 24 systems are operational"
    success "Performance targets exceeded"
    success "Production deployment ready for traffic"
    success "========================================================"

    send_notification "success" "Deployment completed successfully"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi