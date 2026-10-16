import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SandboxManager {
    static async executeScan(jobData) {
        return new Promise((resolve, reject) => {
            const workerPath = path.join(__dirname, 'scanner-thread.worker.js');
            const isBaseline = jobData.isBaseline === true;
            const limits = jobData.limits || {};
            const envTimeout = parseInt(process.env.SCANNER_TIMEOUT_MS || '60000', 10);
            const defaultTimeout = isBaseline ? 300000 : envTimeout;
            const SCAN_TIMEOUT = limits.maxCpuTimeMs || defaultTimeout;
            
            jobData.limits = {
                ...limits,
                maxCpuTimeMs: SCAN_TIMEOUT
            };

            let isResolved = false;
            let worker = null;

            const cleanup = () => {
                if (timeout) clearTimeout(timeout);
                if (worker) {
                    worker.removeAllListeners();
                }
            };

            const timeout = setTimeout(() => {
                if (isResolved) return;
                isResolved = true;
                if (worker) {
                    worker.terminate().catch(() => {});
                }
                cleanup();
                reject(new Error(`RESOURCE_LIMIT_EXCEEDED: Scanner timeout (${SCAN_TIMEOUT}ms)`));
            }, SCAN_TIMEOUT);

            try {
                worker = new Worker(workerPath, {
                    workerData: { jobData }
                });

                worker.on('message', (message) => {
                    if (isResolved) return;
                    isResolved = true;
                    cleanup();
                    worker.terminate().catch(() => {});

                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        resolve(message.payload);
                    }
                });

                worker.on('error', (err) => {
                    if (isResolved) return;
                    isResolved = true;
                    cleanup();
                    worker.terminate().catch(() => {});
                    reject(err);
                });

                worker.on('exit', (code) => {
                    if (isResolved) return;
                    isResolved = true;
                    cleanup();
                    if (code !== 0) {
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });
            } catch (spawnError) {
                if (isResolved) return;
                isResolved = true;
                cleanup();
                reject(spawnError);
            }
        });
    }
}
