import fs from 'fs/promises';

/**
 * ResourceGovernor monitors and enforces resource usage limits during a scan.
 * It is instantiated per-scan inside the scanner-thread.worker.js or at the sandbox boundary.
 */
export class ResourceGovernor {
    constructor(limits = {}) {
        this.limits = {
            maxCpuTimeMs: limits.maxCpuTimeMs || 1000 * 60 * 5, // 5 minutes CPU limit per scan
            maxMemoryBytes: limits.maxMemoryBytes || 1024 * 1024 * 1024, // 1GB memory limit
            maxFiles: limits.maxFiles || 10000,
            maxExtractedBytes: limits.maxExtractedBytes || 1024 * 1024 * 500, // 500MB extracted limit
            maxAstNodes: limits.maxAstNodes || 500000,
            engineTimeoutMs: limits.engineTimeoutMs || 1000 * 30, // 30s per engine per file
            ...limits
        };

        this.usage = {
            filesProcessed: 0,
            extractedBytes: 0,
            startTimeMs: Date.now(),
            totalAstNodes: 0
        };
    }

    /**
     * Increment file count and bytes. Throws if limits are exceeded.
     */
    trackExtraction(bytes) {
        this.usage.extractedBytes += bytes;
        if (this.usage.extractedBytes > this.limits.maxExtractedBytes) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: Extracted bytes (${this.usage.extractedBytes}) exceeds limit (${this.limits.maxExtractedBytes})`);
        }
    }

    trackFileProcessed() {
        this.usage.filesProcessed++;
        if (this.usage.filesProcessed > this.limits.maxFiles) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: Processed files (${this.usage.filesProcessed}) exceeds limit (${this.limits.maxFiles})`);
        }
    }

    trackAstNodes(nodesCount) {
        this.usage.totalAstNodes += nodesCount;
        if (this.usage.totalAstNodes > this.limits.maxAstNodes) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: AST Nodes (${this.usage.totalAstNodes}) exceeds limit (${this.limits.maxAstNodes})`);
        }
    }

    checkMemory() {
        const mem = process.memoryUsage();
        if (mem.heapUsed > this.limits.maxMemoryBytes) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: Heap memory (${mem.heapUsed}) exceeds limit (${this.limits.maxMemoryBytes})`);
        }
    }

    checkCpuTime() {
        const elapsed = Date.now() - this.usage.startTimeMs;
        if (elapsed > this.limits.maxCpuTimeMs) {
            throw new Error(`RESOURCE_LIMIT_EXCEEDED: Scan time (${elapsed}ms) exceeds limit (${this.limits.maxCpuTimeMs}ms)`);
        }
    }

    /**
     * Universal checkpoint called by engines periodically
     */
    checkpoint() {
        this.checkMemory();
        this.checkCpuTime();
    }
}
