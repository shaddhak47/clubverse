import BaseController from './BaseController.js'; 

export default class ProctorController extends BaseController {
    constructor(db) {
        super(db);
    }
    
    /* 1. Get Proctee List */
    async getProcteeList(req, res) {
        // proctorId passed as :id
        const proctorId = parseInt(req.params.id, 10);
        const semester = req.query.semester ? parseInt(req.query.semester, 10) : null;

        if (!proctorId || !semester) {
            return this.error(res, "Missing proctor ID or semester.", 400);
        }

        try {
            const query = `
                SELECT 
                    u.user_id AS student_id,
                    u.name AS student_name,
                    d.name AS dept_name,
                    sd.usn,
                    sd.semester AS semester,
                    sd.proctor_id
                FROM users u
                JOIN student_details sd ON u.user_id = sd.user_id
                LEFT JOIN departments d ON sd.dept_id = d.dept_id
                WHERE sd.semester = $1 AND sd.proctor_id = $2
                ORDER BY u.name;
            `;

            const values = [semester, proctorId];
            const procteeList = await this.db.any(query, values);

            return this.success(res, procteeList, 200, `Retrieved ${procteeList.length} proctees for semester ${semester}.`);
        } catch (error) {
            console.error("Database Error in getProcteeList:", error.message);
            return this.error(res, "Could not fetch proctee list due to a database error.", 500);
        }
    }
    
    /* 2. Award Points */
    async awardPoints(req, res) { 
        const { user_id, event_id, points, category, semester, awarded_by } = req.body;
        
        if (!user_id || points === undefined || !category || !semester || !awarded_by) {
            return this.error(res, "Missing required fields for point award (user_id, points, category, semester, awarded_by).", 400);
        }
        
        try {
            const query = `
                INSERT INTO activity_points (user_id, event_id, points, category, semester, awarded_by, awarded_at) 
                VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                RETURNING *;
            `;
            const values = [user_id, event_id || null, points, category, parseInt(semester, 10), awarded_by];
            
            const result = await this.db.one(query, values); 
            
            return this.success(res, result, 200, "Activity points awarded successfully.");
        } catch (error) {
            if (error.code === '23503') {
                // Catches FK violation on user_id, event_id, or awarded_by
                console.error("FK Violation details:", error.detail);
                return this.error(res, "Foreign Key Violation: The User ID, Proctor ID, or Event ID provided does not exist in the database.", 409);
            }
            console.error("Database Error during awardPoints:", error.message);
            return this.error(res, "A database error occurred while awarding points.", 500);
        }
    }

    /* 3. Verify Document */
    async verifyDocument(req, res) {
        // The route uses registration_id as the parameter: /registrations/:id/verify-doc
        const registration_id = req.params.id;
        const { verification_status, verified_by, remarks } = req.body;

        if (!registration_id || !verification_status || !verified_by) {
            return this.error(res, "Missing registration ID, status, or verifier ID.", 400);
        }

        const validStatuses = ['approved', 'rejected'];
        if (!validStatuses.includes(verification_status)) {
            return this.error(res, "Invalid verification status provided.", 400);
        }

        try {
            // Find the most recent activity_docs row for this registration (avoid updating multiple rows)
            const docRow = await this.db.oneOrNone(
                `SELECT doc_id FROM activity_docs WHERE registration_id = $1 ORDER BY doc_id DESC LIMIT 1`,
                [registration_id]
            );

            if (!docRow) {
                return this.error(res, `Document for registration ID ${registration_id} not found.`, 404);
            }

            const query = `
                UPDATE activity_docs
                SET 
                    verification_status = $1,
                    verified_by = $2,
                    verified_at = NOW(),
                    description = COALESCE($4, description)
                WHERE doc_id = $3
                RETURNING *;
            `;

            const values = [verification_status, verified_by, docRow.doc_id, remarks || null];

            const updatedDocument = await this.db.oneOrNone(query, values);

            if (!updatedDocument) {
                return this.error(res, `Document (id ${docRow.doc_id}) could not be updated.`, 500);
            }

            return this.success(res, updatedDocument, 200, "Document verification status updated successfully.");

        } catch (error) {
            if (error.code === '23503') {
                return this.error(res, "Foreign Key Violation: The Verifier ID does not exist in the users table.", 409);
            }
            console.error("Database Error during verifyDocument:", error.message);
            return this.error(res, "A database error occurred while updating the document.", 500);
        }
    }

    /* 4. Get Events */
    async getEvents(req, res) {
        const proctorId = parseInt(req.params.id, 10);
        const category = req.query.category || null;
        const deptId = req.query.dept_id ? parseInt(req.query.dept_id, 10) : null;
        const semester = req.query.semester ? parseInt(req.query.semester, 10) : null;

        if (!proctorId) {
            return this.error(res, "Missing proctor ID.", 400);
        }

        try {
            // Build dynamic WHERE
            const params = [proctorId];
            let where = `WHERE (e.dept_id = $2 OR e.dept_id IS NULL)`; // $2 will be deptId when provided

            // If deptId provided, add it as $2 and adjust params; otherwise set a dummy null to keep parameter positions
            if (deptId) {
                params.push(deptId);
            } else {
                params.push(null);
            }

            if (category) {
                params.push(category);
                where += ` AND e.category = $${params.length}`;
            }

            // Main query returns events (including external ones where dept_id IS NULL)
            const query = `
                SELECT 
                    e.event_id,
                    e.title AS event_name,
                    e.start_at AS event_date,
                    e.category,
                    e.dept_id,
                    e.venue,
                    e.status,
                    (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registered_count,
                    (SELECT COUNT(*) FROM registrations r JOIN student_details sd ON r.user_id = sd.user_id WHERE r.event_id = e.event_id AND sd.proctor_id = $1 ${semester ? `AND sd.semester = ${semester}` : ''}) AS registered_by_proctees
                FROM events e
                ${where}
                ORDER BY e.start_at DESC
            `;

            const events = await this.db.any(query, params);

            const message = `Found ${events.length} events for proctor ${proctorId}.`;
            return this.success(res, events, 200, message);

        } catch (error) {
            console.error("Database Error in getEvents:", error.message);
            return this.error(res, "Internal Server Error: Could not fetch events due to database issue.", 500);
        }
    }

    /* 5. Add New Category (FIXED: Accepts 'category_name' and handles FK violation) */
    async addCategory(req, res) { 
        // Using category_name to match your Postman request body
        const { category_name, max_points, proposed_by } = req.body;
        
        if (!category_name || max_points === undefined) {
            return this.error(res, "Missing category name or maximum points.", 400);
        }

        const name = category_name;
        // Fallback to a safe ID like 1 if proposed_by is missing/null, assuming it exists
        const proposerId = proposed_by || 1; 

        try {
            const query = `
                INSERT INTO event_categories (name, max_points, proposed_by) 
                VALUES ($1, $2, $3) 
                RETURNING *;
            `;
            const values = [name, max_points, proposerId];
            
            const newCategory = await this.db.one(query, values); 
            
            return this.success(res, newCategory, 201, `Activity category '${name}' added successfully and is pending approval.`);
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                return this.error(res, `Category name '${name}' already exists.`, 409);
            }
            if (error.code === '23503') { // Foreign Key constraint violation
                return this.error(res, `Foreign Key Violation: The proposed_by user ID (${proposerId}) does not exist in the users table. Please use a valid User ID.`, 409);
            }
            console.error("Database Error during addCategory:", error.message);
            return this.error(res, "A database error occurred while adding the category.", 500);
        }
    }

    /* 6. Get Existing Categories */
    async getCategories(req, res) { 
        try {
            const query = `
                SELECT category_id, name AS category_name, max_points, status
                FROM event_categories
                ORDER BY name ASC;
            `;
            
            const categories = await this.db.any(query);
            
            return this.success(res, categories, 200, `Retrieved ${categories.length} activity categories.`);
        } catch (error) {
            console.error("Database Error during getCategories:", error.message);
            return this.error(res, "A database error occurred while fetching categories.", 500);
        }
    }
}