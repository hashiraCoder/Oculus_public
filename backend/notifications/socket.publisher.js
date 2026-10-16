import logger from '../config/logger.js';
import { getIO } from './websocket.gateway.js';

class SocketPublisher {
    /**
     * Publishes a message directly via Socket.IO.
     */
    static async publish(channel, payload) {
        try {
            const io = getIO();
            if (payload.room && payload.event && payload.data) {
                io.to(payload.room).emit(payload.event, payload.data);
                logger.info(`[SocketPublisher] Emitted event:${payload.event} room:${payload.room} scanId:${payload.data?.scanId || 'unknown'}`);
            }
        } catch (error) {
            logger.debug(`[SocketPublisher] Socket.IO emit skipped (${error.message})`);
        }
    }
}

export default SocketPublisher;
