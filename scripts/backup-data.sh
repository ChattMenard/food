#!/bin/bash

# Data Backup and Recovery Script
# Creates automated backups and provides recovery procedures

set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="pantry_ai_backup_${TIMESTAMP}"
MAX_BACKUPS=10
DATA_SOURCES=("www/data" "package.json" "eslint.config.js" "tsconfig.json")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log_step "Creating backup directory..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
    
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
    log_info "Created backup: ${BACKUP_NAME}"
}

# Backup data sources
backup_data_sources() {
    log_step "Backing up data sources..."
    
    for source in "${DATA_SOURCES[@]}"; do
        if [ -e "$source" ]; then
            cp -r "$source" "${BACKUP_DIR}/${BACKUP_NAME}/"
            log_info "Backed up: $source"
        else
            log_warn "Source not found: $source"
        fi
    done
}

# Backup database (IndexedDB data)
backup_database() {
    log_step "Backing up IndexedDB data..."
    
    # Create database backup script
    cat > "${BACKUP_DIR}/${BACKUP_NAME}/backup_db.js" << 'EOF'
// Database backup script
// Run this in the browser console to export IndexedDB data

async function backupDatabase() {
    const databases = await indexedDB.databases();
    const backup = {
        timestamp: new Date().toISOString(),
        databases: {}
    };
    
    for (const dbInfo of databases) {
        try {
            const db = await indexedDB.open(dbInfo.name);
            const backupData = {
                name: dbInfo.name,
                version: dbInfo.version,
                stores: {}
            };
            
            db.onupgradeneeded = () => {};
            
            await new Promise((resolve, reject) => {
                db.onsuccess = () => {
                    const transaction = db.result.transaction([dbInfo.name], 'readonly');
                    const store = transaction.objectStore(dbInfo.name);
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        backupData.stores[dbInfo.name] = request.result;
                        resolve();
                    };
                    
                    request.onerror = reject;
                };
                
                db.onerror = reject;
            });
            
            backup.databases[dbInfo.name] = backupData;
            db.close();
        } catch (error) {
            console.error(`Failed to backup ${dbInfo.name}:`, error);
        }
    }
    
    // Download backup
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Database backup completed!');
    return backup;
}

// Run backup
backupDatabase();
EOF
    
    log_info "Created database backup script"
}

# Backup configuration files
backup_config() {
    log_step "Backing up configuration files..."
    
    # Environment files
    for env_file in .env*; do
        if [ -f "$env_file" ]; then
            cp "$env_file" "${BACKUP_DIR}/${BACKUP_NAME}/"
            log_info "Backed up: $env_file"
        fi
    done
    
    # Build scripts
    if [ -d "scripts" ]; then
        cp -r "scripts" "${BACKUP_DIR}/${BACKUP_NAME}/"
        log_info "Backed up: scripts/"
    fi
}

# Create backup metadata
create_metadata() {
    log_step "Creating backup metadata..."
    
    cat > "${BACKUP_DIR}/${BACKUP_NAME}/metadata.json" << EOF
{
    "backup_name": "$BACKUP_NAME",
    "timestamp": "$(date -Iseconds)",
    "created_by": "$(whoami)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
    "sources": [$(printf '"%s",' "${DATA_SOURCES[@]}" | sed 's/,$//')],
    "backup_type": "full",
    "version": "1.0"
}
EOF
    
    log_info "Created backup metadata"
}

# Compress backup
compress_backup() {
    log_step "Compressing backup..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    log_info "Compressed backup: ${BACKUP_NAME}.tar.gz"
}

# Clean old backups
clean_old_backups() {
    log_step "Cleaning old backups..."
    
    cd "$BACKUP_DIR"
    
    # Count backups
    backup_count=$(ls *.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        log_info "Removing $((backup_count - MAX_BACKUPS)) old backups..."
        
        # Remove oldest backups
        ls -t *.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        
        log_info "Cleanup completed. Kept $MAX_BACKUPS most recent backups."
    else
        log_info "No cleanup needed. Current backups: $backup_count/$MAX_BACKUPS"
    fi
}

# Verify backup
verify_backup() {
    log_step "Verifying backup..."
    
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    if [ -f "$backup_file" ]; then
        local file_size=$(stat -c%s "$backup_file")
        log_info "Backup verified: $backup_file (${file_size} bytes)"
        
        # Test extraction
        if tar -tzf "$backup_file" > /dev/null 2>&1; then
            log_info "Backup integrity check passed"
        else
            log_error "Backup integrity check failed"
            exit 1
        fi
    else
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
}

# List available backups
list_backups() {
    log_info "Available backups:"
    
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -lh *.tar.gz 2>/dev/null || log_warn "No backups found"
    else
        log_warn "Backup directory not found"
    fi
}

# Restore from backup
restore_backup() {
    local backup_name="$1"
    
    if [ -z "$backup_name" ]; then
        log_error "Please specify a backup name"
        echo "Usage: $0 restore <backup_name>"
        echo "Available backups:"
        list_backups
        exit 1
    fi
    
    log_step "Restoring from backup: $backup_name"
    
    local backup_file="${BACKUP_DIR}/${backup_name}.tar.gz"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Create restore directory
    local restore_dir="restore_$(date +%s)"
    mkdir -p "$restore_dir"
    
    # Extract backup
    cd "$restore_dir"
    tar -xzf "../$backup_file"
    
    local extracted_dir=$(ls -d */)
    cd "$extracted_dir"
    
    # Confirm restore
    echo "This will restore the following files:"
    find . -type f | sed 's|^\./|  |'
    echo ""
    read -p "Continue with restore? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Restore files
        cp -r * "../"
        log_info "Restore completed"
        
        # Clean up
        cd ..
        rm -rf "$restore_dir"
        
        log_info "Backup restored successfully!"
        log_warn "Please restart any running services"
    else
        log_warn "Restore cancelled"
        cd ../..
        rm -rf "$restore_dir"
    fi
}

# Main backup function
create_backup() {
    log_info "Starting backup process..."
    
    create_backup_dir
    backup_data_sources
    backup_database
    backup_config
    create_metadata
    compress_backup
    clean_old_backups
    verify_backup
    
    log_info "Backup completed successfully!"
    log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create              Create a new backup (default)"
    echo "  restore <name>      Restore from backup"
    echo "  list                List available backups"
    echo "  clean               Clean old backups"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  Create backup"
    echo "  $0 create           Create backup"
    echo "  $0 list             List backups"
    echo "  $0 restore backup_20240428_120000  Restore specific backup"
}

# Main execution
main() {
    case "${1:-create}" in
        "create")
            create_backup
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "clean")
            clean_old_backups
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
