const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for dev
    console.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(message, 400);
    }

    // If no status code is set, it might be a 404 (if this handler is reached after all routes)
    // Or a 500
    const statusCode = error.statusCode || 500;

    // Never leak internal error details (driver messages, paths) to clients in production
    let message = error.message || 'Server Error';
    if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
        message = 'Server Error';
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: message
    });
};

class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

module.exports = errorHandler;
module.exports.ErrorResponse = ErrorResponse;
