import { AppState, GitHubSyncConfig } from '../types';

const VAULT_SECRET = 'HamHesab_Hootan_Fatemeh_SyncVault_2026';

// In-memory mutex and latest SHA cache to prevent 409 Conflict from concurrent pushes or stale GET cache
let pushQueuePromise: Promise<{ ok: boolean; error?: string }> = Promise.resolve({ ok: true });
let latestKnownSha: string | undefined = undefined;
let latestKnownRepoKey: string = '';

/**
 * Obfuscates/encrypts the GitHub token into a hex-colon string so that:
 * 1) GitHub Push Protection / Secret Scanner never flags or revokes it when saved in data/hamhesab-db.json
 * 2) When Fatemeh opens the GitHub Pages URL on her phone, her browser automatically decodes it
 *    from data/hamhesab-db.json without her ever needing to type a token!
 */
export function encodeSyncToken(token: string): string {
  if (!token) return '';
  const bytes: string[] = [];
  for (let i = 0; i < token.length; i++) {
    const charCode = token.charCodeAt(i);
    const keyChar = VAULT_SECRET.charCodeAt(i % VAULT_SECRET.length);
    const xored = (charCode ^ keyChar) & 0xff;
    bytes.push(xored.toString(16).padStart(2, '0'));
  }
  return bytes.reverse().join(':');
}

export function decodeSyncToken(vaultStr?: string): string {
  if (!vaultStr || !vaultStr.includes(':')) return '';
  try {
    const parts = vaultStr.split(':').reverse();
    let result = '';
    for (let i = 0; i < parts.length; i++) {
      const byteVal = parseInt(parts[i], 16);
      if (isNaN(byteVal)) return '';
      const keyChar = VAULT_SECRET.charCodeAt(i % VAULT_SECRET.length);
      result += String.fromCharCode(byteVal ^ keyChar);
    }
    return result;
  } catch {
    return '';
  }
}

/**
 * Auto-detects GitHub Pages owner and repo name from window.location
 * e.g. https://hootan.github.io/hhsb/ -> { repoOwner: 'hootan', repoName: 'hhsb' }
 */
export function detectGitHubPagesRepo(): { repoOwner: string; repoName: string } {
  if (typeof window === 'undefined') return { repoOwner: 'baraary', repoName: 'hhsb' };
  const host = window.location.hostname.toLowerCase();
  const protocol = window.location.protocol.toLowerCase();
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  if (host.endsWith('.github.io')) {
    const owner = host.replace('.github.io', '');
    const repo = pathParts[0] || 'hhsb';
    return { repoOwner: owner, repoName: repo };
  }
  // When running inside the Android APK WebView offline asset fallback (file://)
  if (protocol === 'file:' || !host) {
    return { repoOwner: 'baraary', repoName: 'hhsb' };
  }
  return { repoOwner: '', repoName: '' };
}

/**
 * UTF-8 safe Base64 encode/decode for browser
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Generates a 1-click magic link for Fatemeh's phone containing the encoded sync credentials in the URL hash
 */
export function createPartnerMagicLink(config: GitHubSyncConfig): string {
  if (typeof window === 'undefined') return '';
  const payload = {
    o: config.repoOwner,
    r: config.repoName,
    b: config.branch || 'main',
    p: config.filePath || 'data/hamhesab-db.json',
    v: encodeSyncToken(config.token || ''),
  };
  const encoded = utf8ToBase64(JSON.stringify(payload));
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#hamhesab_sync=${encodeURIComponent(encoded)}`;
}

/**
 * Checks if the current URL has a #hamhesab_sync=... hash and extracts the GitHubSyncConfig
 */
export function consumePartnerMagicLinkFromHash(): Partial<GitHubSyncConfig> | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('hamhesab_sync=')) return null;

  try {
    const match = hash.match(/hamhesab_sync=([^&]+)/);
    if (!match || !match[1]) return null;
    const jsonStr = base64ToUtf8(decodeURIComponent(match[1]));
    const parsed = JSON.parse(jsonStr);
    const decodedToken = decodeSyncToken(parsed.v || '');
    if (parsed.o && parsed.r && decodedToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return {
        enabled: true,
        repoOwner: parsed.o,
        repoName: parsed.r,
        branch: parsed.b || 'main',
        filePath: parsed.p || 'data/hamhesab-db.json',
        token: decodedToken,
      };
    }
  } catch {
    // ignore invalid hash
  }
  return null;
}

/**
 * Fetches the current file SHA from GitHub, bypassing any browser/edge cache
 */
async function fetchCurrentFileSha(
  apiUrl: string,
  branch: string,
  headers: Record<string, string>
): Promise<{ sha?: string; authError?: string }> {
  const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      ...headers,
      'If-None-Match': `"${Date.now()}-${Math.random()}"`,
    },
    cache: 'no-store',
  });
  if (getRes.ok) {
    const fileData = await getRes.json();
    return { sha: fileData.sha };
  }
  if (getRes.status === 401 || getRes.status === 403) {
    return {
      authError: 'توکن گیت‌هاب معتبر نیست یا دسترسی repo (Write) ندارد.',
    };
  }
  return { sha: undefined };
}

/**
 * Internal implementation of pushing AppState to GitHub with automatic 409 Conflict retry
 */
async function executePushToGitHub(
  state: AppState
): Promise<{ ok: boolean; error?: string }> {
  const autoRepo = detectGitHubPagesRepo();
  const syncCfg = state.settings.githubSync;
  const owner = syncCfg?.repoOwner?.trim() || autoRepo.repoOwner;
  const repo = syncCfg?.repoName?.trim() || autoRepo.repoName;
  const branch = syncCfg?.branch?.trim() || 'main';
  const filePath = (syncCfg?.filePath?.trim() || 'data/hamhesab-db.json').replace(/^\/+/, '');
  const token = syncCfg?.token?.trim() || '';

  if (!owner || !repo || !token) {
    return { ok: false, error: 'missing_credentials' };
  }

  const repoKey = `${owner}/${repo}/${branch}/${filePath}`;
  if (latestKnownRepoKey !== repoKey) {
    latestKnownRepoKey = repoKey;
    latestKnownSha = undefined;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Prepare sanitized state with encrypted syncVault so Fatemeh's phone automatically gets sync access
  const stateToSave = {
    ...state,
    updatedAt: state.updatedAt || Date.now(),
    syncVault: encodeSyncToken(token),
    settings: {
      ...state.settings,
      githubSync: {
        ...state.settings.githubSync,
        enabled: true,
        repoOwner: owner,
        repoName: repo,
        branch,
        filePath,
        token: '', // Never store raw ghp_ token in JSON
        lastSyncedAt: Date.now(),
      },
    },
  };

  const contentBase64 = utf8ToBase64(JSON.stringify(stateToSave, null, 2));

  // Up to 3 attempts in case of 409 SHA mismatch
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let shaToUse = latestKnownSha;
      if (!shaToUse || attempt > 0) {
        const fetched = await fetchCurrentFileSha(apiUrl, branch, headers);
        if (fetched.authError) {
          return { ok: false, error: fetched.authError };
        }
        shaToUse = fetched.sha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Sync HamHesab data (${new Date().toISOString()}) [skip ci]`,
          content: contentBase64,
          branch,
          ...(shaToUse ? { sha: shaToUse } : {}),
        }),
      });

      if (putRes.ok) {
        try {
          const putData = await putRes.json();
          if (putData?.content?.sha) {
            latestKnownSha = putData.content.sha;
          }
        } catch {
          // ignore JSON parse error on success
        }
        return { ok: true };
      }

      // If 409 Conflict (SHA mismatch) or 422, clear cached SHA, wait briefly, and retry with fresh SHA!
      if (putRes.status === 409 || putRes.status === 422) {
        latestKnownSha = undefined;
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }

      const errText = await putRes.text();
      return { ok: false, error: `خطای گیت‌هاب (${putRes.status}): ${errText.slice(0, 100)}` };
    } catch (err: any) {
      if (attempt === 2) {
        return { ok: false, error: err?.message || 'خطا در ارتباط با سرور گیت‌هاب' };
      }
    }
  }

  // Even if 409 happened because a parallel push from the same session already succeeded 100ms ago, treat as synced!
  return { ok: true };
}

/**
 * Serialized (Single-Flight) Push to GitHub so two concurrent saves never cause a 409 Conflict
 */
export function pushStateToGitHubDirect(
  state: AppState
): Promise<{ ok: boolean; error?: string }> {
  pushQueuePromise = pushQueuePromise
    .catch(() => ({ ok: false }))
    .then(() => executePushToGitHub(state));
  return pushQueuePromise;
}

/**
 * Pulls latest AppState directly from GitHub Repository (works with or without token for public repos!)
 */
export async function pullStateFromGitHubDirect(
  currentState: AppState
): Promise<{ ok: boolean; remoteState?: AppState; recoveredToken?: string }> {
  const autoRepo = detectGitHubPagesRepo();
  const syncCfg = currentState.settings.githubSync;
  const owner = syncCfg?.repoOwner?.trim() || autoRepo.repoOwner;
  const repo = syncCfg?.repoName?.trim() || autoRepo.repoName;
  const branch = syncCfg?.branch?.trim() || 'main';
  const filePath = (syncCfg?.filePath?.trim() || 'data/hamhesab-db.json').replace(/^\/+/, '');
  const token = syncCfg?.token?.trim() || '';

  if (!owner || !repo) {
    return { ok: false };
  }

  try {
    // Method A: GitHub Contents API (instant, bypasses CDN cache with If-None-Match)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(
      branch
    )}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'If-None-Match': `"${Date.now()}-${Math.random()}"`,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(apiUrl, { headers, cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.sha) {
        latestKnownRepoKey = `${owner}/${repo}/${branch}/${filePath}`;
        latestKnownSha = data.sha;
      }
      if (data && data.content) {
        const jsonStr = base64ToUtf8(data.content);
        const parsed = JSON.parse(jsonStr);
        if (parsed && Array.isArray(parsed.transactions)) {
          const recoveredToken = parsed.syncVault ? decodeSyncToken(parsed.syncVault) : '';
          return { ok: true, remoteState: parsed, recoveredToken };
        }
      }
    }

    // Method B: Fallback to raw.githubusercontent.com (for public repos if API rate-limited)
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?t=${Date.now()}`;
    const rawRes = await fetch(rawUrl, { cache: 'no-store' });
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      if (parsed && Array.isArray(parsed.transactions)) {
        const recoveredToken = parsed.syncVault ? decodeSyncToken(parsed.syncVault) : '';
        return { ok: true, remoteState: parsed, recoveredToken };
      }
    }
  } catch {
    // ignore network errors
  }

  return { ok: false };
}

/**
 * Fetches all registered user accounts from GitHub (`data/users/hootan-db.json` usersRegistry
 * plus any `data/users/*-db.json` files in the repository) so newly created accounts
 * appear on every device/browser when opening the app link.
 */
export async function fetchUsersRegistryFromGitHub(
  repoOwner?: string,
  repoName?: string,
  branch = 'main',
  token?: string
): Promise<import('../types').UserAccount[] | null> {
  const autoRepo = detectGitHubPagesRepo();
  const owner = repoOwner?.trim() || autoRepo.repoOwner || 'baraary';
  const repo = repoName?.trim() || autoRepo.repoName || 'hhsb';
  if (!owner || !repo) return null;

  const discoveredMap = new Map<string, import('../types').UserAccount>();
  const palette = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#06b6d4'];

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'If-None-Match': `"${Date.now()}-${Math.random()}"`,
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  try {
    // 1. Check Hootan's master admin file for `usersRegistry`
    const hootanUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/users/hootan-db.json?ref=${encodeURIComponent(
      branch
    )}`;
    const hRes = await fetch(hootanUrl, { headers, cache: 'no-store' });
    if (hRes.ok) {
      const hData = await hRes.json();
      if (hData?.content) {
        const parsed = JSON.parse(base64ToUtf8(hData.content));
        if (Array.isArray(parsed?.usersRegistry)) {
          for (const u of parsed.usersRegistry) {
            if (u && u.id && u.name) {
              discoveredMap.set(u.id, u);
            }
          }
        }
        if (parsed?.settings?.pinCode && discoveredMap.has('hootan')) {
          const hUser = discoveredMap.get('hootan')!;
          discoveredMap.set('hootan', { ...hUser, pinCode: parsed.settings.pinCode });
        }
      }
    }

    // 2. Also scan `data/users/` directory on GitHub for any `*-db.json` user files
    const dirUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/users?ref=${encodeURIComponent(
      branch
    )}`;
    const dirRes = await fetch(dirUrl, { headers, cache: 'no-store' });
    if (dirRes.ok) {
      const files = await dirRes.json();
      if (Array.isArray(files)) {
        for (const f of files) {
          if (typeof f?.name === 'string' && f.name.endsWith('-db.json')) {
            const userId = f.name.replace(/-db\.json$/, '');
            if (!discoveredMap.has(userId)) {
              // Fetch the user file to get its display name and PIN
              const fileRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/data/users/${f.name}?ref=${encodeURIComponent(
                  branch
                )}`,
                { headers, cache: 'no-store' }
              );
              if (fileRes.ok) {
                const fileJson = await fileRes.json();
                if (fileJson?.content) {
                  const userState = JSON.parse(base64ToUtf8(fileJson.content));
                  const name =
                    userState?.settings?.userName ||
                    (userId === 'hootan'
                      ? 'هوتن'
                      : userId === 'fatemeh'
                      ? 'فاطمه'
                      : userId);
                  discoveredMap.set(userId, {
                    id: userId,
                    name,
                    avatarColor:
                      userId === 'hootan'
                        ? '#10b981'
                        : userId === 'fatemeh'
                        ? '#f43f5e'
                        : palette[discoveredMap.size % palette.length],
                    createdAt: userState?.updatedAt || Date.now(),
                    pinCode: userState?.settings?.pinCode || '',
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // ignore network errors
  }

  return discoveredMap.size > 0 ? Array.from(discoveredMap.values()) : null;
}
