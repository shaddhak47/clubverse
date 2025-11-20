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
     * @param {number} statusCode - HTTP status code (default 200).
     */
    success(res, data, statusCode = 200) {
        return res.status(statusCode).json({
            status: 'success',
            data: data,
        });
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