import db from "../config/db.js";

/**
 * BaseController: A foundational class for all API controllers (Faculty, Proctor, Admin, etc.).
 * It centralizes database connection handling and standardizes API response formats.
 */
export default class BaseController {
    /**
     * @param {object} db - The database connection instance (e.g., from 'pg-promise').
     */
    constructor(db) {
        // Assign the database instance to make it available to all subclasses via 'this.db'
        this.db = db;
    }

    /**
     * Standardizes success responses.
     * @param {object} res - Express response object.
     * @param {object} data - The data payload to send.
     * @param {number|string} statusOrMessage - Optional HTTP status code or a message string.
     * @param {string} maybeMessage - Optional message when a numeric status code is provided.
     */
    success(res, data, statusOrMessage = 200, maybeMessage = undefined) {
        // Support legacy calls that passed a message string as the third parameter
        // or the newer style where third param is numeric status code and fourth is message.
        let statusCode = 200;
        let message = maybeMessage;

        if (typeof statusOrMessage === 'number') {
            statusCode = statusOrMessage;
        } else if (typeof statusOrMessage === 'string') {
            // If a string was passed as the third arg, treat it as the message and use 200
            message = statusOrMessage;
            statusCode = 200;
        }

        const payload = { status: 'success', data };
        if (message) payload.message = message;

        return res.status(statusCode).json(payload);
    }

    /**
     * Standardizes error responses.
     * @param {object} res - Express response object.
     * @param {string} message - The error message.
     * @param {number} statusCode - HTTP status code (default 500).
     */
    error(res, message = 'Internal Server Error', statusCode = 500) {
        console.error("API Error:", message);
        return res.status(statusCode).json({
            status: 'error',
            message: message,
        });
    }
}