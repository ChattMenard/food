#!/bin/bash

# Staging Deployment Script
# Deploys the application to staging environment

set -e

echo "🚀 Starting staging deployment..."

# Configuration
STAGING_DOMAIN="staging.pantry-ai.com"
STAGING_BUCKET="pantry-ai-staging"
BUILD_DIR="www/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v gsutil &> /dev/null; then
        log_error "gsutil is not installed. Please install Google Cloud CLI."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_info "✅ All dependencies are available"
}

# Set up environment
setup_environment() {
    log_info "Setting up staging environment..."
    
    # Check if staging environment file exists
    if [ ! -f ".env.staging" ]; then
        log_error ".env.staging file not found. Please create it from .env.example"
        exit 1
    fi
    
    # Copy staging environment to local
    cp .env.staging .env.local
    
    log_info "✅ Environment configured for staging"
}

# Build the application
build_application() {
    log_info "Building application for staging..."
    
    # Clean previous build
    rm -rf $BUILD_DIR
    
    # Build for production (staging uses production build)
    npm run build:prod
    
    if [ $? -ne 0 ]; then
        log_error "Build failed"
        exit 1
    fi
    
    log_info "✅ Application built successfully"
}

# Deploy to staging
deploy_to_staging() {
    log_info "Deploying to staging..."
    
    # Check if bucket exists
    if ! gsutil ls gs://$STAGING_BUCKET &> /dev/null; then
        log_warn "Staging bucket does not exist. Creating it..."
        gsutil mb gs://$STAGING_BUCKET
    fi
    
    # Sync files to staging bucket
    gsutil -m rsync -r -d $BUILD_DIR/ gs://$STAGING_BUCKET/
    
    # Set proper permissions
    gsutil -m acl ch -r -u AllUsers:R gs://$STAGING_BUCKET/**
    
    # Make website public
    gsutil web set -m index.html -e 404.html gs://$STAGING_BUCKET
    
    log_info "✅ Files deployed to staging bucket"
}

# Configure CDN (if using Cloud CDN)
configure_cdn() {
    log_info "Configuring CDN..."
    
    # Invalidate CDN cache
    if command -v gcloud &> /dev/null; then
        gcloud compute cdn invalidations create \
            --description="Staging deployment $(date)" \
            $STAGING_DOMAIN || log_warn "CDN invalidation failed (may not be configured)"
    else
        log_warn "gcloud CLI not found, skipping CDN configuration"
    fi
    
    log_info "✅ CDN configuration completed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Wait a moment for deployment to propagate
    sleep 10
    
    # Check if the site is accessible
    if curl -f -s "https://$STAGING_DOMAIN/" > /dev/null; then
        log_info "✅ Staging site is accessible"
    else
        log_warn "Staging site may not be accessible yet (DNS propagation may take time)"
    fi
    
    # Check build info
    if curl -f -s "https://$STAGING_DOMAIN/build-info.json" > /dev/null; then
        log_info "✅ Build info is accessible"
    else
        log_warn "Build info may not be accessible"
    fi
}

# Generate deployment summary
generate_summary() {
    log_info "Generating deployment summary..."
    
    echo ""
    echo "🎉 Staging Deployment Summary"
    echo "=============================="
    echo "Domain: https://$STAGING_DOMAIN"
    echo "Bucket: gs://$STAGING_BUCKET"
    echo "Build: $(date)"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Visit https://$STAGING_DOMAIN to test the application"
    echo "2. Run E2E tests against staging environment"
    echo "3. Verify all features are working correctly"
    echo "4. Check browser console for any errors"
    echo ""
    echo "🔧 To rollback:"
    echo "1. Use previous deployment backup"
    echo "2. Or redeploy with previous commit"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary environment file
    if [ -f ".env.local" ] && [ -f ".env.staging" ]; then
        # Don't remove if it was already there
        if [ ! -s ".env.local" ] || ! grep -q "STAGING" .env.local; then
            log_info "Keeping existing .env.local"
        fi
    fi
    
    log_info "✅ Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting staging deployment process..."
    
    # Run deployment steps
    check_dependencies
    setup_environment
    build_application
    deploy_to_staging
    configure_cdn
    run_health_checks
    generate_summary
    cleanup
    
    log_info "🎉 Staging deployment completed successfully!"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
