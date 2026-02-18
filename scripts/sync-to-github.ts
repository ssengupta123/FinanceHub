import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
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

async function main() {
  const description = process.argv[2] || 'general-sync';
  const commitMessage = process.argv[3] || `Sync: ${description}`;

  try {
    const ghPat = process.env.GITHUB_PAT;
    let octokit: Octokit;
    if (ghPat) {
      octokit = new Octokit({ auth: ghPat });
      console.log('Using GITHUB_PAT for authentication (supports workflow file updates).');
    } else {
      octokit = await getUncachableGitHubClient();
      console.log('Using GitHub connector token.');
    }
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);

    const repoName = 'FinanceHub';
    let repoExists = false;

    try {
      await octokit.repos.get({ owner: user.login, repo: repoName });
      repoExists = true;
      console.log(`Repository ${user.login}/${repoName} already exists.`);
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
      ...(mainSha ? { base_tree: undefined } : {}),
    });

    const branchName = generateBranchName(description);
    console.log(`Branch: ${branchName}`);
    console.log(`Commit message: ${commitMessage}`);

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

    console.log(`Creating branch ${branchName}...`);
    try {
      await octokit.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: commit.sha,
      });
      console.log(`Branch created: ${branchName}`);
    } catch (branchErr: any) {
      console.error(`Failed to create branch: ${branchErr.message}`);
    }

    console.log('Updating main branch...');
    try {
      await octokit.git.updateRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main',
        sha: commit.sha,
        force: true,
      });
    } catch {
      await octokit.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
    }

    console.log(`\nDone! Code synced to: https://github.com/${user.login}/${repoName}`);
    console.log(`Branch: ${branchName}`);
    console.log(`Commit: ${commit.sha.slice(0, 7)} - ${commitMessage}`);

    console.log('\nDeployment will trigger automatically from push to main.');
    console.log('The .github/workflows/ files are included in the sync, so no separate workflow push is needed.');
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
