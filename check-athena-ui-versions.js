#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_READ_ALL_TOKEN;
const ORG_NAME = 'Simpplr';

if (!GITHUB_TOKEN) {
  console.error(
    '❌ Error: GITHUB_READ_ALL_TOKEN environment variable is required'
  );
  console.error(
    'Please set it with: export GITHUB_READ_ALL_TOKEN=your_github_token'
  );
  process.exit(1);
}

// Helper function to make GitHub API requests
function makeGitHubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'athena-ui-version-checker',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else if (res.statusCode === 404) {
          resolve(null); // File not found
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Function to make GitHub API request and capture headers
function makeGitHubRequestWithHeaders(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'athena-ui-version-checker',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({
              data: JSON.parse(data),
              headers: res.headers,
              statusCode: res.statusCode,
            });
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          resolve({
            data: null,
            headers: res.headers,
            statusCode: res.statusCode,
            error: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Function to check comprehensive token permissions
async function checkComprehensivePermissions() {
  try {
    console.log('🔐 Comprehensive Token Permission Check');
    console.log('=====================================');

    // 1. Check basic user info and token scopes
    console.log('👤 Checking user authentication and token scopes...');
    const userResponse = await makeGitHubRequestWithHeaders('/user');

    if (userResponse.data) {
      console.log(
        `✅ Authenticated as: ${userResponse.data.login} (${userResponse.data.name || 'No name'})`
      );
      console.log(`📧 Email: ${userResponse.data.email || 'Private'}`);
      console.log(`🏢 Company: ${userResponse.data.company || 'None'}`);

      // Extract token scopes from headers
      const scopes = userResponse.headers['x-oauth-scopes'];
      console.log(`🔑 Token scopes: ${scopes || 'None visible'}`);

      const acceptedScopes = userResponse.headers['x-accepted-oauth-scopes'];
      console.log(
        `📝 Accepted scopes for this endpoint: ${acceptedScopes || 'None'}`
      );
    } else {
      console.log(
        `❌ Authentication failed: ${userResponse.statusCode} - ${userResponse.error}`
      );
      return false;
    }

    console.log('\n🏢 Checking organization access...');

    // 2. Check public organization info
    const orgResponse = await makeGitHubRequestWithHeaders(`/orgs/${ORG_NAME}`);
    if (orgResponse.data) {
      console.log(`✅ Can read ${ORG_NAME} organization info`);
      console.log(`📊 Public repos: ${orgResponse.data.public_repos}`);
      console.log(
        `👥 Public members: ${orgResponse.data.public_members_count || 'N/A'}`
      );
    } else {
      console.log(
        `❌ Cannot read organization info: ${orgResponse.statusCode} - ${orgResponse.error}`
      );
    }

    // 3. Check organization membership
    const membershipResponse = await makeGitHubRequestWithHeaders(
      `/orgs/${ORG_NAME}/members/${userResponse.data.login}`
    );
    if (membershipResponse.statusCode === 204) {
      console.log(`✅ You are a public member of ${ORG_NAME}`);
    } else if (membershipResponse.statusCode === 404) {
      console.log(
        `❌ You are not a public member of ${ORG_NAME} (or membership is private)`
      );
    } else if (membershipResponse.statusCode === 302) {
      console.log(`🔒 Your membership in ${ORG_NAME} is private`);
    }

    // 4. Check organization repositories access
    const orgReposResponse = await makeGitHubRequestWithHeaders(
      `/orgs/${ORG_NAME}/repos?per_page=5`
    );
    if (orgReposResponse.data && orgReposResponse.data.length > 0) {
      console.log(`✅ Can access organization repositories`);
      console.log(
        `📚 Found ${orgReposResponse.data.length} repositories in first page`
      );

      const privateRepos = orgReposResponse.data.filter((repo) => repo.private);
      const publicRepos = orgReposResponse.data.filter((repo) => !repo.private);
      console.log(`🔒 Private repositories accessible: ${privateRepos.length}`);
      console.log(`🌐 Public repositories accessible: ${publicRepos.length}`);

      if (privateRepos.length > 0) {
        console.log(`🎉 SUCCESS: You have access to private repositories!`);
        console.log(
          `📝 Sample private repos:`,
          privateRepos
            .slice(0, 2)
            .map((r) => r.name)
            .join(', ')
        );
      }
    } else {
      console.log(
        `❌ Cannot access organization repositories: ${orgReposResponse.statusCode} - ${orgReposResponse.error}`
      );
    }

    // 5. Check user repositories for organization
    console.log('\n👤 Checking user repositories...');
    const userReposResponse = await makeGitHubRequestWithHeaders(
      '/user/repos?per_page=100&type=all'
    );
    if (userReposResponse.data) {
      const orgUserRepos = userReposResponse.data.filter(
        (repo) => repo.owner.login === ORG_NAME
      );
      console.log(
        `📚 ${ORG_NAME} repositories accessible via /user/repos: ${orgUserRepos.length}`
      );

      if (orgUserRepos.length > 0) {
        const privateUserRepos = orgUserRepos.filter((repo) => repo.private);
        console.log(
          `🔒 Private ${ORG_NAME} repos via user endpoint: ${privateUserRepos.length}`
        );
      }
    }

    // 6. Rate limit info
    const rateLimitResponse = await makeGitHubRequestWithHeaders('/rate_limit');
    if (rateLimitResponse.data) {
      const core = rateLimitResponse.data.resources.core;
      console.log(
        `\n⏱️  Rate limit: ${core.remaining}/${core.limit} remaining`
      );
      console.log(
        `🕐 Reset time: ${new Date(core.reset * 1000).toLocaleString()}`
      );
    }

    console.log('\n=====================================');
    return orgReposResponse.data && orgReposResponse.data.length > 0;
  } catch (error) {
    console.error(`❌ Error checking permissions: ${error.message}`);
    return false;
  }
}

// Function to check token permissions
async function checkTokenPermissions() {
  try {
    console.log('🔐 Checking token permissions...');

    // Check basic user info
    const user = await makeGitHubRequest('/user');
    if (user) {
      console.log(`👤 Authenticated as: ${user.login}`);
    }

    // Try to get user's repositories from the organization
    console.log(
      '🔍 Checking access to organization repositories via /user/repos...'
    );
    const userRepos = await makeGitHubRequest(
      `/user/repos?per_page=5&type=all`
    );
    if (userRepos && userRepos.length > 0) {
      const orgRepos = userRepos.filter(
        (repo) => repo.owner.login === ORG_NAME
      );
      console.log(
        `📚 Found ${orgRepos.length} ${ORG_NAME} repositories via /user/repos`
      );
      if (orgRepos.length > 0) {
        console.log(
          '✅ Token can access organization repositories via user endpoint'
        );
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`❌ Error checking permissions: ${error.message}`);
    return false;
  }
}

// Function to get all repositories using user endpoint
async function getAllRepos() {
  console.log('🔍 Fetching all Simpplr repositories...');

  // Check permissions first with comprehensive analysis
  const hasAccess = await checkComprehensivePermissions();
  if (!hasAccess) {
    console.log(
      '⚠️  Limited access detected. Proceeding with available repositories...'
    );
  }

  let allRepos = [];
  let page = 1;
  const perPage = 100;

  console.log('📡 Trying organization endpoint directly...');

  while (true) {
    try {
      // Try organization endpoint directly
      const url = `/orgs/${ORG_NAME}/repos?page=${page}&per_page=${perPage}&type=all`;
      console.log(`🌐 Making request to: https://api.github.com${url}`);

      const repos = await makeGitHubRequest(url);

      // Debug: Check if we're getting any private repos
      if (repos && repos.length > 0) {
        const privateCount = repos.filter((repo) => repo.private).length;
        const publicCount = repos.filter((repo) => !repo.private).length;
        console.log(
          `🔒 Private repos on this page: ${privateCount}, Public: ${publicCount}`
        );
      }

      if (!repos || repos.length === 0) {
        console.log('🏁 No more repositories found, stopping pagination');
        break;
      }

      allRepos = allRepos.concat(repos);
      console.log(`📊 Total Simpplr repositories so far: ${allRepos.length}`);

      if (repos.length < perPage) {
        break; // Last page
      }

      page += 1;
    } catch (error) {
      console.error(`❌ Error fetching repositories: ${error.message}`);
      process.exit(1);
    }
  }

  return allRepos;
}

// Function to check athena-ui version in a repository
async function checkAthenaUIVersion(repoName) {
  try {
    const packageJson = await makeGitHubRequest(
      `/repos/${ORG_NAME}/${repoName}/contents/package.json`
    );

    if (!packageJson || !packageJson.content) {
      return null;
    }

    // Decode base64 content
    const content = Buffer.from(packageJson.content, 'base64').toString(
      'utf-8'
    );
    const pkg = JSON.parse(content);

    // Check dependencies, devDependencies, and peerDependencies
    const athenaVersion =
      pkg.dependencies?.['@simpplr/athena-ui'] ||
      pkg.devDependencies?.['@simpplr/athena-ui'] ||
      pkg.peerDependencies?.['@simpplr/athena-ui'];

    return athenaVersion || null;
  } catch (error) {
    if (error.message.includes('404')) {
      return null; // No package.json found
    }
    throw error;
  }
}

// Main function
async function main() {
  console.log('🏛️  Simpplr Athena UI Version Checker');
  console.log('====================================\n');

  try {
    // Get all repositories
    const repos = await getAllRepos();
    console.log(`📋 Found ${repos.length} repositories\n`);

    console.log('📦 Checking athena-ui versions...');
    console.log('==================================\n');

    const results = [];
    const versionCounts = {};

    // Process repositories in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);

      const batchPromises = batch.map(async (repo) => {
        const repoName = repo.name;

        try {
          const version = await checkAthenaUIVersion(repoName);

          // Show individual repo check result with URL and tick/cross
          let indicator,
            colorStart,
            colorEnd = '\x1b[0m';
          if (!version) {
            indicator = '✗';
            colorStart = '\x1b[31m'; // Red
          } else {
            // Extract major version number (assume semver, strip ^, ~, etc.)
            const match = version.match(/\d+/);
            const major = match ? parseInt(match[0], 10) : 0;
            if (major >= 31) {
              indicator = '✓';
              colorStart = '\x1b[32m'; // Green
            } else {
              indicator = '✓';
              colorStart = '\x1b[33m'; // Yellow
            }
          }
          const versionInfo = version ? ` (${version})` : '';
          console.log(
            `${colorStart}${indicator} ${repo.html_url}${versionInfo}${colorEnd}`
          );

          if (version) {
            results.push({
              name: repoName,
              version,
              url: repo.html_url,
            });

            versionCounts[version] = (versionCounts[version] || 0) + 1;
          }

          return { name: repoName, version };
        } catch (error) {
          console.error(`❌ Error checking ${repoName}: ${error.message}`);
          console.error(`   ${repo.html_url}`);
          return { name: repoName, version: null, error: error.message };
        }
      });

      await Promise.all(batchPromises);

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < repos.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log('\n\n📊 Results Summary');
    console.log('==================');
    console.log(`Total repositories: ${repos.length}`);
    console.log(`Repositories with athena-ui: ${results.length}`);
    console.log(
      `Repositories without athena-ui: ${repos.length - results.length}\n`
    );

    if (results.length > 0) {
      console.log('📋 Repositories with athena-ui:');
      console.log('===============================');

      // Sort by version, then by name
      results.sort((a, b) => {
        if (a.version !== b.version) {
          return a.version.localeCompare(b.version);
        }
        return a.name.localeCompare(b.name);
      });

      results.forEach((repo) => {
        console.log(`• ${repo.name}: ${repo.version}`);
        console.log(`  ${repo.url}`);
      });

      console.log('\n📈 Version Distribution:');
      console.log('========================');
      Object.entries(versionCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([version, count]) => {
          console.log(`${version}:\t\t${count}`);
        });

      // Add summary for < 31 and >= 31
      let lessThan31 = 0;
      let greaterOrEqual31 = 0;
      results.forEach((repo) => {
        if (repo.version) {
          const match = repo.version.match(/\d+/);
          const major = match ? parseInt(match[0], 10) : 0;
          if (major >= 31) {
            greaterOrEqual31++;
          } else {
            lessThan31++;
          }
        }
      });
      console.log(`\nSummary:`);
      console.log(`Repos with athena-ui version < 31: ${lessThan31}`);
      console.log(`Repos with athena-ui version >= 31: ${greaterOrEqual31}`);

      // Save results to JSON file
      const outputFile = 'athena-ui-versions.json';
      fs.writeFileSync(
        outputFile,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            summary: {
              totalRepos: repos.length,
              reposWithAthenaUI: results.length,
              versionCounts: versionCounts,
            },
            repositories: results,
          },
          null,
          2
        )
      );

      // Generate HTML report
      const htmlFile = 'athena-ui-versions.html';
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Athena UI Versions Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; background: #f9f9f9; color: #222; }
    h1, h2, h3 { color: #2c3e50; }
    .summary, .distribution { margin-bottom: 2rem; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f4f4f4; }
    tr:nth-child(even) { background: #f9f9f9; }
    .ok { color: #27ae60; font-weight: bold; }
    .warn { color: #f39c12; font-weight: bold; }
    .fail { color: #c0392b; font-weight: bold; }
    .version-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.95em; }
    .version-green { background: #eafaf1; color: #27ae60; }
    .version-yellow { background: #fffbe6; color: #f39c12; }
    .version-red { background: #fdecea; color: #c0392b; }
  </style>
</head>
<body>
  <h1>Athena UI Versions Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <ul>
      <li><strong>Total repositories:</strong> ${repos.length}</li>
      <li><strong>Repositories with athena-ui:</strong> ${results.length}</li>
      <li><strong>Repositories without athena-ui:</strong> ${repos.length - results.length}</li>
      <li><strong>Repos with athena-ui version &lt; 31:</strong> ${lessThan31}</li>
      <li><strong>Repos with athena-ui version &gt;= 31:</strong> ${greaterOrEqual31}</li>
    </ul>
  </div>
  <div class="distribution">
    <h2>Version Distribution</h2>
    <table>
      <thead><tr><th>Version</th><th>Count</th></tr></thead>
      <tbody>
        ${Object.entries(versionCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(
            ([version, count]) =>
              `<tr><td>${version}</td><td>${count}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <div class="repos">
    <h2>Repositories with athena-ui</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Version</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        ${results
          .map((repo) => {
            const match = repo.version.match(/\d+/);
            const major = match ? parseInt(match[0], 10) : 0;
            let badgeClass = 'version-red';
            if (major >= 31) badgeClass = 'version-green';
            else if (major > 0) badgeClass = 'version-yellow';
            return `<tr>
              <td>${repo.name}</td>
              <td><span class="version-badge ${badgeClass}">${repo.version}</span></td>
              <td><a href="${repo.url}" target="_blank">${repo.url}</a></td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>
  <div class="repos-no-athena">
    <h2>Repositories without athena-ui</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        ${repos
          .filter((repo) => !results.find((r) => r.name === repo.name))
          .map(
            (repo) =>
              `<tr>
              <td>${repo.name}</td>
              <td><a href="${repo.html_url}" target="_blank">${repo.html_url}</a></td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <footer style="margin-top:2rem;font-size:0.9em;color:#888;">
    Generated at ${new Date().toLocaleString()}
  </footer>
</body>
</html>`;
      fs.writeFileSync(htmlFile, html);
      console.log(`\n💾 HTML report saved to ${htmlFile}`);
    } else {
      console.log('No repositories found with athena-ui dependency.');
    }
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
});
