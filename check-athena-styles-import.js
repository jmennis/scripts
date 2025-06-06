/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
const IMPORT_STATEMENT = "import '@simpplr/athena-ui/style';";

// Function to read package.json and get the version of @simpplr/athena-ui
function getAthenaUiVersion() {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('❌ package.json not found.');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

  console.log('🔍 Checking dependencies, devDependencies, and peerDependencies...');
  let version =
    packageJson.dependencies?.['@simpplr/athena-ui'] ||
    packageJson.devDependencies?.['@simpplr/athena-ui'] ||
    packageJson.peerDependencies?.['@simpplr/athena-ui'];

  console.log('🔍 Found version in:', {
    dependencies: packageJson.dependencies?.['@simpplr/athena-ui'],
    devDependencies: packageJson.devDependencies?.['@simpplr/athena-ui'],
    peerDependencies: packageJson.peerDependencies?.['@simpplr/athena-ui'],
  });

  if (!version) {
    console.log('ℹ️ @simpplr/athena-ui is not found in dependencies.');
    return null;
  }

  // Extract numeric version (removing ^, ~, etc.)
  version = version.replace(/[^0-9.]/g, '');
  return version;
}

// Function to compare versions without using semver
function isVersionGte31(version) {
  const [major] = version.split('.').map(Number);
  return major >= 31;
}

// Function to recursively scan files in a directory
function findImportStatement(dir) {
  let found = false;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (found) break; // Stop if found
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Skip node_modules and dist directories
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist') {
        continue; // Skip these directories
      }
      found = findImportStatement(fullPath); // Recursively check subdirectories
    } else if (
      fullPath.endsWith('.js') ||
      fullPath.endsWith('.ts') ||
      fullPath.endsWith('.jsx') ||
      fullPath.endsWith('.tsx')
    ) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(IMPORT_STATEMENT)) {
        found = true;
        break;
      }
    }
  }
  return found;
}

// Main check
const athenaVersion = getAthenaUiVersion();
if (!athenaVersion) {
  console.log('✅ No @simpplr/athena-ui found. Passing.');
  process.exit(0);
}

if (isVersionGte31(athenaVersion)) {
  console.log(
    `🔍 Detected @simpplr/athena-ui version ${athenaVersion} (>=31.0.0). Checking for import statement...`
  );
  if (findImportStatement(process.cwd())) {
    console.log('✅ Import statement found. Passing.');
    process.exit(0);
  } else {
    console.error('❌ Import statement missing. Failing.');
    process.exit(1);
  }
} else {
  console.log(
    `✅ Detected @simpplr/athena-ui version ${athenaVersion} (<31.0.0). No check needed. Passing.`
  );
  process.exit(0);
}
