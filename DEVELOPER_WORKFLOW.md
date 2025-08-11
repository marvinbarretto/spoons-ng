# 👨‍💻 Developer Testing Workflow Guide

> **Workflow Version**: v2.0  
> **Last Updated**: 2025-08-07  
> **Target Audience**: All developers contributing to testing framework  
> **Prerequisites**: Node.js 20+, Angular 20, Vitest knowledge

---

## 🚀 Quick Start (5 Minutes)

### **1. Environment Setup**
```bash
# Clone and setup project
git clone <repo-url>
cd spoons
npm install

# Initialize testing environment
npm run test:setup

# Verify everything works
npm run test
```

### **2. Pick Your First Testing Task**
1. Visit [GitHub Issues](https://github.com/your-org/spoons/issues?q=is%3Aissue+is%3Aopen+label%3Atest%3Aunit+label%3Apriority%3Acritical)
2. Look for `P0 (Critical)` + `XS` or `S` complexity
3. Comment "I'll take this" to claim the issue
4. Follow the workflow below

### **3. Create Your First Test (10 Minutes)**
```bash
# Generate test scaffolding for your issue
npm run test:story:scaffold TEST-042

# Start development with watch mode  
npm run test:watch

# Edit the generated test file and implement
# Run tests to verify your work
```

---

## 📋 Detailed Developer Workflow

### **Step 1: Task Discovery & Selection**

#### **Finding Available Tasks**
```bash
# View available testing tasks by priority
npm run test:story:list --priority=P0    # Critical tasks first
npm run test:story:list --complexity=XS  # Quick wins
npm run test:story:list --type=unit      # Unit tests only
```

#### **GitHub Integration**
- **Project Board**: [Testing Framework Kanban](https://github.com/your-org/spoons/projects/testing)
- **Issue Filters**: Use labels like `test:unit`, `priority:critical`, `complexity:small`
- **Assignment**: Comment on issue to self-assign, or use GitHub's assign feature

#### **Task Selection Criteria**
```typescript
// Recommended progression for new contributors
const learningPath = {
  beginner: ['test:unit', 'complexity:XS', 'priority:P1'],
  intermediate: ['test:integration', 'complexity:S', 'priority:P0'], 
  advanced: ['test:e2e', 'complexity:M', 'priority:P0'],
  expert: ['test:performance', 'complexity:L', 'priority:P0']
};
```

### **Step 2: Local Development Setup**

#### **Initialize Testing Environment**
```bash
# Set up local testing environment
npm run test:setup

# Verify all dependencies are working
npm run test:doctor

# Start development mode with hot reload
npm run test:dev
```

#### **IDE Configuration (VSCode Recommended)**
```json
// .vscode/settings.json (automatically configured)
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test:dev",
  "testing.autoRun": "rerunOnChange",
  "editor.codeActionsOnSave": {
    "source.addMissingImports": true
  }
}
```

### **Step 3: Test Development Process**

#### **3A: Scaffold Test Structure**
```bash
# Generate test scaffolding from user story
npm run test:story:scaffold TEST-042

# This creates:
# - src/app/{domain}/data-access/{service}.spec.ts
# - Pre-configured describe blocks
# - Import statements for mocks
# - Basic test structure following patterns
```

#### **3B: Implement Tests Using BDD Pattern**
```typescript
// Example: Generated scaffolding for CheckinOrchestrator
describe('CheckinOrchestrator', () => {
  const { mocks, when, verify } = useTestSuite('checkin-orchestrator');

  describe('when processing new check-in', () => {
    it('should award discovery bonus for first pub visit', async () => {
      // Given - Use scenario builder
      when.user('new-user').hasNoCheckIns();
      when.pub('new-pub').isVerified().hasNoRecentCheckIns();
      
      // When - Execute the business logic
      const result = await mocks.checkinOrchestrator.processCheckIn({
        userId: 'new-user',
        pubId: 'new-pub',
        location: { lat: 0, lng: 0 }
      });
      
      // Then - Verify expected behavior
      verify.result(result).includesDiscoveryBonus();
      verify.user('new-user').totalPointsIncreased();
      verify.pub('new-pub').hasRecentCheckIn();
    });
  });
});
```

#### **3C: Run Tests in Development Mode**
```bash
# Watch mode for active development
npm run test:watch

# Focus mode for specific test file
npm run test:focus src/app/checkin/data-access/checkin-orchestrator.spec.ts

# Debug mode with breakpoints
npm run test:debug
```

### **Step 4: Quality Assurance**

#### **4A: Local Testing Checklist**
```bash
# Run full test suite to check for side effects
npm run test

# Check test coverage for your changes
npm run test:coverage

# Lint your test code
npm run test:lint

# Validate test patterns and conventions
npm run test:story:validate TEST-042
```

#### **4B: Performance Verification**
```bash
# Ensure tests execute efficiently
npm run test:performance

# Individual test should complete in <100ms
# Full suite should complete in <5min
```

#### **4C: Integration Testing**
```bash
# Run integration tests if your changes affect multiple services
npm run test:integration

# Run specific integration scenarios
npm run test:integration --pattern="*checkin*"
```

### **Step 5: Code Review Preparation**

#### **5A: Commit Standards**
```bash
# Use conventional commit format
git add .
git commit -m "test(checkin): add CheckinOrchestrator discovery bonus tests

- Implements comprehensive unit tests for discovery bonus logic
- Covers edge cases for pub verification and user history
- Uses new BDD patterns and scenario builders
- Resolves TEST-042

Closes #42"
```

#### **5B: Create Pull Request**
```bash
# Push feature branch
git push origin feature/test-checkin-orchestrator-TEST-042

# Create PR with testing template
gh pr create --template testing-pr-template.md \
  --title "test(checkin): CheckinOrchestrator discovery bonus tests [TEST-042]" \
  --body "Comprehensive unit tests for CheckinOrchestrator service..."
```

#### **5C: PR Template (Auto-Generated)**
```markdown
## 🧪 Testing Pull Request

**User Story**: TEST-042  
**Type**: Unit Testing  
**Priority**: P0 (Critical)  
**Complexity**: S (2-4 hours)

### ✅ Implementation Summary
- [ ] All acceptance criteria met
- [ ] Tests follow established patterns
- [ ] Performance requirements satisfied
- [ ] Code coverage thresholds met

### 🧪 Test Coverage
- **New Tests**: 15 test cases
- **Coverage**: 95% line coverage for CheckinOrchestrator
- **Performance**: Average execution time 45ms per test

### 📋 Quality Checklist
- [ ] All tests pass locally and in CI
- [ ] No linting or formatting errors  
- [ ] Mock patterns follow established conventions
- [ ] Test names are descriptive and BDD-style
- [ ] Edge cases and error scenarios covered
```

### **Step 6: Review & Merge Process**

#### **6A: Automated Quality Gates**
```yaml
# Automatic checks run on PR
- Unit test execution (must pass 100%)
- Code coverage verification (>80% for new code)
- Linting and formatting checks
- Performance regression testing
- Integration test execution
```

#### **6B: Peer Review Process**
1. **Technical Review**: Code quality, test patterns, mock usage
2. **Business Logic Review**: Test coverage of requirements
3. **Performance Review**: Test execution efficiency
4. **Documentation Review**: Test readability and maintainability

#### **6C: Merge Criteria**
- [ ] All automated checks passing
- [ ] At least 1 approval from core team member
- [ ] All review feedback addressed
- [ ] Squash merge with conventional commit message

---

## 🛠️ Development Tools & Commands

### **Primary Development Commands**
```bash
# Development workflow
npm run test:dev            # Watch mode with UI
npm run test:focus          # Focus on specific tests  
npm run test:debug          # Debug with breakpoints
npm run test:coverage       # Coverage reporting

# Quality assurance
npm run test:ci             # Full CI simulation
npm run test:lint           # Code quality checks
npm run test:performance    # Performance testing
npm run test:integration    # Cross-service testing

# Story management
npm run test:story:list     # View available stories
npm run test:story:scaffold # Generate test scaffolding  
npm run test:story:validate # Validate story completion
```

### **Advanced Development Commands**
```bash
# Scenario testing
npm run test:scenario:user-journey    # End-to-end user flows
npm run test:scenario:power-user      # High-volume testing
npm run test:scenario:edge-cases      # Boundary testing

# Mock management
npm run test:mock:validate     # Verify mock consistency
npm run test:mock:update       # Update mock signatures
npm run test:mock:generate     # Auto-generate new mocks

# Reporting
npm run test:report:coverage   # Detailed coverage analysis
npm run test:report:performance # Performance benchmarks
npm run test:report:quality    # Quality metrics dashboard
```

---

## 📊 Progress Tracking & Metrics

### **Individual Progress Tracking**
```bash
# View your contribution stats
npm run test:stats:personal

# Example output:
# 📊 Your Testing Contributions
# - Tests Written: 47
# - Coverage Added: 23.4%
# - Stories Completed: 12
# - Average Story Time: 3.2 hours
# - Quality Score: 94/100
```

### **Team Progress Tracking**
```bash
# View overall project progress
npm run test:stats:project

# Example output:
# 🎯 Project Testing Progress
# - Overall Coverage: 67% (target: 85%)
# - Tests Passing: 891/891 (100%)
# - Stories Completed: 45/80 (56.25%)
# - Estimated Completion: 3.2 weeks
```

### **Quality Metrics Dashboard**
Access real-time metrics at: `http://localhost:4200/testing-dashboard`
- Coverage trends over time
- Test execution performance
- Contributor leaderboard
- Quality gate success rates

---

## 🎯 Success Metrics & Definitions

### **Story Completion Criteria**
```typescript
interface StoryCompletionCriteria {
  // Functional requirements
  allAcceptanceCriteriaMet: boolean;
  allTestCasesPass: boolean;
  targetCoverageAchieved: boolean;
  
  // Quality requirements  
  noLintingErrors: boolean;
  performanceTargetsMet: boolean;
  mockPatternsConsistent: boolean;
  
  // Documentation requirements
  testNamesDescriptive: boolean;
  complexLogicCommented: boolean;
  edgeCasesDocumented: boolean;
}
```

### **Developer Success Indicators**
- **Time to First Test**: <30 minutes from issue assignment
- **Story Completion Time**: Within estimated effort range
- **Code Review Cycles**: <2 cycles for approval
- **Quality Score**: >90/100 on automated quality checks

### **Learning & Development**
```bash
# Access learning resources
npm run test:learn:patterns      # Interactive pattern guide
npm run test:learn:best-practices # Best practices tutorial
npm run test:learn:debugging     # Common debugging techniques

# Get mentorship
npm run test:help                # Get help from experienced contributors
npm run test:pair-program        # Find pairing opportunities
```

---

## 🚨 Troubleshooting & Common Issues

### **Common Development Issues**

#### **Issue: Tests failing with mock-related errors**
```bash
# Diagnosis
npm run test:doctor:mocks

# Common fixes
npm run test:mock:reset         # Reset mock registry
npm run test:mock:validate      # Check mock signatures
npm run test:clear-cache        # Clear Vitest cache
```

#### **Issue: Slow test execution**
```bash
# Performance diagnosis
npm run test:performance:analyze

# Optimization strategies
npm run test:optimize:mocks     # Optimize mock performance
npm run test:optimize:data      # Optimize test data generation
```

#### **Issue: Coverage not updating**
```bash
# Clear coverage cache
rm -rf coverage/
npm run test:coverage:reset

# Regenerate coverage
npm run test:coverage
```

### **Getting Help**

#### **Self-Service Resources**
- [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) - Overall testing approach
- [`MOCK_PATTERNS_GUIDE.md`](./MOCK_PATTERNS_GUIDE.md) - Mock creation patterns
- [`USER_STORY_TEMPLATE.md`](./USER_STORY_TEMPLATE.md) - Story format reference

#### **Community Support**
- **Slack Channel**: `#testing-framework`
- **Weekly Office Hours**: Tuesdays 2-3pm EST
- **Pair Programming**: Available on request via slack

#### **Expert Escalation**
For complex testing scenarios or architectural questions:
- Tag `@testing-team` in GitHub issues
- Schedule 1:1 with testing framework maintainer
- Submit architecture proposal for new patterns

---

## 🏆 Recognition & Contribution Rewards

### **Contribution Levels**
```typescript
const contributionLevels = {
  'Testing Contributor': { stories: 1, quality: 80 },
  'Testing Specialist': { stories: 5, quality: 85 },
  'Testing Expert': { stories: 15, quality: 90 },
  'Testing Architect': { stories: 30, quality: 95, mentoring: true }
};
```

### **Recognition Program**
- **Weekly Shoutouts**: Top contributors in team meetings
- **Monthly Awards**: "Testing Champion" recognition
- **Annual Conference**: Present testing innovations at company tech talks
- **Career Development**: Testing expertise counts toward senior IC track

### **Impact Measurement**
Your testing contributions directly impact:
- **Product Reliability**: Reduced production bugs
- **Development Velocity**: Faster feature delivery
- **Team Confidence**: Higher deployment confidence
- **Customer Satisfaction**: Better user experience

---

**🎯 Remember**: Every test you write makes the entire team more productive and our product more reliable. Thank you for contributing to our testing excellence! 🙏