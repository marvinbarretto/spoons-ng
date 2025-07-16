#!/usr/bin/env bash

# Simplified GitHub Issue Upload Script
# Usage: ./upload-tasks.sh [markdown_file] [milestone]

set -e

# Configuration
TASKS_FILE="${1:-TASKS.md}"
REPO_OWNER="marvinbarretto"
REPO_NAME="spoons-ng"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

log_task() {
    echo -e "${CYAN}[TASK]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Install with: brew install gh"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI not authenticated. Run: gh auth login"
        exit 1
    fi
    
    if [ ! -f "$TASKS_FILE" ]; then
        log_error "Tasks file not found: $TASKS_FILE"
        exit 1
    fi
    
    log_success "Prerequisites checked"
}

# Extract story points from task line
extract_story_points() {
    local task_line="$1"
    echo "$task_line" | grep -o '\[sp[0-9]\+\]' | grep -o '[0-9]\+' || echo ""
}

# Extract labels from section header
extract_section_labels() {
    local section_line="$1"
    echo "$section_line" | grep -o '\[[^]]*\]' | sed 's/\[//g' | sed 's/\]//g' || echo ""
}

# Clean task text (remove story points)
clean_task_text() {
    local task_line="$1"
    echo "$task_line" | sed 's/^[[:space:]]*-[[:space:]]*//' | sed 's/[[:space:]]*\[sp[0-9]\+\][[:space:]]*$//'
}

# Generate issue body
generate_issue_body() {
    local task_title="$1"
    local section_name="$2"
    local story_points="$3"
    local section_labels="$4"
    
    cat << EOF
## 🎯 Task Overview
**Section**: $section_name
$([ -n "$story_points" ] && echo "**Story Points**: $story_points")
**Labels**: $section_labels

## 📋 Acceptance Criteria
- [ ] Task completed as described
- [ ] Code follows Spoons architecture patterns
- [ ] Tests added/updated as needed
- [ ] Documentation updated if required

## 🔗 Context
This task is part of the $section_name feature group.

*Auto-generated from: $TASKS_FILE*
EOF
}

# Create GitHub issue
create_task_issue() {
    local task_title="$1"
    local section_name="$2"
    local story_points="$3"
    local section_labels="$4"
    
    # Build labels string
    local labels="$section_labels"
    if [ -n "$story_points" ]; then
        labels="$labels,sp$story_points"
    fi
    
    # Remove leading/trailing commas
    labels=$(echo "$labels" | sed 's/^,//' | sed 's/,$//')
    
    # Generate issue body
    local body=$(generate_issue_body "$task_title" "$section_name" "$story_points" "$section_labels")
    
    # Create the issue
    local issue_url=""
    if issue_url=$(echo "$body" | gh issue create \
        --repo "$REPO_OWNER/$REPO_NAME" \
        --title "$task_title" \
        --body-file - \
        --label "$labels" 2>&1); then
        
        log_success "Created: $task_title"
        echo -e "    ${CYAN}URL:${NC} $issue_url"
        echo -e "    ${PURPLE}Labels:${NC} $labels"
        [ -n "$story_points" ] && echo -e "    ${YELLOW}Story Points:${NC} $story_points"
        return 0
    else
        log_error "Failed: $task_title"
        echo -e "    ${RED}Error:${NC} $issue_url"
        return 1
    fi
}

# Parse markdown and create issues
parse_and_create_issues() {
    local current_section=""
    local current_labels=""
    local success_count=0
    local error_count=0
    
    while IFS= read -r line; do
        # Remove carriage returns
        line=$(echo "$line" | tr -d '\r')
        
        # Debug output
        [[ "${DEBUG:-}" == "1" ]] && echo "DEBUG: Processing line: '$line'"
        
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*#[[:space:]]+ ]]; then
            [[ "${DEBUG:-}" == "1" ]] && echo "DEBUG: Skipping empty/comment line"
            continue
        fi
        
        # Check for section header (### ...)
        if [[ "$line" =~ ^###[[:space:]] ]]; then
            current_section=$(echo "$line" | sed 's/^###[[:space:]]*//' | sed 's/[[:space:]]*\[.*\]$//')
            current_labels=$(extract_section_labels "$line")
            
            echo ""
            log_section "Processing: $current_section"
            [ -n "$current_labels" ] && echo -e "  ${PURPLE}Labels:${NC} $current_labels"
            
        # Check for task line (- ...)
        elif [[ "$line" =~ ^[[:space:]]*-[[:space:]] ]]; then
            if [ -z "$current_section" ]; then
                log_error "Found task before section header, skipping: $line"
                continue
            fi
            
            # Extract task details
            local task_title=$(clean_task_text "$line")
            local story_points=$(extract_story_points "$line")
            
            if [ -n "$task_title" ]; then
                local display_sp=""
                [ -n "$story_points" ] && display_sp=" ${YELLOW}[sp$story_points]${NC}"
                log_task "Creating: $task_title$display_sp"
                
                if create_task_issue "$task_title" "$current_section" "$story_points" "$current_labels"; then
                    ((success_count++))
                else
                    ((error_count++))
                fi
                
                # Small delay to avoid rate limiting
                sleep 1
            fi
        fi
        
    done < "$TASKS_FILE"
    
    [[ "${DEBUG:-}" == "1" ]] && echo "DEBUG: Finished processing file"
    
    # Summary
    echo ""
    echo -e "${PURPLE}========================================${NC}"
    log_info "Upload Summary:"
    echo -e "  ${GREEN}✓ Successfully created:${NC} $success_count issues"
    [ $error_count -gt 0 ] && echo -e "  ${RED}✗ Failed to create:${NC} $error_count issues"
    
    if [ $success_count -gt 0 ]; then
        echo ""
        echo -e "  ${CYAN}🔗 View all issues:${NC} https://github.com/$REPO_OWNER/$REPO_NAME/issues"
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🚀 Starting task upload${NC}"
    echo -e "   ${CYAN}Tasks file:${NC} $TASKS_FILE"
    echo -e "   ${BLUE}Repository:${NC} $REPO_OWNER/$REPO_NAME"
    echo ""
    
    check_prerequisites
    parse_and_create_issues
}

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    cat << EOF
Simplified GitHub Issue Upload Script

USAGE:
    $0 [markdown_file]

ARGUMENTS:
    markdown_file     Markdown file with tasks (default: TASKS.md)

TASK FORMAT:
    ### Section Name [label1,label2,priority]
    - Task description [sp3]
    - Another task [sp2]

EXAMPLES:
    $0                           # Use TASKS.md
    $0 TASKS.md                  # Explicit file
EOF
    exit 0
fi

main "$@"