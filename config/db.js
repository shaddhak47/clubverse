import pgp from 'pg-promise';

// --- Connection Options ---
const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'campus_activity',
    user: process.env.DB_USER || 'postgres',
    // Ensure this is the correct password or uses the fallback
    password: process.env.DB_PASSWORD || 'your_actual_password_here', 
};

// Initialize pg-promise
const pgr = pgp({});
const dbInstance = pgr(connectionOptions);

// The custom object that provides all necessary query methods
const db = {
    // Basic query execution (returns a result object)
    query: (text, params) => {
        return dbInstance.query(text, params);
    },
    
    // Executes a query and expects 0 or more results (used by getProcteeList)
    any: (text, params) => {
        return dbInstance.any(text, params);
    },

    // Executes a query and expects exactly one result
    one: (text, params) => {
        return dbInstance.one(text, params);
    },

    // Executes a query and expects 0 or 1 result (Ideal for UPDATE/SELECT by ID)
    oneOrNone: (text, params) => {
        return dbInstance.oneOrNone(text, params);
    },
    
    // Executes a query and expects 0 or more results (synonym for any)
    many: (text, params) => {
        return dbInstance.many(text, params);
    },

    // Executes a query and expects no result
    none: (text, params) => {
        return dbInstance.none(text, params);
    },
};

// FIX: Exporting the full set of methods
export default db; 

// Test the connection immediately on import
dbInstance.connect()
    .then(obj => {
        console.log("Database connection successful to: " + connectionOptions.database);
        obj.done(); // release the connection
    })
    .catch(error => {
        console.error('Database connection FAILED. Check credentials/config/password.', error.message);
    });