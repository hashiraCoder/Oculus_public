# Oculus CLI

Command line interface for [Oculus Security Scanning](https://github.com/oculus-security/oculus). Trigger scans, evaluate security gates, triage findings, and integrate Oculus into CI/CD pipelines — all from your terminal.

---

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [oculus auth](#oculus-auth)
  - [oculus scan](#oculus-scan)
  - [oculus findings](#oculus-findings)
  - [oculus repo](#oculus-repo)
  - [oculus config](#oculus-config)
- [Configuration](#configuration)
- [Exit Codes](#exit-codes)
- [CI/CD Integration](#cicd-integration)
- [VS Code Integration](#vs-code-integration)
- [Environment Variables](#environment-variables)

---

## Installation

> **Requires Node.js ≥ 18.0.0**

### From source (current method)

```bash
# Clone the Oculus repository
git clone https://github.com/oculus-security/oculus.git

# Install CLI dependencies
cd oculus/cli && npm install

# Register the binary globally via npm link
npm link

# Verify
oculus --version
```

### Via npm (once published)

```bash
npm install -g @oculus/cli
```

---

## Authentication

Generate a developer token from **Oculus UI → Settings → Developer Tokens**.

```bash
# Save token and verify against the backend
oculus auth login --token ocx_live_...

# Check current auth status
oculus auth status

# Remove stored credentials (attempts server-side revocation)
oculus auth logout
```

> **Security:** The token is stored at `~/.oculus/config.json` with `0600` permissions (owner read/write only). On Windows, protect this file manually.

---

## Quick Start

```bash
# 1. Authenticate
oculus auth login --token ocx_live_...

# 2. Set your workspace (find the ID in Oculus UI → Settings)
oculus config set workspace <workspace-id>

# 3. List your repositories to find the ID
oculus repo list

# 4. Trigger a scan and wait for the security gate result
oculus scan --repository <repo-id> --branch main --wait

# Exit 0 = gate passed  |  Exit 1 = gate failed or error
```

---

## Commands

### `oculus auth`

```
oculus auth login   --token <token> [--api-url <url>] [--no-verify]
oculus auth status  [--json]
oculus auth logout
```

| Subcommand | Description |
|---|---|
| `login` | Save a developer token. Verifies it against the backend by default. |
| `status` | Print current authentication state and accessible workspaces. |
| `logout` | Remove stored token locally and attempt server-side revocation. |

**`login` flags:**

| Flag | Description |
|---|---|
| `-t, --token <token>` | Developer token **(required)** |
| `--api-url <url>` | Override the backend URL for this session |
| `--no-verify` | Skip online verification (save token without calling the API) |

---

### `oculus scan`

```
oculus scan -r <repoId> -b <branch> [options]
```

Triggers a security scan. With `--wait`, blocks until the scan completes and exits with the gate result.

| Flag | Description | Default |
|---|---|---|
| `-r, --repository <id>` | Repository ID **(required)** | — |
| `-b, --branch <name>` | Branch to scan **(required)** | — |
| `-c, --commit <sha>` | Specific commit SHA | latest |
| `-w, --wait` | Wait for completion and exit with gate code | false |
| `--poll-interval <s>` | Seconds between gate polls (min 1) | `5` |
| `--timeout <s>` | Max seconds to wait before aborting | `300` |
| `--verbose` | Show detailed status during polling | false |
| `--json` | Emit final result as JSON (suppresses prose output) | false |
| `--token <token>` | Override auth token for this command | — |
| `--api-url <url>` | Override backend URL for this command | — |

**JSON output shape (with `--wait --json`):**

```json
{
  "scanId": "uuid",
  "status": "COMPLETED",
  "gate": {
    "status": "PASSED",
    "passed": true,
    "reason": "No critical findings"
  }
}
```

**`Ctrl+C` behaviour:** If you interrupt a waiting scan, the CLI prints the Scan ID (so you can track it manually) and exits `130`. The scan continues running on the backend.

---

### `oculus findings`

```
oculus findings list   [options]
oculus findings update <findingId> -s <status> [options]
```

#### `findings list`

| Flag | Description | Default |
|---|---|---|
| `-w, --workspace <id>` | Workspace ID | `OCULUS_WORKSPACE_ID` |
| `-r, --repository <id>` | Filter by repository | — |
| `-s, --severity <levels...>` | `CRITICAL` `HIGH` `MEDIUM` `LOW` | all |
| `--status <status...>` | `OPEN` `CONFIRMED` `FALSE_POSITIVE` `FIXED` `IGNORED` | all |
| `-l, --limit <n>` | Max results | `20` |
| `--json` | Emit as JSON | false |

**JSON output shape:**

```json
{
  "workspaceId": "uuid",
  "total": 3,
  "items": [ { "id": "...", "severity": "CRITICAL", "status": "OPEN", ... } ]
}
```

#### `findings update`

```bash
oculus findings update <findingId> --status FALSE_POSITIVE --comment "Reviewed — test data only"
```

| Flag | Description |
|---|---|
| `-s, --status <status>` | New status **(required)**: `OPEN` `CONFIRMED` `FALSE_POSITIVE` `FIXED` `IGNORED` |
| `-w, --workspace <id>` | Workspace ID |
| `-c, --comment <text>` | Audit trail comment |
| `--json` | Emit result as JSON |

---

### `oculus repo`

```
oculus repo list [options]
```

| Flag | Description | Default |
|---|---|---|
| `-w, --workspace <id>` | Workspace ID | `OCULUS_WORKSPACE_ID` |
| `-l, --limit <n>` | Max results | `20` |
| `--json` | Emit as JSON | false |

**JSON output shape:**

```json
{
  "workspaceId": "uuid",
  "total": 2,
  "items": [ { "id": "...", "full_name": "org/repo", "current_risk_grade": "B", ... } ]
}
```

---

### `oculus config`

Manages persistent CLI configuration stored at `~/.oculus/config.json`.

```bash
oculus config set workspace <workspace-id>
oculus config set api-url   https://oculus.yourcompany.com/api/v1

oculus config get            # show all
oculus config get workspace  # show one key

oculus config path           # print config file path
```

Standard keys: `token`, `api-url`, `workspace`.

---

## Configuration

The CLI resolves each setting using the following priority (highest → lowest):

```
explicit CLI flag  >  environment variable  >  ~/.oculus/config.json  >  hardcoded default
```

| Setting | CLI Flag | Env Var | Config Key | Default |
|---|---|---|---|---|
| Auth token | `--token` | `OCULUS_TOKEN` | `token` | — (exits with error) |
| API URL | `--api-url` | `OCULUS_API_URL` | `api-url` | `http://localhost:3000/api/v1` |
| Workspace ID | `--workspace` | `OCULUS_WORKSPACE_ID` | `workspace` | — (exits with error) |

### Config file

```
~/.oculus/config.json
```

```json
{
  "token": "ocx_live_...",
  "api-url": "https://oculus.yourcompany.com/api/v1",
  "workspace": "uuid"
}
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Command succeeded; or security gate **PASSED** |
| `1` | Error, API failure, gate **FAILED**, scan timed out/cancelled |
| `130` | Interrupted by `Ctrl+C` (SIGINT) during `--wait` polling |

---

## CI/CD Integration

### GitHub Actions

Copy [`ci/github-action.yml`](./ci/github-action.yml) into `.github/workflows/` in your application repository.

**Required secrets** (Settings → Secrets and variables → Actions):

| Name | Value |
|---|---|
| `OCULUS_TOKEN` | Developer token (`ocx_live_...`) |

**Required variables** (Settings → Secrets and variables → Variables):

| Name | Value |
|---|---|
| `OCULUS_API_URL` | `https://oculus.yourcompany.com/api/v1` |
| `OCULUS_WORKSPACE_ID` | Workspace UUID |
| `OCULUS_REPO_ID` | Repository UUID registered in Oculus |

### GitLab CI

```yaml
oculus-security-scan:
  image: node:20
  stage: test
  script:
    - cd $CI_PROJECT_DIR && git clone <oculus-repo> _oculus && cd _oculus/cli && npm ci
    - node _oculus/cli/bin/oculus.js scan
        --repository $OCULUS_REPO_ID
        --branch     $CI_COMMIT_REF_NAME
        --commit     $CI_COMMIT_SHA
        --wait
        --timeout    600
        --json
  variables:
    OCULUS_TOKEN:        $OCULUS_TOKEN
    OCULUS_API_URL:      $OCULUS_API_URL
    OCULUS_WORKSPACE_ID: $OCULUS_WORKSPACE_ID
```

### Parsing JSON output in shell scripts

```bash
RESULT=$(oculus scan -r $REPO_ID -b main --wait --json)
GATE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['gate']['status'])")
echo "Gate: $GATE"
```

### Suppress colour in CI

Set `NO_COLOR=1` or `CI=true` — the CLI detects both and strips ANSI codes automatically.

---

## VS Code Integration

Open **Command Palette** (`Ctrl+Shift+P`) → **Tasks: Run Task** to access:

- `Oculus: Trigger Scan (Wait for gate)`
- `Oculus: Trigger Scan (Queue and exit)`
- `Oculus: List CRITICAL findings (JSON)`
- `Oculus: Auth status`
- `Oculus: List repositories`

Tasks are defined in [`.vscode/tasks.json`](../.vscode/tasks.json). No extension required.

---

## Environment Variables

See [`.env.example`](./.env.example) for a copy-paste template.

| Variable | Description |
|---|---|
| `OCULUS_TOKEN` | Developer token — bypasses stored config |
| `OCULUS_API_URL` | Backend API base URL including `/api/v1` |
| `OCULUS_WORKSPACE_ID` | Default workspace for all commands |
| `NO_COLOR` | Set to any value to disable ANSI colours ([no-color.org](https://no-color.org/)) |
| `CI` | Set to `true` to suppress interactive-only output (e.g. security notices) |
