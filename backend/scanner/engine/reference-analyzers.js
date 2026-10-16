/**
 * scanner/engine/reference-analyzers.js
 *
 * Open-Source Reference Security Analyzers for the Oculus Public Repository.
 *
 * These analyzers implement the canonical IAnalyzer interface and demonstrate
 * the extensible detection architecture without disclosing proprietary enterprise
 * taint analysis or confidential rule definitions.
 */

import { IAnalyzer } from './analyzer.interface.js';
import { AnalyzerResult } from './analyzer-result.js';
import { generateFingerprint } from './finding.js';
import fs from 'fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

/**
 * Reference Secret Analyzer
 * Fast regex & pattern-based detection for credentials, API tokens, and private keys.
 */
export class ReferenceSecretAnalyzer extends IAnalyzer {
    getCapabilities() {
        return {
            id: 'reference-secret',
            version: '1.0.0',
            category: 'secrets',
            productionReady: true,
            enabledByDefault: true,
            languages: [], // all languages
            fileTypes: ['SOURCE', 'CONFIG'],
            requiresProgramModel: false
        };
    }

    async analyze(context) {
        const start = Date.now();
        const findings = [];
        let content = '';

        try {
            content = fs.readFileSync(context.file.absolutePath, 'utf8');
        } catch (err) {
            return new AnalyzerResult({
                status: 'FAILED',
                error: err.message,
                analyzerVersion: '1.0.0'
            });
        }

        const lines = content.split('\n');
        const rules = [
            {
                id: 'SEC-AWS-001',
                name: 'AWS Access Key ID',
                regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
                severity: 'CRITICAL',
                cwe: 'CWE-798',
                vulnerabilityClass: 'Hardcoded Credential'
            },
            {
                id: 'SEC-GH-001',
                name: 'GitHub Personal Access Token',
                regex: /ghp_[0-9a-zA-Z]{36}/g,
                severity: 'CRITICAL',
                cwe: 'CWE-798',
                vulnerabilityClass: 'Hardcoded Credential'
            },
            {
                id: 'SEC-SLACK-001',
                name: 'Slack Bot / User Token',
                regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
                severity: 'HIGH',
                cwe: 'CWE-798',
                vulnerabilityClass: 'Hardcoded Credential'
            },
            {
                id: 'SEC-KEY-001',
                name: 'Private Key Block',
                regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
                severity: 'CRITICAL',
                cwe: 'CWE-312',
                vulnerabilityClass: 'Exposed Private Key'
            }
        ];

        lines.forEach((line, lineIdx) => {
            for (const rule of rules) {
                rule.regex.lastIndex = 0;
                let match;
                while ((match = rule.regex.exec(line)) !== null) {
                    const snippet = line.trim();
                    const fingerprint = generateFingerprint(
                        context.repositoryId,
                        context.file.relativePath,
                        rule.id,
                        snippet
                    );

                    findings.push({
                        fingerprint,
                        ruleId: rule.id,
                        ruleVersion: '1.0.0',
                        ruleType: 'SECRET',
                        severity: rule.severity,
                        confidence: 'HIGH',
                        confidenceScore: 95,
                        vulnerabilityClass: rule.vulnerabilityClass,
                        cwe: rule.cwe,
                        filePath: context.file.relativePath,
                        lineNumber: lineIdx + 1,
                        column: match.index + 1,
                        snippet,
                        evidence: {
                            matchedPattern: rule.name,
                            matchLength: match[0].length
                        }
                    });
                }
            }
        });

        return new AnalyzerResult({
            status: 'SUCCESS',
            findings,
            analyzerVersion: '1.0.0',
            metrics: {
                durationMs: Date.now() - start,
                findingCount: findings.length,
                linesScanned: lines.length
            }
        });
    }
}

/**
 * Reference SAST Analyzer
 * AST-driven source code analysis utilizing Acorn for JavaScript / TypeScript.
 */
export class ReferenceSastAnalyzer extends IAnalyzer {
    getCapabilities() {
        return {
            id: 'reference-sast',
            version: '1.0.0',
            category: 'sast',
            productionReady: true,
            enabledByDefault: true,
            languages: ['javascript', 'typescript'],
            fileTypes: ['SOURCE'],
            requiresProgramModel: false
        };
    }

    async analyze(context) {
        const start = Date.now();
        const findings = [];
        let content = '';

        try {
            content = fs.readFileSync(context.file.absolutePath, 'utf8');
        } catch (err) {
            return new AnalyzerResult({
                status: 'FAILED',
                error: err.message,
                analyzerVersion: '1.0.0'
            });
        }

        const lines = content.split('\n');

        try {
            const ast = acorn.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'module',
                locations: true
            });

            walk.simple(ast, {
                CallExpression(node) {
                    // Check for direct eval()
                    if (node.callee?.name === 'eval') {
                        const line = node.loc.start.line;
                        const snippet = lines[line - 1] ? lines[line - 1].trim() : 'eval(...)';
                        findings.push({
                            fingerprint: generateFingerprint(
                                context.repositoryId,
                                context.file.relativePath,
                                'SAST-EVAL-001',
                                snippet
                            ),
                            ruleId: 'SAST-EVAL-001',
                            ruleVersion: '1.0.0',
                            ruleType: 'SAST',
                            severity: 'CRITICAL',
                            confidence: 'HIGH',
                            confidenceScore: 90,
                            vulnerabilityClass: 'Code Injection',
                            cwe: 'CWE-95',
                            filePath: context.file.relativePath,
                            lineNumber: line,
                            column: node.loc.start.column,
                            snippet,
                            evidence: {
                                reason: 'Direct execution of dynamic code via eval()'
                            }
                        });
                    }

                    // Check for SQL query with string concatenation
                    if (
                        node.callee?.property?.name === 'query' ||
                        node.callee?.name === 'query'
                    ) {
                        const firstArg = node.arguments[0];
                        if (firstArg?.type === 'BinaryExpression' && firstArg.operator === '+') {
                            const line = node.loc.start.line;
                            const snippet = lines[line - 1] ? lines[line - 1].trim() : 'db.query(...)';
                            findings.push({
                                fingerprint: generateFingerprint(
                                    context.repositoryId,
                                    context.file.relativePath,
                                    'SAST-SQLI-001',
                                    snippet
                                ),
                                ruleId: 'SAST-SQLI-001',
                                ruleVersion: '1.0.0',
                                ruleType: 'SAST',
                                severity: 'HIGH',
                                confidence: 'HIGH',
                                confidenceScore: 85,
                                vulnerabilityClass: 'SQL Injection',
                                cwe: 'CWE-89',
                                filePath: context.file.relativePath,
                                lineNumber: line,
                                column: node.loc.start.column,
                                snippet,
                                evidence: {
                                    reason: 'SQL query dynamically constructed via string concatenation'
                                }
                            });
                        }
                    }
                }
            });
        } catch (parseErr) {
            // Non-fatal: if acorn cannot parse (e.g. experimental TS syntax), record warning
            return new AnalyzerResult({
                status: 'SUCCESS',
                findings: [],
                warnings: [`Acorn parse skipped: ${parseErr.message}`],
                analyzerVersion: '1.0.0',
                metrics: { durationMs: Date.now() - start }
            });
        }

        return new AnalyzerResult({
            status: 'SUCCESS',
            findings,
            analyzerVersion: '1.0.0',
            metrics: {
                durationMs: Date.now() - start,
                findingCount: findings.length
            }
        });
    }
}

/**
 * Reference SCA Dependency Analyzer
 * Audits dependency manifests against known security advisories.
 */
export class ReferenceScaAnalyzer extends IAnalyzer {
    getCapabilities() {
        return {
            id: 'reference-sca',
            version: '1.0.0',
            category: 'sca',
            productionReady: true,
            enabledByDefault: true,
            languages: ['json'],
            fileTypes: ['DEPENDENCY'],
            requiresProgramModel: false
        };
    }

    async analyze(context) {
        const start = Date.now();
        const findings = [];
        let content = '';

        try {
            content = fs.readFileSync(context.file.absolutePath, 'utf8');
        } catch (err) {
            return new AnalyzerResult({
                status: 'FAILED',
                error: err.message,
                analyzerVersion: '1.0.0'
            });
        }

        let pkg;
        try {
            pkg = JSON.parse(content);
        } catch {
            return new AnalyzerResult({
                status: 'SKIPPED',
                reason: 'invalid_json_manifest',
                analyzerVersion: '1.0.0'
            });
        }

        // Known vulnerable packages for demonstration and benchmark suite
        const VULNERABLE_ADVISORIES = {
            'lodash': { affected: '<4.17.21', fixedIn: '4.17.21', cwe: 'CWE-1321', severity: 'HIGH', vuln: 'Prototype Pollution' },
            'axios': { affected: '<0.21.2', fixedIn: '0.21.2', cwe: 'CWE-918', severity: 'HIGH', vuln: 'Server-Side Request Forgery' },
            'jsonwebtoken': { affected: '<9.0.0', fixedIn: '9.0.0', cwe: 'CWE-287', severity: 'CRITICAL', vuln: 'Improper Verification of Cryptographic Signature' },
            'semver': { affected: '<7.5.2', fixedIn: '7.5.2', cwe: 'CWE-1333', severity: 'MEDIUM', vuln: 'Regular Expression Denial of Service' }
        };

        const allDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {})
        };

        for (const [depName, versionSpec] of Object.entries(allDeps)) {
            const cleanVersion = String(versionSpec).replace(/[\^~>=<]/g, '');
            const advisory = VULNERABLE_ADVISORIES[depName];

            if (advisory) {
                const snippet = `"${depName}": "${versionSpec}"`;
                findings.push({
                    fingerprint: generateFingerprint(
                        context.repositoryId,
                        context.file.relativePath,
                        `SCA-${depName.toUpperCase()}`,
                        snippet
                    ),
                    ruleId: `SCA-${depName.toUpperCase()}`,
                    ruleVersion: '1.0.0',
                    ruleType: 'DEPENDENCY',
                    severity: advisory.severity,
                    confidence: 'HIGH',
                    confidenceScore: 90,
                    vulnerabilityClass: advisory.vuln,
                    cwe: advisory.cwe,
                    filePath: context.file.relativePath,
                    lineNumber: 1,
                    column: 1,
                    snippet,
                    evidence: {
                        package: depName,
                        declaredVersion: versionSpec,
                        fixedIn: advisory.fixedIn,
                        advisory: advisory.vuln
                    }
                });
            }
        }

        return new AnalyzerResult({
            status: 'SUCCESS',
            findings,
            analyzerVersion: '1.0.0',
            metrics: {
                durationMs: Date.now() - start,
                findingCount: findings.length
            }
        });
    }
}
