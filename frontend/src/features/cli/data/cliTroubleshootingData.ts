export interface TroubleshootingItem {
  id: string;
  problem: string;
  symptom: string;
  cause: string;
  solution: string;
  exampleCommand?: string;
}

export const CLI_TROUBLESHOOTING: TroubleshootingItem[] = [
  {
    id: 'auth-missing',
    problem: 'Error: Authentication required',
    symptom: 'Error: Authentication required. Please run "oculus auth login --token <token>" or set OCULUS_TOKEN.',
    cause: 'No developer token found in ~/.oculus/config.json and OCULUS_TOKEN environment variable is unset.',
    solution: 'Generate a developer token in Oculus UI (Settings → Developer Tokens) and run "oculus auth login --token <token>", or set the OCULUS_TOKEN environment variable.',
    exampleCommand: 'oculus auth login --token ocx_live_...',
  },
  {
    id: 'token-rejected',
    problem: 'Token rejected by the server (HTTP 401 / 403)',
    symptom: 'Error: Token rejected by the server (HTTP 401). The token was NOT saved.',
    cause: 'The developer token is invalid, expired, revoked, or lacks required scopes for the active workspace.',
    solution: 'Verify your token in Oculus UI → Settings → Developer Tokens. Generate a fresh token with required scopes (scans:create, scans:read, findings:read) and re-login.',
    exampleCommand: 'oculus auth login --token ocx_live_fresh_token',
  },
  {
    id: 'workspace-missing',
    problem: 'Error: Workspace ID is required',
    symptom: 'Error: Workspace ID is required. Pass --workspace <id> or set OCULUS_WORKSPACE_ID or run "oculus config set workspace <id>".',
    cause: 'Commands requiring workspace context (such as findings and repo) did not receive a workspace parameter.',
    solution: 'Persist your workspace ID globally using "oculus config set workspace <id>", pass --workspace flag, or set OCULUS_WORKSPACE_ID.',
    exampleCommand: 'oculus config set workspace <your-workspace-uuid>',
  },
  {
    id: 'gate-failed',
    problem: 'Security Gate FAILED (Exit Code 1)',
    symptom: 'Security Gate: FAILED. Reason: Policy threshold exceeded. Exit code 1.',
    cause: 'The scan detected vulnerabilities or critical secrets exceeding your workspace security policy thresholds.',
    solution: 'Run "oculus findings list -r <repoId> --severity CRITICAL" to review the blocking issues, fix the code, or triage false positives in the Oculus UI.',
    exampleCommand: 'oculus findings list -r <repoId> --severity CRITICAL',
  },
  {
    id: 'scan-timeout',
    problem: 'Scan waiting timed out',
    symptom: 'Timed out after 300s waiting for scan to complete.',
    cause: 'Repository is very large or workers are busy processing other jobs.',
    solution: 'Increase the timeout using the --timeout flag (e.g. --timeout 600 for 10 minutes), or run the scan asynchronously without --wait.',
    exampleCommand: 'oculus scan -r <repoId> -b main --wait --timeout 600',
  },
  {
    id: 'server-unreachable',
    problem: 'API connection / server unreachable',
    symptom: 'Warning: Token saved but could not be verified — server unreachable.',
    cause: 'The CLI cannot connect to the configured API URL (default: http://localhost:3000/api/v1) due to network disconnection or incorrect endpoint.',
    solution: 'Check that your backend server is running and configure the correct API URL via "oculus config set api-url <url>" or OCULUS_API_URL.',
    exampleCommand: 'oculus config set api-url https://oculus.yourcompany.com/api/v1',
  },
  {
    id: 'interrupted-ctrl-c',
    problem: 'Scan polling interrupted by user (Exit code 130)',
    symptom: 'Interrupted by user (Ctrl+C). The scan is still running on the backend. Scan ID: scan_...',
    cause: 'You pressed Ctrl+C while the CLI was polling scan progress.',
    solution: 'The scan is not lost — it continues running on the backend worker. You can check its progress in the Oculus Web UI under Scan History.',
  },
  {
    id: 'windows-execution-policy',
    problem: 'Command not found / Execution Policy on Windows',
    symptom: "'oculus' is not recognized as an internal or external command, or script execution disabled.",
    cause: 'npm global bin folder is not in your Windows PATH, or PowerShell execution policy is Restricted.',
    solution: 'Ensure %APPDATA%\\npm is in your User PATH. If running install.ps1, set execution policy for current user: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass.',
    exampleCommand: 'Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass',
  },
];
