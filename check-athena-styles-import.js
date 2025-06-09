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

// Function to remove comments from code content
function removeComments(content) {
  // Remove single-line comments (//)
  content = content.replace(/\/\/.*$/gm, '');
  
  // Remove multi-line comments (/* */)
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return content;
}

// Function to check if import statement exists in a file (not in comments)
function hasImportStatement(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const contentWithoutComments = removeComments(content);
  
  return contentWithoutComments.includes(IMPORT_STATEMENT);
}

// Function to check if a file exports init from './init' and init.ts has the import
function hasInitExportWithImport(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const contentWithoutComments = removeComments(content);
  
  // Check if file exports init from './init'
  const initExportPattern = /export\s*\{\s*init\s*\}\s*from\s*['"]\.\/(init)['"]/;
  if (initExportPattern.test(contentWithoutComments)) {
    // Check if init.ts file exists and has the import
    const fileDir = path.dirname(filePath);
    const initPath = path.join(fileDir, 'init.ts');
    const initJsPath = path.join(fileDir, 'init.js');
    
    if (fs.existsSync(initPath)) {
      return hasImportStatement(initPath);
    } else if (fs.existsSync(initJsPath)) {
      return hasImportStatement(initJsPath);
    }
  }
  
  return false;
}

// Function to check if a file has the import either directly or through init export
function hasImportOrInitExport(filePath) {
  return hasImportStatement(filePath) || hasInitExportWithImport(filePath);
}

// Function to find webpack config and extract exposes section
function getWebpackExposes() {
  const webpackConfigPaths = [
    path.join(process.cwd(), 'webpack.config.js'),
    path.join(process.cwd(), 'webpack.config.ts'),
    path.join(process.cwd(), 'frontend/webpack.config.js'),
    path.join(process.cwd(), 'frontend/webpack.config.ts'),
  ];

  for (const configPath of webpackConfigPaths) {
    if (fs.existsSync(configPath)) {
      console.log(`🔍 Found webpack config at: ${configPath}`);
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        // Extract exposes section using regex
        const exposesMatch = configContent.match(/exposes:\s*{([^}]+)}/s);
        if (exposesMatch) {
          const exposesContent = exposesMatch[1];
          const exposes = {};
          
          // Parse the exposes entries
          const entries = exposesContent.match(/'[^']+'\s*:\s*'[^']+'/g);
          if (entries) {
            entries.forEach(entry => {
              const [key, value] = entry.split(':').map(s => s.trim().replace(/'/g, ''));
              exposes[key] = value;
            });
          }
          
          return { configPath, exposes };
        }
      } catch (error) {
        console.error(`❌ Error reading webpack config: ${error.message}`);
      }
    }
  }
  
  console.log('ℹ️ No webpack config with exposes section found.');
  return null;
}

// Function to check if shared init function has the import
function checkSharedInitFunction() {
  const initFunctionPaths = [
    path.join(process.cwd(), 'src/helpers/federation.ts'),
    path.join(process.cwd(), 'src/helpers/federation.js'),
    path.join(process.cwd(), 'frontend/src/helpers/federation.ts'),
    path.join(process.cwd(), 'frontend/src/helpers/federation.js'),
  ];

  for (const initPath of initFunctionPaths) {
    if (fs.existsSync(initPath)) {
      console.log(`🔍 Checking shared init function at: ${initPath}`);
      return hasImportStatement(initPath);
    }
  }
  
  return false;
}

// Function to recursively scan files in a directory (fallback for non-webpack projects)
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
      if (hasImportOrInitExport(fullPath)) {
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
  
  // Check for webpack module federation exposes
  const webpackInfo = getWebpackExposes();
  
  if (webpackInfo) {
    console.log('🔍 Found webpack exposes section. Checking exposed files...');
    
    // Check if shared init function has the import
    const hasSharedInit = checkSharedInitFunction();
    if (hasSharedInit) {
      console.log('✅ Import statement found in shared init function. Passing.');
      process.exit(0);
    }
    
    // Check each exposed file
    const { configPath, exposes } = webpackInfo;
    const configDir = path.dirname(configPath);
    let allExposedFilesHaveImport = true;
    let checkedFiles = [];
    
    for (const [exposeName, exposePath] of Object.entries(exposes)) {
      // Convert relative path to absolute path from webpack config directory
      const fullExposePath = path.resolve(configDir, exposePath + '.tsx');
      const alternativeExposePath = path.resolve(configDir, exposePath + '.ts');
      const jsExposePath = path.resolve(configDir, exposePath + '.jsx');
      const jsAlternativeExposePath = path.resolve(configDir, exposePath + '.js');
      
      let actualPath = null;
      if (fs.existsSync(fullExposePath)) {
        actualPath = fullExposePath;
      } else if (fs.existsSync(alternativeExposePath)) {
        actualPath = alternativeExposePath;
      } else if (fs.existsSync(jsExposePath)) {
        actualPath = jsExposePath;
      } else if (fs.existsSync(jsAlternativeExposePath)) {
        actualPath = jsAlternativeExposePath;
      }
      
      if (actualPath) {
        console.log(`🔍 Checking exposed file: ${exposeName} -> ${actualPath}`);
        checkedFiles.push(actualPath);
        
        const hasDirectImport = hasImportStatement(actualPath);
        const hasInitExport = hasInitExportWithImport(actualPath);
        
        if (!hasDirectImport && !hasInitExport) {
          console.error(`❌ Import statement missing in exposed file: ${actualPath}`);
          allExposedFilesHaveImport = false;
        } else if (hasDirectImport) {
          console.log(`✅ Direct import statement found in: ${actualPath}`);
        } else if (hasInitExport) {
          console.log(`✅ Init export with import found in: ${actualPath}`);
        }
      } else {
        console.error(`❌ Exposed file not found: ${exposePath}`);
        allExposedFilesHaveImport = false;
      }
    }
    
    if (allExposedFilesHaveImport && checkedFiles.length > 0) {
      console.log('✅ Import statement found in all exposed files. Passing.');
      process.exit(0);
    } else {
      console.error('❌ Import statement missing in one or more exposed files. Failing.');
      process.exit(1);
    }
  } else {
    // Fallback to the original behavior for non-webpack projects
    console.log('🔍 No webpack exposes found. Checking all files...');
    if (findImportStatement(process.cwd())) {
      console.log('✅ Import statement found. Passing.');
      process.exit(0);
    } else {
      console.error('❌ Import statement missing. Failing.');
      process.exit(1);
    }
  }
} else {
  console.log(
    `✅ Detected @simpplr/athena-ui version ${athenaVersion} (<31.0.0). No check needed. Passing.`
  );
  process.exit(0);
}
