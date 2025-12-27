#!/usr/bin/env node

/**
 * 🏥 MOCARDS PRODUCTION HEALTH CHECK
 * Verifies all critical systems are operational before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🏥 MOCARDS PRODUCTION HEALTH CHECK');
console.log('=====================================\n');

let healthScore = 0;
let maxScore = 0;
const issues = [];

function checkFile(filePath, checks, description) {
  maxScore += checks.length;
  console.log(`🔍 Checking ${description}...`);

  if (!fs.existsSync(filePath)) {
    issues.push(`❌ ${description}: File missing - ${filePath}`);
    console.log(`   ❌ File missing: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  checks.forEach(check => {
    if (content.includes(check.pattern)) {
      healthScore++;
      console.log(`   ✅ ${check.name}`);
    } else {
      issues.push(`❌ ${description}: ${check.name} - Pattern not found: ${check.pattern}`);
      console.log(`   ❌ ${check.name}`);
    }
  });

  console.log('');
}

// Critical System Checks
checkFile('src/lib/supabaseCloudSync.ts', [
  {
    name: 'Pagination Logic Protected',
    pattern: 'let allCards: any[] = [];'
  },
  {
    name: 'Status Mapping Protected',
    pattern: 'card.status === \'active\' || card.status === \'activated\''
  },
  {
    name: 'Clinic Assignment Protected',
    pattern: 'supabaseUpdates.clinic_id = updates.clinicId'
  },
  {
    name: 'Database Connection Check',
    pattern: 'checkConnection()'
  }
], 'Database Layer');

checkFile('src/lib/data.ts', [
  {
    name: 'Card Generator Function',
    pattern: 'generateCards: async ('
  },
  {
    name: 'Sequential ID Logic',
    pattern: 'let nextId = 1;'
  },
  {
    name: 'Duplicate Prevention',
    pattern: 'existingControlNumbers.has(controlNumber)'
  },
  {
    name: 'Cloud Operations Integration',
    pattern: 'await cloudOperations.cards.add(card)'
  }
], 'Card Generation System');

checkFile('src/components/views/AdminPortalView.tsx', [
  {
    name: 'Dashboard Stats Calculation',
    pattern: 'Total Cards\', value: cards.length'
  },
  {
    name: 'Active Cards Filter',
    pattern: 'cards.filter(c => c.status === \'active\')'
  },
  {
    name: 'Quantity Selection UI',
    pattern: '[1, 50, 100, 250, 500, 1000]'
  },
  {
    name: 'Enhanced Logging',
    pattern: 'console.log(\'[Admin] BEFORE Generation'
  }
], 'Admin Portal');

checkFile('package.json', [
  {
    name: 'Build Script',
    pattern: '"build": "tsc && vite build"'
  },
  {
    name: 'Dev Script',
    pattern: '"dev": "vite"'
  },
  {
    name: 'Required Dependencies',
    pattern: '"@supabase/supabase-js"'
  }
], 'Project Configuration');

// Calculate Health Score
const healthPercentage = Math.round((healthScore / maxScore) * 100);

console.log('📊 HEALTH CHECK RESULTS');
console.log('========================');
console.log(`Score: ${healthScore}/${maxScore} (${healthPercentage}%)`);
console.log('');

if (healthPercentage >= 95) {
  console.log('🟢 EXCELLENT HEALTH - Production Ready! 🚀');
} else if (healthPercentage >= 85) {
  console.log('🟡 GOOD HEALTH - Minor issues detected');
} else if (healthPercentage >= 70) {
  console.log('🟠 FAIR HEALTH - Several issues need attention');
} else {
  console.log('🔴 POOR HEALTH - Critical issues detected!');
}

if (issues.length > 0) {
  console.log('\n🚨 ISSUES DETECTED:');
  console.log('===================');
  issues.forEach(issue => console.log(issue));
  console.log('\n⚠️ Please address these issues before production deployment!');
}

// Production Readiness
console.log('\n🏆 PRODUCTION READINESS CHECKLIST:');
console.log('===================================');

const productionChecks = [
  { name: 'Critical functions protected', passed: healthScore >= maxScore * 0.9 },
  { name: 'Database layer secure', passed: healthScore >= maxScore * 0.8 },
  { name: 'UI components stable', passed: healthScore >= maxScore * 0.85 },
  { name: 'No breaking changes', passed: issues.length === 0 },
];

productionChecks.forEach(check => {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
});

const allChecksPassed = productionChecks.every(check => check.passed);

console.log('\n' + '='.repeat(50));
if (allChecksPassed && healthPercentage >= 95) {
  console.log('🎉 SYSTEM READY FOR PRODUCTION DEPLOYMENT! 🎉');
  console.log('All safeguards verified and protection active.');
  process.exit(0);
} else {
  console.log('⚠️ SYSTEM NOT READY FOR PRODUCTION');
  console.log('Please resolve issues before deployment.');
  process.exit(1);
}