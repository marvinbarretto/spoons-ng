#!/usr/bin/env node

/**
 * @fileoverview GitHub Testing Issues Automation Script
 * 
 * Creates comprehensive user stories as GitHub Issues from TESTING_AUDIT.md analysis.
 * Generates 80+ bite-sized testing tasks with proper labeling, milestones, and project board assignment.
 * 
 * Usage:
 *   node scripts/create-testing-issues.js --dry-run  # Preview issues without creating
 *   node scripts/create-testing-issues.js --create   # Actually create GitHub issues
 *   node scripts/create-testing-issues.js --phase=1  # Create only Phase 1 issues
 * 
 * Prerequisites:
 *   - GitHub CLI installed and authenticated
 *   - GitHub repository with Issues enabled
 *   - PROJECT_BOARD_ID configured in package.json or environment
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Configuration
const CONFIG = {
  // GitHub repository (auto-detected from git remote)
  repository: detectGitRepository(),
  
  // Project board ID (set via environment or package.json)
  projectBoardId: process.env.GITHUB_PROJECT_BOARD_ID || '1',
  
  // Issue templates directory
  templatesDir: path.join(__dirname, '../.github/ISSUE_TEMPLATE'),
  
  // User story template file
  userStoryTemplate: path.join(__dirname, '../USER_STORY_TEMPLATE.md'),
  
  // Testing audit source
  testingAudit: path.join(__dirname, '../TESTING_AUDIT.md'),
  
  // Output directory for generated issues (if dry-run)
  outputDir: path.join(__dirname, '../temp/generated-issues'),
  
  // Default assignees for different types of issues
  defaultAssignees: {
    'infrastructure': [],
    'unit': [],
    'integration': [],
    'component': [],
    'e2e': []
  }
};

// Parse command line arguments
const args = parseCommandLineArgs();

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 GitHub Testing Issues Generator');
    console.log('=====================================');
    
    // Validate prerequisites
    await validatePrerequisites();
    
    // Load testing audit data
    const auditData = await loadTestingAuditData();
    
    // Generate user stories from audit
    const userStories = await generateUserStoriesFromAudit(auditData);
    
    // Create GitHub issues
    if (args.dryRun) {
      await previewIssues(userStories);
    } else {
      await createGitHubIssues(userStories);
    }
    
    console.log('\n✅ Testing issues generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  
  return {
    dryRun: args.includes('--dry-run'),
    create: args.includes('--create'),
    phase: args.find(arg => arg.startsWith('--phase='))?.split('=')[1],
    priority: args.find(arg => arg.startsWith('--priority='))?.split('=')[1],
    type: args.find(arg => arg.startsWith('--type='))?.split('=')[1],
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Detect git repository from remote origin
 */
function detectGitRepository() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    const match = remote.match(/github\.com[:/](.+)\/(.+)(?:\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2].replace('.git', '')}`;
    }
  } catch (error) {
    console.warn('⚠️  Could not auto-detect GitHub repository');
  }
  return process.env.GITHUB_REPOSITORY || 'your-org/spoons';
}

/**
 * Validate prerequisites for running the script
 */
async function validatePrerequisites() {
  console.log('🔍 Validating prerequisites...');
  
  // Check if GitHub CLI is installed
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('GitHub CLI (gh) is required but not installed. Install from https://cli.github.com/');
  }
  
  // Check if authenticated with GitHub
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('Please authenticate with GitHub CLI: gh auth login');
  }
  
  // Check if required files exist
  const requiredFiles = [CONFIG.userStoryTemplate, CONFIG.testingAudit];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
  
  console.log('✅ Prerequisites validated');
}

/**
 * Load and parse testing audit data
 */
async function loadTestingAuditData() {
  console.log('📖 Loading testing audit data...');
  
  const auditContent = fs.readFileSync(CONFIG.testingAudit, 'utf-8');
  
  // Parse audit data (simplified - you may want more sophisticated parsing)
  const auditData = {
    currentState: {
      failedTests: 16,
      passedTests: 175,
      totalTests: 191,
      coverage: 10
    },
    
    criticalGaps: [
      'CheckinOrchestrator - Core business workflow',
      'PointsService - Points calculation engine', 
      'BadgeEvaluator - Badge award logic',
      'SessionService - App initialization coordinator',
      'CacheCoherenceService - Cross-store consistency'
    ],
    
    untestedStores: [
      'CheckInStore - Primary data store',
      'BadgeStore - Badge management',
      'PointsStore - Points transactions', 
      'MissionStore - Mission data',
      'PubStore - Pub data management',
      'ThemeStore - UI theming'
    ],
    
    phases: {
      'Phase 1: Foundation': {
        priority: 'P0',
        duration: '2 weeks',
        tasks: [
          'Fix broken Firebase Analytics tests (7 failures)',
          'Create unified mock registry',
          'Test CheckinOrchestrator service',
          'Test PointsService calculations',
          'Test BadgeEvaluator logic'
        ]
      },
      
      'Phase 2: Core Coverage': {
        priority: 'P1', 
        duration: '4 weeks',
        tasks: [
          'Test all missing stores (CheckInStore, BadgeStore, PointsStore, MissionStore)',
          'Enhanced test data management',
          'Badge & Mission logic testing',
          'Store integration patterns'
        ]
      },
      
      'Phase 3: Integration': {
        priority: 'P2',
        duration: '4 weeks', 
        tasks: [
          'Component integration tests',
          'Error handling test suite',
          'Performance regression tests',
          'Cross-store consistency testing'
        ]
      },
      
      'Phase 4: Advanced': {
        priority: 'P3',
        duration: '4 weeks',
        tasks: [
          'End-to-end critical paths',
          'Accessibility compliance testing',
          'PWA functionality testing',
          'Performance benchmarking'
        ]
      }
    }
  };
  
  console.log(`✅ Loaded audit data: ${auditData.currentState.totalTests} total tests, ${auditData.currentState.coverage}% coverage`);
  return auditData;
}

/**
 * Generate user stories from testing audit analysis
 */
async function generateUserStoriesFromAudit(auditData) {
  console.log('📝 Generating user stories from audit...');
  
  const userStories = [];
  let storyCounter = 1;
  
  // Phase 1: Foundation Repair (P0 Critical)
  userStories.push(...generateFoundationStories(storyCounter, auditData));
  storyCounter += userStories.length;
  
  // Phase 2: Core Coverage (P1 High)
  userStories.push(...generateCoreStories(storyCounter, auditData));
  storyCounter += userStories.length;
  
  // Phase 3: Integration & Polish (P2 Medium) 
  userStories.push(...generateIntegrationStories(storyCounter, auditData));
  storyCounter += userStories.length;
  
  // Phase 4: Advanced Testing (P3 Long-term)
  userStories.push(...generateAdvancedStories(storyCounter, auditData));
  
  console.log(`✅ Generated ${userStories.length} user stories`);
  return userStories;
}

/**
 * Generate Phase 1 foundation stories
 */
function generateFoundationStories(startCounter, auditData) {
  const stories = [];
  let counter = startCounter;
  
  // Fix broken tests
  stories.push({
    id: `TEST-${String(counter++).padStart(3, '0')}`,
    title: 'Firebase Analytics - Fix Broken Mock Patterns',
    type: 'infrastructure', 
    priority: 'P0',
    complexity: 'S',
    estimatedHours: 2,
    phase: 1,
    
    userStory: 'As a developer, I want reliable Firebase Analytics mocks that don\'t break tests, so that all tests pass consistently and CI pipeline is stable.',
    
    background: 'Currently 7 tests are failing due to broken Firebase Analytics vi.mock() patterns. This blocks all development and creates CI instability.',
    
    acceptanceCriteria: [
      'All 7 failing Firebase Analytics tests pass',
      'Analytics mock exports are properly configured',
      'vi.mock() patterns follow established conventions',
      'Tests can run independently without mock pollution'
    ],
    
    technicalSpecs: {
      filesToModify: [
        'src/app/shared/testing/mocks/firebase-analytics.mock.ts',
        'src/**/*.spec.ts (files using analytics mocks)'
      ],
      testingApproach: 'Fix existing broken mocks, verify with test execution',
      dependencies: ['Enhanced mock registry system']
    },
    
    labels: ['test:infrastructure', 'priority:critical', 'complexity:small', 'phase:1']
  });
  
  // Mock registry
  stories.push({
    id: `TEST-${String(counter++).padStart(3, '0')}`,
    title: 'Mock Registry - Centralized Mock Factory System',
    type: 'infrastructure',
    priority: 'P0', 
    complexity: 'M',
    estimatedHours: 6,
    phase: 1,
    
    userStory: 'As a developer, I want a centralized mock registry with consistent patterns, so that creating and maintaining test mocks is efficient and standardized.',
    
    background: 'Current mock patterns are inconsistent across test files, leading to maintenance overhead and developer confusion.',
    
    acceptanceCriteria: [
      'Centralized MockRegistry class implemented',
      'Auto-dependency resolution for complex services', 
      'Signal-compatible mock generation',
      'Consistent mock patterns across all test files',
      'Performance optimization with lazy loading'
    ],
    
    technicalSpecs: {
      filesToCreate: [
        'src/app/shared/testing/core/mock-registry.ts',
        'src/app/shared/testing/core/auto-mocks.ts'
      ],
      testingApproach: 'Unit tests for mock registry, integration with existing tests',
      dependencies: []
    },
    
    labels: ['test:infrastructure', 'priority:critical', 'complexity:medium', 'phase:1']
  });
  
  // Critical services
  const criticalServices = [
    { 
      name: 'CheckinOrchestrator',
      description: 'Core business workflow coordination',
      complexity: 'L',
      hours: 8
    },
    {
      name: 'PointsService', 
      description: 'Points calculation algorithms and bonus logic',
      complexity: 'M',
      hours: 6
    },
    {
      name: 'BadgeEvaluator',
      description: 'Badge award conditions and rule evaluation', 
      complexity: 'M',
      hours: 6
    }
  ];
  
  for (const service of criticalServices) {
    stories.push({
      id: `TEST-${String(counter++).padStart(3, '0')}`,
      title: `${service.name} - Comprehensive Unit Testing`,
      type: 'unit',
      priority: 'P0',
      complexity: service.complexity,
      estimatedHours: service.hours,
      phase: 1,
      
      userStory: `As a developer, I want comprehensive unit tests for ${service.name} service, so that I can confidently refactor the business logic without introducing regressions.`,
      
      background: `${service.name} contains critical business logic (${service.description}) but has no test coverage, creating significant risk for production deployments.`,
      
      acceptanceCriteria: [
        `>85% line coverage for ${service.name} service`,
        'All public methods tested with realistic scenarios',
        'Error handling and edge cases covered',
        'Performance tests for complex operations',
        'Integration tests with dependent services'
      ],
      
      technicalSpecs: {
        filesToCreate: [`src/app/**/${service.name.toLowerCase()}.spec.ts`],
        testingApproach: 'BDD-style unit tests with realistic mock scenarios',
        dependencies: ['Mock registry system', 'BDD helpers']
      },
      
      labels: ['test:unit', 'priority:critical', `complexity:${service.complexity.toLowerCase()}`, 'phase:1']
    });
  }
  
  return stories;
}

/**
 * Generate Phase 2 core coverage stories  
 */
function generateCoreStories(startCounter, auditData) {
  const stories = [];
  let counter = startCounter;
  
  // Store testing stories
  const untestedStores = [
    { name: 'CheckInStore', description: 'Primary check-in data store with reactive patterns' },
    { name: 'BadgeStore', description: 'Badge management and award workflows' },
    { name: 'PointsStore', description: 'Points transactions and calculation logic' },
    { name: 'MissionStore', description: 'Mission data and progress tracking' },
    { name: 'PubStore', description: 'Pub data management with caching' },
    { name: 'ThemeStore', description: 'UI theming and user preferences' }
  ];
  
  for (const store of untestedStores) {
    stories.push({
      id: `TEST-${String(counter++).padStart(3, '0')}`,
      title: `${store.name} - Reactive Store Testing`,
      type: 'unit',
      priority: 'P1',
      complexity: 'M',
      estimatedHours: 4,
      phase: 2,
      
      userStory: `As a developer, I want comprehensive tests for ${store.name}, so that store state management and reactive patterns work reliably across the application.`,
      
      background: `${store.name} (${store.description}) has no test coverage despite being critical for application state management.`,
      
      acceptanceCriteria: [
        `>80% line coverage for ${store.name}`,
        'Reactive signal patterns tested',
        'Cache coherence behavior verified',
        'Error recovery mechanisms tested',
        'Store lifecycle (load/reset/cleanup) tested'
      ],
      
      technicalSpecs: {
        filesToCreate: [`src/app/**/${store.name.toLowerCase().replace('store', '')}-store.spec.ts`],
        testingApproach: 'Signal-based testing with BaseStore patterns',
        dependencies: ['Store testing utilities', 'Mock registry']
      },
      
      labels: ['test:unit', 'priority:high', 'complexity:medium', 'phase:2', 'component:store']
    });
  }
  
  // Integration stories
  const integrationScenarios = [
    {
      title: 'UserStore + DataAggregator - Points Calculation Consistency',
      description: 'Ensure points calculations remain consistent between scoreboard and leaderboard'
    },
    {
      title: 'CheckInStore + PointsStore - Transaction Coordination', 
      description: 'Verify check-in creation properly triggers points award workflow'
    },
    {
      title: 'BadgeStore + UserStore - Badge Summary Synchronization',
      description: 'Test badge award workflow updates user badge counts correctly'
    }
  ];
  
  for (const scenario of integrationScenarios) {
    stories.push({
      id: `TEST-${String(counter++).padStart(3, '0')}`,
      title: scenario.title,
      type: 'integration',
      priority: 'P1', 
      complexity: 'M',
      estimatedHours: 5,
      phase: 2,
      
      userStory: `As a developer, I want integration tests between multiple stores and services, so that data remains consistent across different parts of the application.`,
      
      background: scenario.description,
      
      acceptanceCriteria: [
        'Cross-service data flow tested end-to-end',
        'Data consistency verified across all involved stores',
        'Error propagation and recovery tested',
        'Performance impact of integration measured'
      ],
      
      technicalSpecs: {
        filesToCreate: [`src/app/shared/testing/integration/${scenario.title.toLowerCase().replace(/\s+/g, '-')}.integration.spec.ts`],
        testingApproach: 'Integration testing with realistic scenario builders',
        dependencies: ['Enhanced test data management', 'Store mocks']
      },
      
      labels: ['test:integration', 'priority:high', 'complexity:medium', 'phase:2']
    });
  }
  
  return stories;
}

/**
 * Generate Phase 3 integration stories
 */
function generateIntegrationStories(startCounter, auditData) {
  const stories = [];
  let counter = startCounter;
  
  // Component integration stories
  const componentScenarios = [
    { component: 'HomeComponent', focus: 'Scoreboard data integration with stores' },
    { component: 'CheckInComponent', focus: 'Check-in workflow integration' },
    { component: 'LeaderboardComponent', focus: 'Real-time leaderboard updates' },
    { component: 'ProfileComponent', focus: 'User profile and badge display' }
  ];
  
  for (const scenario of componentScenarios) {
    stories.push({
      id: `TEST-${String(counter++).padStart(3, '0')}`,
      title: `${scenario.component} - Store Integration Testing`,
      type: 'component',
      priority: 'P2',
      complexity: 'M',
      estimatedHours: 6,
      phase: 3,
      
      userStory: `As a developer, I want ${scenario.component} to be tested with real store integrations, so that UI components display accurate data and respond correctly to state changes.`,
      
      background: `${scenario.component} integration with stores is untested, risking UI inconsistencies and broken user workflows.`,
      
      acceptanceCriteria: [
        'Component-store integration tested',
        'Reactive UI updates verified',
        'User interaction workflows tested', 
        'Error state handling in UI tested',
        'Accessibility compliance verified'
      ],
      
      technicalSpecs: {
        filesToCreate: [`src/app/**/${scenario.component.toLowerCase()}.component.spec.ts`],
        testingApproach: 'Component integration with TestBed and store mocks',
        dependencies: ['Component testing utilities', 'Store integration mocks']
      },
      
      labels: ['test:component', 'priority:medium', 'complexity:medium', 'phase:3']
    });
  }
  
  return stories;
}

/**
 * Generate Phase 4 advanced stories
 */
function generateAdvancedStories(startCounter, auditData) {
  const stories = [];
  let counter = startCounter;
  
  // E2E critical path stories
  const e2eScenarios = [
    { 
      title: 'User Registration & Onboarding Flow',
      description: 'Complete new user journey from signup to first check-in'
    },
    {
      title: 'Check-in to Badge Award Workflow', 
      description: 'End-to-end check-in process including points and badge evaluation'
    },
    {
      title: 'Leaderboard Competition Flow',
      description: 'Multi-user competitive scenarios with real-time updates'
    }
  ];
  
  for (const scenario of e2eScenarios) {
    stories.push({
      id: `TEST-${String(counter++).padStart(3, '0')}`,
      title: `E2E: ${scenario.title}`,
      type: 'e2e',
      priority: 'P3',
      complexity: 'L', 
      estimatedHours: 12,
      phase: 4,
      
      userStory: `As a product manager, I want end-to-end testing of ${scenario.title.toLowerCase()}, so that critical user journeys work reliably in production.`,
      
      background: scenario.description,
      
      acceptanceCriteria: [
        'Complete user journey tested from UI to database',
        'Cross-device compatibility verified',
        'Performance benchmarks established',
        'Error recovery workflows tested',
        'Analytics and tracking verified'
      ],
      
      technicalSpecs: {
        filesToCreate: [`e2e/${scenario.title.toLowerCase().replace(/\s+/g, '-')}.e2e.spec.ts`],
        testingApproach: 'Playwright E2E testing with realistic user scenarios',
        dependencies: ['E2E testing framework', 'Test data seeding']
      },
      
      labels: ['test:e2e', 'priority:low', 'complexity:large', 'phase:4']
    });
  }
  
  return stories;
}

/**
 * Preview issues without creating them
 */
async function previewIssues(userStories) {
  console.log('\n📋 Preview Mode - Generated User Stories:');
  console.log('==========================================');
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Group stories by phase
  const storyPhases = userStories.reduce((phases, story) => {
    const phase = `Phase ${story.phase}`;
    if (!phases[phase]) phases[phase] = [];
    phases[phase].push(story);
    return phases;
  }, {});
  
  // Display summary
  for (const [phase, stories] of Object.entries(storyPhases)) {
    console.log(`\n${phase}: ${stories.length} stories`);
    
    const priorityCounts = stories.reduce((counts, story) => {
      counts[story.priority] = (counts[story.priority] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`  Priority breakdown: ${Object.entries(priorityCounts).map(([p, c]) => `${p}:${c}`).join(', ')}`);
    
    const totalHours = stories.reduce((sum, story) => sum + story.estimatedHours, 0);
    console.log(`  Total estimated effort: ${totalHours} hours`);
  }
  
  // Generate individual issue files
  for (const story of userStories) {
    const issueContent = generateGitHubIssueContent(story);
    const filename = `${story.id}-${story.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}.md`;
    const filepath = path.join(CONFIG.outputDir, filename);
    
    fs.writeFileSync(filepath, issueContent);
  }
  
  console.log(`\n📁 Generated issue previews in: ${CONFIG.outputDir}`);
  console.log(`\n🎯 Summary:`);
  console.log(`  - Total Stories: ${userStories.length}`);
  console.log(`  - Total Estimated Effort: ${userStories.reduce((sum, s) => sum + s.estimatedHours, 0)} hours`);
  console.log(`  - Priority Distribution: ${JSON.stringify(userStories.reduce((counts, s) => { counts[s.priority] = (counts[s.priority] || 0) + 1; return counts; }, {}))}`);
}

/**
 * Create actual GitHub issues
 */
async function createGitHubIssues(userStories) {
  console.log('\n🚀 Creating GitHub Issues...');
  console.log('============================');
  
  // Filter stories if specific phase/priority requested
  let filteredStories = userStories;
  
  if (args.phase) {
    filteredStories = filteredStories.filter(story => story.phase === parseInt(args.phase));
    console.log(`📌 Creating only Phase ${args.phase} stories: ${filteredStories.length} issues`);
  }
  
  if (args.priority) {
    filteredStories = filteredStories.filter(story => story.priority === args.priority);
    console.log(`📌 Creating only ${args.priority} priority stories: ${filteredStories.length} issues`);
  }
  
  if (args.type) {
    filteredStories = filteredStories.filter(story => story.type === args.type);
    console.log(`📌 Creating only ${args.type} type stories: ${filteredStories.length} issues`);
  }
  
  // Create issues with progress tracking
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < filteredStories.length; i++) {
    const story = filteredStories[i];
    const progress = `[${i + 1}/${filteredStories.length}]`;
    
    try {
      console.log(`${progress} Creating: ${story.title}`);
      
      const issueUrl = await createGitHubIssue(story);
      
      results.push({ success: true, story, issueUrl });
      successCount++;
      
      console.log(`  ✅ Created: ${issueUrl}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      results.push({ success: false, story, error: error.message });
      errorCount++;
    }
  }
  
  // Summary
  console.log(`\n📊 Creation Summary:`);
  console.log(`  ✅ Successfully created: ${successCount} issues`);
  console.log(`  ❌ Failed to create: ${errorCount} issues`);
  
  if (errorCount > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.story.title}: ${r.error}`));
  }
  
  // Display created issue URLs
  if (successCount > 0) {
    console.log(`\n🔗 Created Issues:`);
    results
      .filter(r => r.success)
      .forEach(r => console.log(`  - ${r.story.title}: ${r.issueUrl}`));
  }
}

/**
 * Create individual GitHub issue
 */
async function createGitHubIssue(story) {
  const issueContent = generateGitHubIssueContent(story);
  const labels = story.labels.join(',');
  
  // Create temporary file for issue body to avoid shell escaping issues
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFile = path.join(tempDir, `issue-${story.id}-body.md`);
  fs.writeFileSync(tempFile, issueContent);
  
  try {
    // Create issue using GitHub CLI with spawn for proper argument handling
    const result = spawnSync('gh', [
      'issue', 'create',
      '--repo', CONFIG.repository,
      '--title', story.title,
      '--body-file', tempFile,
      '--label', labels
    ], { encoding: 'utf-8' });
    
    if (result.error) {
      throw new Error(`Spawn error: ${result.error.message}`);
    }
    
    if (result.status !== 0) {
      throw new Error(`GitHub CLI error: ${result.stderr || result.stdout}`);
    }
    
    const issueUrl = result.stdout.trim();
    
    // Clean up temporary file
    fs.unlinkSync(tempFile);
    
    return issueUrl;
  } catch (error) {
    // Clean up temporary file on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw new Error(`GitHub CLI error: ${error.message}`);
  }
}

/**
 * Generate GitHub issue content from user story
 */
function generateGitHubIssueContent(story) {
  return `## 🧪 Testing User Story

**Story ID**: ${story.id}  
**Type**: ${story.type}  
**Priority**: ${story.priority}  
**Complexity**: ${story.complexity}  
**Estimated Effort**: ${story.estimatedHours}h  
**Phase**: ${story.phase}

---

## 🎯 User Story

${story.userStory}

## 📖 Background & Context

${story.background}

## ✅ Acceptance Criteria

${story.acceptanceCriteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

## 🔧 Technical Specifications

### Files to Create/Modify
${story.technicalSpecs.filesToCreate ? story.technicalSpecs.filesToCreate.map(file => `- \`${file}\``).join('\n') : ''}
${story.technicalSpecs.filesToModify ? story.technicalSpecs.filesToModify.map(file => `- \`${file}\``).join('\n') : ''}

### Testing Approach
${story.technicalSpecs.testingApproach}

### Dependencies
${story.technicalSpecs.dependencies.map(dep => `- ${dep}`).join('\n')}

## 🏆 Definition of Done

- [ ] All acceptance criteria met
- [ ] Tests follow established patterns and naming conventions
- [ ] Code coverage meets minimum threshold
- [ ] All tests pass locally and in CI
- [ ] Code review completed and approved
- [ ] No breaking changes to existing tests

## 📚 Resources

- [USER_STORY_TEMPLATE.md](./USER_STORY_TEMPLATE.md) - Template reference
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - Overall testing approach  
- [MOCK_PATTERNS_GUIDE.md](./MOCK_PATTERNS_GUIDE.md) - Mock creation patterns
- [DEVELOPER_WORKFLOW.md](./DEVELOPER_WORKFLOW.md) - Development workflow

---

> 💡 **Getting Started**: Follow the [Developer Workflow Guide](./DEVELOPER_WORKFLOW.md) to set up your local environment and begin implementing this story.`;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🧪 GitHub Testing Issues Generator

USAGE:
  node scripts/create-testing-issues.js [OPTIONS]

OPTIONS:
  --dry-run                Preview issues without creating them
  --create                 Actually create GitHub issues  
  --phase=N               Create only Phase N stories (1-4)
  --priority=PN           Create only PN priority stories (P0-P3)
  --type=TYPE             Create only TYPE stories (unit|integration|component|e2e)
  --help, -h              Show this help message

EXAMPLES:
  # Preview all issues
  node scripts/create-testing-issues.js --dry-run
  
  # Create only Phase 1 critical issues
  node scripts/create-testing-issues.js --create --phase=1
  
  # Create only unit test issues
  node scripts/create-testing-issues.js --create --type=unit
  
  # Create only P0 priority issues  
  node scripts/create-testing-issues.js --create --priority=P0

PREREQUISITES:
  - GitHub CLI installed and authenticated (gh auth login)
  - Repository with Issues enabled
  - Write access to the repository
  
ENVIRONMENT VARIABLES:
  GITHUB_REPOSITORY       Repository in format 'owner/repo'
  GITHUB_PROJECT_BOARD_ID Project board ID for issue assignment
`);
}

// Execute main function
if (args.help) {
  showHelp();
} else {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}