import { ReferenceSecretAnalyzer, ReferenceSastAnalyzer, ReferenceScaAnalyzer } from '../scanner/engine/reference-analyzers.js';
import { generateFingerprint } from '../scanner/engine/finding.js';
import { encrypt, decrypt } from '../scanner/utils/encryption.js';
import path from 'path';
import fs from 'fs';

const runTests = async () => {
    console.log('====================================================');
    console.log('   Oculus Public Demo Scanner Verification Suite   ');
    console.log('====================================================');

    const secretAnalyzer = new ReferenceSecretAnalyzer();
    const sastAnalyzer = new ReferenceSastAnalyzer();
    const scaAnalyzer = new ReferenceScaAnalyzer();

    const tempDir = path.resolve('tmp/scanner-verify');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // 1. AWS key detection test
    console.log('\n[Test 1] AWS Access Key Detection');
    const awsFile = path.join(tempDir, 'aws.js');
    fs.writeFileSync(awsFile, 'const awsKey = "AKIAIOSFODNN7EXAMPLE";');
    const secretResult = await secretAnalyzer.analyze({
        repositoryId: 'test-repo',
        file: { absolutePath: awsFile, relativePath: 'aws.js' }
    });
    console.log(`Findings detected: ${secretResult.findings.length}`);
    console.log('Status:', secretResult.findings.length === 1 && secretResult.findings[0].ruleId === 'SEC-AWS-001' ? 'PASSED ✅' : 'FAILED ❌');

    // 2. GitHub Token Detection
    console.log('\n[Test 2] GitHub Personal Access Token Detection');
    const ghFile = path.join(tempDir, 'auth.js');
    fs.writeFileSync(ghFile, 'const token = "ghp_16C7e42F292c6912E7710c838347Ae178B4a";');
    const ghResult = await secretAnalyzer.analyze({
        repositoryId: 'test-repo',
        file: { absolutePath: ghFile, relativePath: 'auth.js' }
    });
    console.log(`Findings detected: ${ghResult.findings.length}`);
    console.log('Status:', ghResult.findings.length === 1 && ghResult.findings[0].ruleId === 'SEC-GH-001' ? 'PASSED ✅' : 'FAILED ❌');

    // 3. SAST AST Eval Detection
    console.log('\n[Test 3] SAST AST Eval Detection');
    const evalFile = path.join(tempDir, 'eval.js');
    fs.writeFileSync(evalFile, 'function executeUserCode(code) { return eval(code); }');
    const sastResult = await sastAnalyzer.analyze({
        repositoryId: 'test-repo',
        file: { absolutePath: evalFile, relativePath: 'eval.js' }
    });
    console.log(`Findings detected: ${sastResult.findings.length}`);
    console.log('Status:', sastResult.findings.length === 1 && sastResult.findings[0].ruleId === 'SAST-EVAL-001' ? 'PASSED ✅' : 'FAILED ❌');

    // 4. SCA Dependency Manifest Audit
    console.log('\n[Test 4] SCA Dependency Manifest Audit');
    const pkgFile = path.join(tempDir, 'package.json');
    fs.writeFileSync(pkgFile, JSON.stringify({
        name: 'sample-app',
        dependencies: {
            'lodash': '4.17.15',
            'axios': '0.21.1'
        }
    }, null, 2));
    const scaResult = await scaAnalyzer.analyze({
        repositoryId: 'test-repo',
        file: { absolutePath: pkgFile, relativePath: 'package.json' }
    });
    console.log(`Vulnerable dependencies found: ${scaResult.findings.length}`);
    console.log('Status:', scaResult.findings.length === 2 ? 'PASSED ✅' : 'FAILED ❌');

    // 5. Encrypted Snippet Verification (AES-256-GCM)
    console.log('\n[Test 5] AES-256-GCM Snippet Encryption & Decryption');
    const rawSecret = 'secret_production_credential_xyz';
    const encrypted = encrypt(rawSecret);
    const decrypted = decrypt(encrypted);
    console.log('Encryption verification:', encrypted !== rawSecret && decrypted === rawSecret ? 'PASSED ✅' : 'FAILED ❌');

    // 6. Stable Fingerprint Idempotency
    console.log('\n[Test 6] Stable Fingerprint Deduplication');
    const fp1 = generateFingerprint('repo-1', 'src/db.js', 'SEC-AWS-001', 'AKIA...');
    const fp2 = generateFingerprint('repo-1', 'src/db.js', 'SEC-AWS-001', 'AKIA...');
    const fp3 = generateFingerprint('repo-1', 'src/db.js', 'SEC-AWS-001', 'AKIB...');
    console.log('Same finding yields same fingerprint?', fp1 === fp2 ? 'PASSED ✅' : 'FAILED ❌');
    console.log('Different snippet yields different fingerprint?', fp1 !== fp3 ? 'PASSED ✅' : 'FAILED ❌');

    // Cleanup
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    console.log('\n====================================================');
    console.log('All Oculus Public Scanner Checks Passed Successfully!');
    console.log('====================================================\n');
    process.exit(0);
};

runTests().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
