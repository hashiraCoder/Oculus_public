export interface CliOption {
  flag: string;
  description: string;
  required?: boolean;
  defaultValue?: string;
}

export interface CliArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface CliExample {
  title: string;
  command: string;
  description?: string;
  outputPreview?: string;
}

export interface CliCommandDef {
  id: string;
  command: string;
  category: 'auth' | 'config' | 'repo' | 'findings' | 'scan' | 'system';
  summary: string;
  description: string;
  usage: string;
  arguments?: CliArgument[];
  options?: CliOption[];
  authRequired: boolean;
  outputModes: ('text' | 'json')[];
  examples: CliExample[];
  exitBehavior?: string;
}

export const CLI_COMMANDS: CliCommandDef[] = [
  // --- AUTH ---
  {
    id: 'auth-login',
    command: 'oculus auth login',
    category: 'auth',
    summary: 'Save and verify developer token credentials',
    description: 'Stores your developer token at ~/.oculus/config.json with 0600 permissions and immediately tests it against the Oculus backend API (unless --no-verify is specified).',
    usage: 'oculus auth login --token <token> [options]',
    authRequired: false,
    outputModes: ['text'],
    options: [
      {
        flag: '-t, --token <token>',
        description: 'Developer token string (standard prefix ocx_live_...)',
        required: true,
      },
      {
        flag: '--api-url <url>',
        description: 'Override the backend API base URL for this session (e.g. https://oculus.yourcompany.com/api/v1)',
        required: false,
      },
      {
        flag: '--no-verify',
        description: 'Skip online verification check against the backend during save',
        required: false,
      },
    ],
    examples: [
      {
        title: 'Authenticate with a developer token',
        command: 'oculus auth login --token ocx_live_9f8e7d6c5b4a3210',
        description: 'Saves the token and verifies access by requesting accessible workspaces.',
      },
      {
        title: 'Authenticate against custom API endpoint without online verification',
        command: 'oculus auth login --token ocx_live_... --api-url https://oculus.internal.corp/api/v1 --no-verify',
        description: 'Useful in air-gapped or pre-deployment scripting environments.',
      },
    ],
    exitBehavior: 'Exits 0 on success; exits 1 if server rejects the token (HTTP 401/403).',
  },
  {
    id: 'auth-status',
    command: 'oculus auth status',
    category: 'auth',
    summary: 'Verify current authentication state & accessible workspaces',
    description: 'Validates current stored token or OCULUS_TOKEN against the server and prints accessible workspaces with their UUIDs.',
    usage: 'oculus auth status [options]',
    authRequired: true,
    outputModes: ['text', 'json'],
    options: [
      {
        flag: '--json',
        description: 'Emit status and accessible workspaces as a clean JSON payload',
        required: false,
      },
    ],
    examples: [
      {
        title: 'Check auth status (Terminal)',
        command: 'oculus auth status',
      },
      {
        title: 'Check auth status (JSON output for scripts)',
        command: 'oculus auth status --json',
        outputPreview: `{\n  "authenticated": true,\n  "apiUrl": "http://localhost:3000/api/v1",\n  "workspaces": [\n    {\n      "id": "ws_7a9c1e2b",\n      "name": "Security Operations"\n    }\n  ]\n}`,
      },
    ],
    exitBehavior: 'Exits 0 if authenticated or explicitly not authenticated; exits 1 on API network error.',
  },
  {
    id: 'auth-logout',
    command: 'oculus auth logout',
    category: 'auth',
    summary: 'Clear credentials and attempt server-side token revocation',
    description: 'Attempts to revoke the active token via DELETE /developer-tokens/current and deletes token from ~/.oculus/config.json.',
    usage: 'oculus auth logout',
    authRequired: false,
    outputModes: ['text'],
    examples: [
      {
        title: 'Log out from CLI',
        command: 'oculus auth logout',
        description: 'Removes local token and notifies server.',
      },
    ],
    exitBehavior: 'Exits 0 after local credentials are removed.',
  },

  // --- CONFIG ---
  {
    id: 'config-set',
    command: 'oculus config set',
    category: 'config',
    summary: 'Set a persistent configuration value',
    description: 'Stores persistent key-value parameters in ~/.oculus/config.json. Standard keys are workspace, api-url, and token.',
    usage: 'oculus config set <key> <value>',
    authRequired: false,
    outputModes: ['text'],
    arguments: [
      {
        name: 'key',
        description: 'Configuration key (e.g. workspace, api-url, token)',
        required: true,
      },
      {
        name: 'value',
        description: 'Value to persist',
        required: true,
      },
    ],
    examples: [
      {
        title: 'Set default workspace',
        command: 'oculus config set workspace ws_7a9c1e2b',
        description: 'Eliminates the need to pass --workspace on every findings or repo command.',
      },
      {
        title: 'Set custom backend API URL',
        command: 'oculus config set api-url https://oculus.yourcompany.com/api/v1',
      },
    ],
    exitBehavior: 'Exits 0 on successful update.',
  },
  {
    id: 'config-get',
    command: 'oculus config get',
    category: 'config',
    summary: 'Display one or all stored configuration values',
    description: 'Inspects your local CLI configuration. Sensitive values like token are automatically masked.',
    usage: 'oculus config get [key]',
    authRequired: false,
    outputModes: ['text'],
    arguments: [
      {
        name: 'key',
        description: 'Optional configuration key to inspect. Omit to list all.',
        required: false,
      },
    ],
    examples: [
      {
        title: 'Inspect all config',
        command: 'oculus config get',
      },
      {
        title: 'Inspect active workspace',
        command: 'oculus config get workspace',
      },
    ],
    exitBehavior: 'Exits 0.',
  },
  {
    id: 'config-path',
    command: 'oculus config path',
    category: 'config',
    summary: 'Display the path to the configuration file',
    description: 'Outputs the absolute filesystem path where the CLI reads and writes its persistent configuration (~/.oculus/config.json).',
    usage: 'oculus config path',
    authRequired: false,
    outputModes: ['text'],
    examples: [
      {
        title: 'Show config file location',
        command: 'oculus config path',
      },
    ],
    exitBehavior: 'Exits 0.',
  },

  // --- SCAN ---
  {
    id: 'scan',
    command: 'oculus scan',
    category: 'scan',
    summary: 'Trigger a security scan and optionally evaluate the security gate',
    description: 'Dispatches a security scan for a specified repository and branch. With --wait, blocks until completion and exits with the security gate pass/fail code.',
    usage: 'oculus scan -r <repoId> -b <branch> [options]',
    authRequired: true,
    outputModes: ['text', 'json'],
    options: [
      {
        flag: '-r, --repository <id>',
        description: 'Repository ID registered in Oculus (UUID)',
        required: true,
      },
      {
        flag: '-b, --branch <name>',
        description: 'Branch name to scan (e.g. main, dev, feature-x)',
        required: true,
      },
      {
        flag: '-c, --commit <sha>',
        description: 'Specific git commit SHA to scan (optional)',
        required: false,
      },
      {
        flag: '-w, --wait',
        description: 'Block and poll until scan finishes, exiting with security gate status',
        required: false,
      },
      {
        flag: '--poll-interval <seconds>',
        description: 'Polling interval in seconds during --wait (minimum 1, default 5)',
        required: false,
        defaultValue: '5',
      },
      {
        flag: '--timeout <seconds>',
        description: 'Maximum seconds to wait before aborting (default 300)',
        required: false,
        defaultValue: '300',
      },
      {
        flag: '--verbose',
        description: 'Show detailed polling progress indicators in interactive terminal',
        required: false,
      },
      {
        flag: '--json',
        description: 'Emit final scan / gate result as clean JSON to stdout',
        required: false,
      },
      {
        flag: '--token <token>',
        description: 'Override authentication token for this specific scan invocation',
        required: false,
      },
      {
        flag: '--api-url <url>',
        description: 'Override backend API URL for this command',
        required: false,
      },
    ],
    examples: [
      {
        title: 'Queue a scan asynchronously and exit immediately',
        command: 'oculus scan -r repo_8f3a9c1b -b main',
        description: 'Dispatches the scan to worker queue and outputs the Scan ID with exit code 0.',
      },
      {
        title: 'Run scan and wait for security gate (CI/CD pattern)',
        command: 'oculus scan -r repo_8f3a9c1b -b main --wait',
        description: 'Polls until completed. Exits 0 if gate PASSED; exits 1 if gate FAILED.',
      },
      {
        title: 'Automated CI scan with JSON output and timeout',
        command: 'oculus scan -r repo_8f3a9c1b -b main -c 9a8b7c6d --wait --timeout 600 --json',
        outputPreview: `{\n  "scanId": "scan_4d5e6f7a",\n  "status": "COMPLETED",\n  "gate": {\n    "status": "PASSED",\n    "passed": true,\n    "reason": "No critical findings"\n  }\n}`,
      },
    ],
    exitBehavior: 'Exit 0: Gate PASSED (or scan queued without --wait). Exit 1: Gate FAILED, timeout, or error. Exit 130: User interrupted with Ctrl+C (scan continues on backend).',
  },

  // --- FINDINGS ---
  {
    id: 'findings-list',
    command: 'oculus findings list',
    category: 'findings',
    summary: 'Query security findings for an active workspace',
    description: 'Retrieves security findings with filtering by repository, severity, status, and quantity limits.',
    usage: 'oculus findings list [options]',
    authRequired: true,
    outputModes: ['text', 'json'],
    options: [
      {
        flag: '-w, --workspace <id>',
        description: 'Workspace ID (defaults to config or OCULUS_WORKSPACE_ID)',
        required: false,
      },
      {
        flag: '-r, --repository <id>',
        description: 'Filter findings by specific repository ID',
        required: false,
      },
      {
        flag: '-s, --severity <levels...>',
        description: 'Filter by severity: CRITICAL, HIGH, MEDIUM, LOW',
        required: false,
      },
      {
        flag: '--status <status...>',
        description: 'Filter by triage status: OPEN, CONFIRMED, FALSE_POSITIVE, FIXED, IGNORED',
        required: false,
      },
      {
        flag: '-l, --limit <count>',
        description: 'Max findings to return (default 20)',
        required: false,
        defaultValue: '20',
      },
      {
        flag: '--json',
        description: 'Emit findings array as JSON payload',
        required: false,
      },
    ],
    examples: [
      {
        title: 'List all open critical findings',
        command: 'oculus findings list --severity CRITICAL --status OPEN',
      },
      {
        title: 'Query findings for a repository in JSON format',
        command: 'oculus findings list -r repo_8f3a9c1b --json',
        outputPreview: `{\n  "workspaceId": "ws_7a9c1e2b",\n  "total": 1,\n  "items": [\n    {\n      "id": "fnd_1234abcd",\n      "severity": "CRITICAL",\n      "rule_type": "AWS_SECRET_KEY",\n      "status": "OPEN",\n      "file_path": "server/config.js",\n      "line_number": 42\n    }\n  ]\n}`,
      },
    ],
    exitBehavior: 'Exits 0 on success; exits 1 if workspace is missing or API error occurs.',
  },
  {
    id: 'findings-update',
    command: 'oculus findings update',
    category: 'findings',
    summary: 'Triage a finding status with audit trail comments',
    description: 'Updates finding status to OPEN, CONFIRMED, FALSE_POSITIVE, FIXED, or IGNORED, adding an audit trail entry.',
    usage: 'oculus findings update <findingId> -s <status> [options]',
    authRequired: true,
    outputModes: ['text', 'json'],
    arguments: [
      {
        name: 'findingId',
        description: 'ID of the finding to update',
        required: true,
      },
    ],
    options: [
      {
        flag: '-s, --status <status>',
        description: 'New status: OPEN, CONFIRMED, FALSE_POSITIVE, FIXED, IGNORED',
        required: true,
      },
      {
        flag: '-w, --workspace <id>',
        description: 'Workspace ID (defaults to config or OCULUS_WORKSPACE_ID)',
        required: false,
      },
      {
        flag: '-c, --comment <text>',
        description: 'Audit trail explanation note',
        required: false,
      },
      {
        flag: '--json',
        description: 'Emit result as JSON',
        required: false,
      },
    ],
    examples: [
      {
        title: 'Mark a finding as false positive',
        command: 'oculus findings update fnd_1234abcd --status FALSE_POSITIVE --comment "Test fixture credential"',
      },
      {
        title: 'Confirm a vulnerability for remediation',
        command: 'oculus findings update fnd_5678efgh --status CONFIRMED',
      },
    ],
    exitBehavior: 'Exits 0 on success; exits 1 on invalid status or API rejection.',
  },

  // --- REPO ---
  {
    id: 'repo-list',
    command: 'oculus repo list',
    category: 'repo',
    summary: 'List monitored repositories, risk scores, and grades',
    description: 'Lists repositories in the active workspace with current risk grades (A-F), scores (0-100), default branches, and repository IDs.',
    usage: 'oculus repo list [options]',
    authRequired: true,
    outputModes: ['text', 'json'],
    options: [
      {
        flag: '-w, --workspace <id>',
        description: 'Workspace ID (defaults to config or OCULUS_WORKSPACE_ID)',
        required: false,
      },
      {
        flag: '-l, --limit <count>',
        description: 'Max repositories to return (default 20)',
        required: false,
        defaultValue: '20',
      },
      {
        flag: '--json',
        description: 'Emit repository list as JSON',
        required: false,
      },
    ],
    examples: [
      {
        title: 'List repositories with risk grades',
        command: 'oculus repo list',
      },
      {
        title: 'Export repositories as JSON',
        command: 'oculus repo list --json',
        outputPreview: `{\n  "workspaceId": "ws_7a9c1e2b",\n  "total": 2,\n  "items": [\n    {\n      "id": "repo_8f3a9c1b",\n      "full_name": "org/api-service",\n      "current_risk_grade": "A",\n      "current_risk_score": 12,\n      "default_branch": "main"\n    }\n  ]\n}`,
      },
    ],
    exitBehavior: 'Exits 0 on success; exits 1 on missing workspace or API error.',
  },

  // --- SYSTEM ---
  {
    id: 'version',
    command: 'oculus --version',
    category: 'system',
    summary: 'Print the installed CLI version',
    description: 'Prints current installed version of the @oculus/cli package.',
    usage: 'oculus --version',
    authRequired: false,
    outputModes: ['text'],
    examples: [
      {
        title: 'Check CLI version',
        command: 'oculus --version',
        outputPreview: '1.0.0',
      },
    ],
    exitBehavior: 'Exits 0.',
  },
  {
    id: 'help',
    command: 'oculus --help',
    category: 'system',
    summary: 'Display help information',
    description: 'Lists all available commands, options, and global flags.',
    usage: 'oculus --help',
    authRequired: false,
    outputModes: ['text'],
    examples: [
      {
        title: 'Show main help menu',
        command: 'oculus --help',
      },
      {
        title: 'Show specific command help',
        command: 'oculus scan --help',
      },
    ],
    exitBehavior: 'Exits 0.',
  },
];
