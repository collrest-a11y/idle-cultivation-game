#!/bin/bash
# Production Health Check Script
# Idle Cultivation Game - 24 Systems Health Monitoring

set -e

# Configuration
HEALTH_URL="http://localhost:3000/health"
API_URL="http://localhost:3000/api"
TIMEOUT=10
LOG_FILE="/var/log/health-check.log"
ALERT_THRESHOLD=3  # Number of failed checks before alerting

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

# Check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}

    log "Checking $description: $url"

    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url"); then
        if [ "$response" = "$expected_status" ]; then
            success "$description is healthy (HTTP $response)"
            return 0
        else
            error "$description returned HTTP $response (expected $expected_status)"
            return 1
        fi
    else
        error "$description is unreachable"
        return 1
    fi
}

# Check service status
check_service_status() {
    local service_name=$1

    log "Checking service status: $service_name"

    if systemctl --user is-active --quiet "$service_name"; then
        success "Service $service_name is running"
        return 0
    else
        error "Service $service_name is not running"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local path=${1:-/}
    local threshold=${2:-90}

    log "Checking disk space for $path"

    usage=$(df "$path" | awk 'NR==2{printf "%.0f", $5}' | sed 's/%//')

    if [ "$usage" -lt "$threshold" ]; then
        success "Disk usage is healthy: ${usage}% (threshold: ${threshold}%)"
        return 0
    else
        error "Disk usage is high: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Check memory usage
check_memory_usage() {
    local threshold=${1:-90}

    log "Checking memory usage"

    # Get memory usage percentage
    usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')

    if [ "$usage" -lt "$threshold" ]; then
        success "Memory usage is healthy: ${usage}% (threshold: ${threshold}%)"
        return 0
    else
        error "Memory usage is high: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity"

    cd /app/current

    if npm run db:check &> /dev/null; then
        success "Database connection is healthy"
        return 0
    else
        error "Database connection failed"
        return 1
    fi
}

# Check application-specific health
check_application_health() {
    log "Checking application-specific health endpoints"

    local failed_checks=0

    # Check main health endpoint
    if ! check_http_endpoint "$HEALTH_URL" "Main health endpoint"; then
        ((failed_checks++))
    fi

    # Check API health
    if ! check_http_endpoint "$API_URL/health" "API health endpoint"; then
        ((failed_checks++))
    fi

    # Check systems health endpoint
    if ! check_http_endpoint "$API_URL/systems/health" "Systems health endpoint"; then
        ((failed_checks++))
    fi

    return $failed_checks
}

# Check 24 integrated systems
check_game_systems() {
    log "Checking 24 integrated game systems health"

    cd /app/current

    if npm run test:health &> /dev/null; then
        success "All 24 game systems are healthy"
        return 0
    else
        error "Some game systems are unhealthy"
        return 1
    fi
}

# Check performance metrics
check_performance_metrics() {
    log "Checking performance metrics"

    cd /app/current

    # Run quick performance check
    if npm run test:performance:quick &> /dev/null; then
        success "Performance metrics are within acceptable ranges"
        return 0
    else
        warning "Performance metrics are outside optimal ranges"
        return 1
    fi
}

# Send alert
send_alert() {
    local message=$1
    local severity=${2:-warning}

    log "Sending alert: $message"

    # Send to monitoring system (implement based on your setup)
    # Example implementations:

    # Slack webhook
    # curl -X POST -H 'Content-type: application/json' \
    #      --data "{\"text\":\"$message\"}" \
    #      "$SLACK_WEBHOOK_URL"

    # Email notification
    # echo "$message" | mail -s "Health Check Alert" admin@example.com

    # Log to system log
    logger -t "health-check" "$severity: $message"
}

# Generate health report
generate_health_report() {
    local overall_status=$1
    local failed_checks=$2
    local total_checks=$3

    cat << EOF > /tmp/health-report.json
{
    "timestamp": "$(date -Iseconds)",
    "overall_status": "$overall_status",
    "failed_checks": $failed_checks,
    "total_checks": $total_checks,
    "success_rate": $(echo "scale=2; ($total_checks - $failed_checks) * 100 / $total_checks" | bc),
    "details": {
        "system_checks": "See $LOG_FILE for details"
    }
}
EOF

    log "Health report generated: /tmp/health-report.json"
}

# Main health check function
main() {
    log "Starting comprehensive health check"
    log "==================================="

    local failed_checks=0
    local total_checks=0

    # Infrastructure checks
    ((total_checks++))
    if ! check_service_status "idle-cultivation-game"; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! check_disk_space "/" 90; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! check_memory_usage 90; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! check_database; then
        ((failed_checks++))
    fi

    # Application checks
    ((total_checks++))
    app_health_failed=$(check_application_health)
    failed_checks=$((failed_checks + app_health_failed))

    ((total_checks++))
    if ! check_game_systems; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! check_performance_metrics; then
        ((failed_checks++))
    fi

    # Determine overall status
    if [ $failed_checks -eq 0 ]; then
        overall_status="healthy"
        success "==================================="
        success "All health checks passed ($total_checks/$total_checks)"
        success "System is fully operational"
        success "==================================="
    elif [ $failed_checks -le 2 ]; then
        overall_status="degraded"
        warning "==================================="
        warning "Some health checks failed ($failed_checks/$total_checks)"
        warning "System is operational but degraded"
        warning "==================================="
    else
        overall_status="unhealthy"
        error "==================================="
        error "Multiple health checks failed ($failed_checks/$total_checks)"
        error "System requires immediate attention"
        error "==================================="
    fi

    # Generate report
    generate_health_report "$overall_status" "$failed_checks" "$total_checks"

    # Send alerts if necessary
    if [ $failed_checks -ge $ALERT_THRESHOLD ]; then
        send_alert "Health check failed: $failed_checks/$total_checks checks failed" "critical"
    elif [ $failed_checks -gt 0 ]; then
        send_alert "Health check warning: $failed_checks/$total_checks checks failed" "warning"
    fi

    # Return appropriate exit code
    if [ "$overall_status" = "healthy" ]; then
        exit 0
    elif [ "$overall_status" = "degraded" ]; then
        exit 1
    else
        exit 2
    fi
}

# Handle command line arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "status")
        if [ -f "/tmp/health-report.json" ]; then
            cat /tmp/health-report.json | jq .
        else
            error "No recent health report found. Run health check first."
            exit 1
        fi
        ;;
    "continuous")
        log "Starting continuous health monitoring..."
        while true; do
            main
            sleep 300  # Check every 5 minutes
        done
        ;;
    *)
        echo "Usage: $0 {check|status|continuous}"
        echo "  check      - Run one-time health check"
        echo "  status     - Show last health check status"
        echo "  continuous - Run continuous health monitoring"
        exit 1
        ;;
esac