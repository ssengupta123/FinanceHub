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
  'node_modules', '.git', '.github', '.cache', '.config', '.local',
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

async function main() {
  try {
    const octokit = await getUncachableGitHubClient();
    
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

    console.log('Creating tree...');
    const { data: tree } = await octokit.git.createTree({
      owner: user.login,
      repo: repoName,
      tree: blobs as any,
    });

    let parentSha: string | undefined;
    try {
      const { data: ref } = await octokit.git.getRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main',
      });
      parentSha = ref.object.sha;
    } catch {}

    console.log('Creating commit...');
    const commitData: any = {
      owner: user.login,
      repo: repoName,
      message: 'Sync FinanceHub: Auth system, enhanced pipeline/scenarios/forecasts/milestones/utilization views, admin reference data management',
      tree: tree.sha,
    };
    if (parentSha) {
      commitData.parents = [parentSha];
    }

    const { data: commit } = await octokit.git.createCommit(commitData);

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
