import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const WORKSPACE = '/home/runner/workspace';

const IGNORE_PATTERNS = [
  'node_modules', '.git', '.cache', '.config', '.local',
  'dist', '.replit', 'replit.nix', '.upm',
  'scripts/sync-to-github.ts',
  '.gitignore'
];

function shouldIgnore(relativePath: string): boolean {
  return IGNORE_PATTERNS.some(p => relativePath === p || relativePath.startsWith(p + '/'));
}

function getAllFiles(dir: string, base: string = ''): { path: string; fullPath: string }[] {
  const results: { path: string; fullPath: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    
    if (shouldIgnore(relativePath)) continue;
    
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      results.push({ path: relativePath, fullPath });
    }
  }
  return results;
}

function generateBranchName(description: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 16).replace(':', '');
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `feature/${date}-${time}-${slug}`;
}

function printUsage() {
  console.log(`
Usage: tsx scripts/sync-to-github.ts <description> [commit-message] [options]

Arguments:
  description      Short description for branch name (e.g. "cx-ratings-import")
  commit-message   Optional commit message (defaults to "Sync: <description>")

Options:
  --deploy         Also fast-forward main to the new commit (triggers deployment)

Examples:
  tsx scripts/sync-to-github.ts "cx-ratings-import"
    -> Creates feature/20260218-1530-cx-ratings-import branch only

  tsx scripts/sync-to-github.ts "cx-ratings-import" "Add CX ratings import" --deploy
    -> Creates feature branch AND updates main (triggers Azure deployment)
`);
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
  
  if (args.length === 0 || flags.includes('--help')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const description = args[0];
  const commitMessage = args[1] || `Sync: ${description}`;
  const shouldDeploy = flags.includes('--deploy');

  try {
    const ghPat = process.env.GITHUB_PAT;
    let octokit: Octokit;
    if (ghPat) {
      octokit = new Octokit({ auth: ghPat });
      console.log('Using GITHUB_PAT for authentication.');
    } else {
      octokit = await getUncachableGitHubClient();
      console.log('Using GitHub connector token.');
    }
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);

    const repoName = 'FinanceHub';

    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      console.log(`Repository ${user.login}/${repoName} found.`);
    } catch (e: any) {
      if (e.status === 404) {
        console.log(`Creating repository ${repoName}...`);
        await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: 'FinanceHub - Project Finance Management Application',
          private: true,
          auto_init: false,
        });
        console.log(`Repository created.`);
      } else {
        throw e;
      }
    }

    console.log('Collecting files...');
    const files = getAllFiles(WORKSPACE);
    console.log(`Found ${files.length} files to sync.`);

    const blobs: { path: string; sha: string; mode: string; type: string }[] = [];
    
    let count = 0;
    for (const file of files) {
      const content = fs.readFileSync(file.fullPath);
      const base64Content = content.toString('base64');
      
      const { data: blob } = await octokit.git.createBlob({
        owner: user.login,
        repo: repoName,
        content: base64Content,
        encoding: 'base64',
      });
      
      blobs.push({
        path: file.path,
        sha: blob.sha,
        mode: '100644',
        type: 'blob',
      });
      
      count++;
      if (count % 20 === 0) {
        console.log(`  Uploaded ${count}/${files.length} files...`);
      }
    }
    console.log(`  Uploaded ${count}/${files.length} files.`);

    let mainSha: string | undefined;
    try {
      const { data: ref } = await octokit.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main',
      });
      mainSha = ref.object.sha;
    } catch {}

    console.log('Creating tree...');
    const { data: tree } = await octokit.git.createTree({
      owner: user.login,
      repo: repoName,
      tree: blobs as any,
    });

    const branchName = generateBranchName(description);

    const commitData: any = {
      owner: user.login,
      repo: repoName,
      message: commitMessage,
      tree: tree.sha,
    };
    if (mainSha) {
      commitData.parents = [mainSha];
    }

    const { data: commit } = await octokit.git.createCommit(commitData);

    console.log(`\nCreating feature branch: ${branchName}`);
    try {
      await octokit.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: commit.sha,
      });
      console.log(`Branch created: ${branchName}`);
    } catch (branchErr: any) {
      if (branchErr.status === 422) {
        await octokit.git.updateRef({
          owner: user.login,
          repo: repoName,
          ref: `heads/${branchName}`,
          sha: commit.sha,
          force: true,
        });
        console.log(`Branch updated: ${branchName}`);
      } else {
        console.error(`Failed to create branch: ${branchErr.message}`);
      }
    }

    if (shouldDeploy) {
      console.log('\n--deploy flag set: Updating main branch...');
      try {
        await octokit.git.updateRef({
          owner: user.login,
          repo: repoName,
          ref: 'heads/main',
          sha: commit.sha,
          force: true,
        });
        console.log('Main branch updated. Deployment will trigger automatically.');
      } catch {
        await octokit.git.createRef({
          owner: user.login,
          repo: repoName,
          ref: 'refs/heads/main',
          sha: commit.sha,
        });
        console.log('Main branch created. Deployment will trigger automatically.');
      }
    } else {
      console.log('\nMain branch NOT updated (no --deploy flag).');
      console.log('To deploy, either:');
      console.log(`  1. Re-run with --deploy flag`);
      console.log(`  2. Create a PR from ${branchName} -> main on GitHub`);
    }

    console.log(`\n--- Summary ---`);
    console.log(`Repository: https://github.com/${user.login}/${repoName}`);
    console.log(`Branch:     ${branchName}`);
    console.log(`Commit:     ${commit.sha.slice(0, 7)} - ${commitMessage}`);
    console.log(`Deployed:   ${shouldDeploy ? 'Yes (main updated)' : 'No (feature branch only)'}`);
    
    if (mainSha) {
      console.log(`\nView changes: https://github.com/${user.login}/${repoName}/compare/main...${branchName}`);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
