import logger from '../config/logger.js';
import ApiError from '../utils/apiError.js';

const errorHandler = (err, req, res, next) => {
    let error = err;

    // If the error isn't our custom ApiError, format it into one
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, [], err.stack);
    }

    // Log the error securely
    logger.error('API Error Encountered', { 
        message: error.message, 
        stack: error.stack, 
        path: req.path,
        method: req.method
    });

    // Extract exact properties defined in your apiError.js
    const response = {
        success: error.success,
        message: error.message,
        errors: error.errors,
        data: error.data
    };

    return res.status(error.statusCode || 500).json(response);
};

export { errorHandler };