import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RuleLoader {
    static async loadRules() {
        const rules = [];
        const seenRuleIds = new Set();

        const searchRoots = [
            path.join(__dirname, '../analyzers'),
            path.join(__dirname, '../engines')
        ];

        for (const rootDir of searchRoots) {
            if (!fs.existsSync(rootDir)) continue;

            try {
                const subdirs = fs.readdirSync(rootDir);
                for (const subdir of subdirs) {
                    const rulesDir = path.join(rootDir, subdir, 'rules');
                    if (fs.existsSync(rulesDir)) {
                        const ruleFiles = fs.readdirSync(rulesDir).filter(file => file.endsWith('.rule.js'));

                        for (const file of ruleFiles) {
                            try {
                                const filePath = path.join(rulesDir, file);
                                const fileUrl = pathToFileURL(filePath).href;
                                const ruleModule = await import(fileUrl);
                                if (ruleModule.default) {
                                    const rule = ruleModule.default;
                                    if (!seenRuleIds.has(rule.id)) {
                                        seenRuleIds.add(rule.id);
                                        rules.push(rule);
                                    }
                                }
                            } catch (err) {
                                console.warn(`[RuleLoader] Failed to import rule ${file}:`, err.message);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('[RuleLoader] Failed to load rules from ' + rootDir + ':', error);
            }
        }

        return rules;
    }
}

export default RuleLoader;
