import { getPool } from '../config/db.js';
import GithubStatusService from '../github/services/github-status.service.js';
import logger from '../config/logger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (retryCount) => {
    switch (retryCount) {
        case 0: return '1 minute';
        case 1: return '5 minutes';
        case 2: return '15 minutes';
        case 3: return '1 hour';
        default: return '1 hour'; // Should not hit if limit is 4
    }
};

const processOutbox = async () => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Claim events, supporting fresh pending events, scheduled retry backoffs,
        // and crash recovery (stale PROCESSING leases older than 2 minutes)
        const res = await client.query(`
            SELECT id, scan_id, event_type, payload, retry_count
            FROM scan_events
            WHERE processed_at IS NULL
              AND retry_count < 5
              AND (
                status = 'PENDING'
                OR (status = 'FAILED' AND (next_retry_at IS NULL OR next_retry_at <= NOW()))
                OR (status = 'PROCESSING' AND locked_at < NOW() - INTERVAL '2 minutes')
              )
            ORDER BY created_at ASC
            LIMIT 5
            FOR UPDATE SKIP LOCKED
        `);

        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return 0; // nothing processed
        }

        const events = res.rows;
        
        // Lock the events and set status to PROCESSING
        const eventIds = events.map(e => e.id);
        await client.query(`
            UPDATE scan_events
            SET locked_at = NOW(), status = 'PROCESSING'
            WHERE id = ANY($1)
        `, [eventIds]);

        await client.query('COMMIT');
        
        // Process each event
        for (const event of events) {
            try {
                logger.info(`[Outbox] Processing event ${event.id} (scanId: ${event.scan_id}, retry: ${event.retry_count})`);
                console.log(`[OUTBOX_PROCESSED] eventId:${event.id} scanId:${event.scan_id} eventType:${event.event_type}`);
                
                // Call GithubStatusService directly instead of routing through BullMQ
                await GithubStatusService.handleStatusUpdate({
                    scanId: event.scan_id,
                    eventType: event.event_type,
                    payload: event.payload
                });

                // Fan out to Outbound Webhooks via BullMQ
                const WebhookDispatchService = (await import('../services/webhook-dispatch.service.js')).default;
                await WebhookDispatchService.handleEvent({
                    scanId: event.scan_id,
                    eventType: event.event_type,
                    payload: event.payload
                });

                // Mark as COMPLETED
                await pool.query(`
                    UPDATE scan_events
                    SET processed_at = NOW(), locked_at = NULL, status = 'COMPLETED'
                    WHERE id = $1
                `, [event.id]);
                
                logger.info(`[Outbox] Successfully processed event ${event.id}`);

            } catch (err) {
                logger.error(`[Outbox Worker] Failed to process event ${event.id}`, err);
                console.error(`[OUTBOX_DISPATCH_FAILED] eventId:${event.id} scanId:${event.scan_id} eventType:${event.event_type} attempt:${event.retry_count + 1} error:"${err.message}"`);
                
                if (event.retry_count >= 4) {
                    // Maximum retries exceeded, move to Dead Letter Table
                    logger.warn(`[Outbox] Event ${event.id} exceeded max retries. Moving to Dead Letter.`);
                    
                    const deadLetterClient = await pool.connect();
                    try {
                        await deadLetterClient.query('BEGIN');
                        
                        // Insert into Dead Letter
                        await deadLetterClient.query(`
                            INSERT INTO github_dead_letter_events (original_event_id, event_type, payload, failure_reason, retry_count)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [event.id, event.event_type, event.payload, err.message, event.retry_count + 1]);

                        // Mark original event permanently FAILED
                        await deadLetterClient.query(`
                            UPDATE scan_events
                            SET status = 'FAILED', locked_at = NULL, last_error = $2, retry_count = retry_count + 1
                            WHERE id = $1
                        `, [event.id, err.message]);

                        // Note: github_action_logs INSERT intentionally omitted here.
                        // installation_id is NOT NULL but unavailable in the outbox context.
                        // The failure is already durably recorded in github_dead_letter_events above.

                        await deadLetterClient.query('COMMIT');
                    } catch (dlErr) {
                        await deadLetterClient.query('ROLLBACK');
                        logger.error(`[Outbox Worker] Failed to process dead letter for event ${event.id}`, dlErr);
                    } finally {
                        deadLetterClient.release();
                    }
                } else {
                    // Standard retry logic
                    const backoffInterval = calculateBackoff(event.retry_count);
                    
                    await pool.query(`
                        UPDATE scan_events
                        SET retry_count = retry_count + 1,
                            last_error = $2,
                            locked_at = NULL,
                            status = 'FAILED',
                            next_retry_at = NOW() + INTERVAL '${backoffInterval}'
                        WHERE id = $1
                    `, [event.id, err.message]);
                    
                    logger.info(`[Outbox] Event ${event.id} failed. Next retry in ${backoffInterval}.`);
                }
            }
        }
        
        client.release();
        return events.length;

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        logger.error('[Outbox Worker] Unexpected error in processing loop', error);
        return 0;
    }
};

let isRunning = false;
let currentBatchPromise = null;

export const startOutboxWorker = async () => {
    if (isRunning) return;
    isRunning = true;
    logger.info('[Outbox Worker] Starting worker loop...');

    while (isRunning) {
        currentBatchPromise = processOutbox();
        let processedCount = 0;
        try {
            processedCount = await currentBatchPromise;
        } finally {
            currentBatchPromise = null;
        }

        if (!isRunning) break;

        // If nothing was processed, wait 1 second before trying again; otherwise 50ms
        if (processedCount === 0) {
            await sleep(1000);
        } else {
            await sleep(50);
        }
    }
    logger.info('[Outbox Worker] Worker loop terminated cleanly.');
};

export const stopOutboxWorker = async () => {
    if (!isRunning) return;
    logger.info('[Outbox Worker] Stopping outbox worker (draining in-flight batch)...');
    isRunning = false;
    if (currentBatchPromise) {
        try {
            await currentBatchPromise;
        } catch (err) {
            logger.warn(`[Outbox Worker] In-flight batch completed with error during shutdown: ${err.message}`);
        }
    }
    logger.info('[Outbox Worker] ✓ Outbox worker stopped cleanly.');
};

export { processOutbox };

