import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'hamhesab-db.json');
const PUBLIC_DATA_DIR = path.resolve(process.cwd(), 'public', 'data');
const PUBLIC_DB_FILE = path.join(PUBLIC_DATA_DIR, 'hamhesab-db.json');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }
}

// Helper to push or pull from GitHub Repository Contents API
async function fetchFromGitHub(owner: string, repo: string, branch: string, filePath: string, token?: string) {
  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch || 'main')}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'HamHesab-Couple-Tracker',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: string; sha?: string };
  if (!json.content) return null;
  const decoded = Buffer.from(json.content, 'base64').toString('utf-8');
  return { state: JSON.parse(decoded), sha: json.sha };
}

async function pushToGitHub(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
  stateData: unknown
) {
  const cleanPath = filePath.replace(/^\/+/, '');
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'HamHesab-Couple-Tracker',
  };

  // First check if file exists to get current SHA
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch || 'main')}`, { headers });
    if (getRes.ok) {
      const getJson = (await getRes.json()) as { sha?: string };
      existingSha = getJson.sha;
    }
  } catch {
    // ignore
  }

  // Strip sensitive token before committing JSON file to GitHub!
  const sanitizedState = JSON.parse(JSON.stringify(stateData));
  if (sanitizedState?.settings?.githubSync) {
    delete sanitizedState.settings.githubSync.token;
  }

  const contentBase64 = Buffer.from(JSON.stringify(sanitizedState, null, 2), 'utf-8').toString('base64');

  const putRes = await fetch(baseUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `همگام‌سازی خودکار هم‌حساب (${new Date().toISOString()})`,
      content: contentBase64,
      branch: branch || 'main',
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });

  return putRes.ok;
}

// GET /api/sync - Returns latest synced state for Hootan & Fatemeh automatically (no token needed by client)
app.get('/api/sync', async (_req, res) => {
  try {
    ensureDirs();
    let localState: any = null;
    if (fs.existsSync(LOCAL_DB_FILE)) {
      localState = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
    }

    const ghOwner = process.env.GITHUB_REPO_OWNER || localState?.settings?.githubSync?.repoOwner;
    const ghRepo = process.env.GITHUB_REPO_NAME || localState?.settings?.githubSync?.repoName;
    const ghBranch = process.env.GITHUB_BRANCH || localState?.settings?.githubSync?.branch || 'main';
    const ghPath = process.env.GITHUB_FILE_PATH || localState?.settings?.githubSync?.filePath || 'data/hamhesab-db.json';
    const ghToken = process.env.GITHUB_TOKEN || localState?.settings?.githubSync?.token;

    if (ghOwner && ghRepo) {
      try {
        const remote = await fetchFromGitHub(ghOwner, ghRepo, ghBranch, ghPath, ghToken);
        if (remote && remote.state) {
          const remoteUpdated = remote.state.updatedAt || 0;
          const localUpdated = localState?.updatedAt || 0;
          if (!localState || remoteUpdated > localUpdated) {
            localState = remote.state;
            fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localState, null, 2), 'utf-8');
            fs.writeFileSync(PUBLIC_DB_FILE, JSON.stringify(localState, null, 2), 'utf-8');
          }
        }
      } catch {
        // fallback to local file
      }
    }

    if (!localState) {
      return res.json({ status: 'empty', state: null });
    }

    // Never leak server token to client
    const safeState = JSON.parse(JSON.stringify(localState));
    if (safeState?.settings?.githubSync?.token) {
      safeState.settings.githubSync.token = '';
    }

    return res.json({
      status: 'ok',
      state: safeState,
      githubConnected: Boolean(ghOwner && ghRepo),
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: String(err) });
  }
});

// POST /api/sync - Saves state locally AND automatically commits to GitHub if configured
app.post('/api/sync', async (req, res) => {
  try {
    ensureDirs();
    const incomingState = req.body?.state;
    if (!incomingState || !Array.isArray(incomingState.transactions)) {
      return res.status(400).json({ status: 'error', message: 'Invalid state payload' });
    }

    // Preserve any existing token saved on server if client sent empty token (e.g. Fatemeh's phone)
    let existingServerToken = process.env.GITHUB_TOKEN || '';
    let existingOwner = process.env.GITHUB_REPO_OWNER || '';
    let existingRepo = process.env.GITHUB_REPO_NAME || '';

    if (fs.existsSync(LOCAL_DB_FILE)) {
      try {
        const prev = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
        if (!existingServerToken && prev?.settings?.githubSync?.token) {
          existingServerToken = prev.settings.githubSync.token;
        }
        if (!existingOwner && prev?.settings?.githubSync?.repoOwner) {
          existingOwner = prev.settings.githubSync.repoOwner;
        }
        if (!existingRepo && prev?.settings?.githubSync?.repoName) {
          existingRepo = prev.settings.githubSync.repoName;
        }
      } catch {
        // ignore
      }
    }

    const updatedState = {
      ...incomingState,
      updatedAt: incomingState.updatedAt || Date.now(),
    };

    const syncCfg = updatedState.settings?.githubSync || {};
    const finalToken = syncCfg.token || existingServerToken;
    const finalOwner = syncCfg.repoOwner || existingOwner;
    const finalRepo = syncCfg.repoName || existingRepo;
    const finalBranch = syncCfg.branch || 'main';
    const finalPath = syncCfg.filePath || 'data/hamhesab-db.json';

    if (updatedState.settings?.githubSync) {
      updatedState.settings.githubSync.token = finalToken;
      updatedState.settings.githubSync.repoOwner = finalOwner;
      updatedState.settings.githubSync.repoName = finalRepo;
    }

    // Save locally on server
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(updatedState, null, 2), 'utf-8');

    // Also save sanitized copy in public/data/hamhesab-db.json for static hosting / GitHub Pages
    const publicCopy = JSON.parse(JSON.stringify(updatedState));
    if (publicCopy?.settings?.githubSync) {
      delete publicCopy.settings.githubSync.token;
    }
    fs.writeFileSync(PUBLIC_DB_FILE, JSON.stringify(publicCopy, null, 2), 'utf-8');

    // Automatically push to GitHub in background if credentials exist
    let pushedToGitHub = false;
    if (finalOwner && finalRepo && finalToken && syncCfg.enabled !== false) {
      try {
        pushedToGitHub = await pushToGitHub(
          finalOwner,
          finalRepo,
          finalBranch,
          finalPath,
          finalToken,
          updatedState
        );
      } catch {
        pushedToGitHub = false;
      }
    }

    return res.json({
      status: 'ok',
      pushedToGitHub,
      updatedAt: updatedState.updatedAt,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: String(err) });
  }
});

async function startServer() {
  ensureDirs();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HamHesab Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
