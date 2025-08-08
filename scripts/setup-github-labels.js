#!/usr/bin/env node

/**
 * @fileoverview GitHub Labels Setup Script
 * 
 * Creates standardized labels for testing user stories in GitHub repository.
 * Must be run before create-testing-issues.js to ensure proper labeling.
 */

const { execSync } = require('child_process');

// Required labels for testing framework
const TESTING_LABELS = [
  // Test Types
  { name: 'test:unit', color: '0366d6', description: 'Unit testing tasks' },
  { name: 'test:integration', color: '1d76db', description: 'Integration testing tasks' },
  { name: 'test:component', color: '5319e7', description: 'Component testing tasks' },
  { name: 'test:e2e', color: '8b5a2b', description: 'End-to-end testing tasks' },
  { name: 'test:infrastructure', color: 'f1c40f', description: 'Testing infrastructure and tooling' },
  
  // Priority Levels
  { name: 'priority:critical', color: 'd73a49', description: 'P0 - Critical priority, must be completed first' },
  { name: 'priority:high', color: 'fb8c00', description: 'P1 - High priority, important features' },
  { name: 'priority:medium', color: '28a745', description: 'P2 - Medium priority, standard features' },
  { name: 'priority:low', color: '6f42c1', description: 'P3 - Low priority, nice-to-have features' },
  
  // Complexity/Size
  { name: 'complexity:small', color: 'c5def5', description: 'XS-S complexity, 1-4 hours' },
  { name: 'complexity:medium', color: '7fcaff', description: 'M complexity, 4-8 hours' },
  { name: 'complexity:large', color: '2e86ab', description: 'L-XL complexity, 8+ hours' },
  
  // Components
  { name: 'component:store', color: 'a8dadc', description: 'Store/state management related' },
  { name: 'component:service', color: '457b9d', description: 'Service layer related' },
  { name: 'component:ui', color: '1d3557', description: 'UI component related' },
  
  // Phases
  { name: 'phase:1', color: 'ff6b6b', description: 'Phase 1 - Foundation (Week 1-2)' },
  { name: 'phase:2', color: 'feca57', description: 'Phase 2 - Core Coverage (Week 3-6)' },
  { name: 'phase:3', color: '48dbfb', description: 'Phase 3 - Integration (Week 7-10)' },
  { name: 'phase:4', color: '9c88ff', description: 'Phase 4 - Advanced (Week 11-12)' }
];

// Detect git repository from remote origin
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

async function main() {
  const repository = detectGitRepository();
  
  console.log('🏷️  GitHub Labels Setup');
  console.log('======================');
  console.log(`Repository: ${repository}`);
  console.log(`Creating ${TESTING_LABELS.length} testing labels...\n`);
  
  let created = 0;
  let existing = 0;
  let errors = 0;
  
  for (const label of TESTING_LABELS) {
    try {
      const command = [
        'gh', 'label', 'create',
        '--repo', repository,
        label.name,
        '--color', label.color,
        '--description', `"${label.description}"`
      ].join(' ');
      
      execSync(command, { stdio: 'pipe' });
      console.log(`✅ Created: ${label.name}`);
      created++;
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚡ Exists: ${label.name}`);
        existing++;
      } else {
        console.log(`❌ Failed: ${label.name} - ${error.message}`);
        errors++;
      }
    }
  }
  
  console.log('\n📊 Setup Summary:');
  console.log(`✅ Created: ${created} labels`);
  console.log(`⚡ Already existed: ${existing} labels`);
  console.log(`❌ Failed: ${errors} labels`);
  
  if (errors === 0) {
    console.log('\n🎉 All labels are ready! You can now run:');
    console.log('node scripts/create-testing-issues.js --create --phase=1');
  } else {
    console.log('\n⚠️  Some labels failed to create. Please check repository permissions.');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});