import db from '../config/db.js';

const QRController = {
  // POST /api/qr/validate
  // Body: { token } - header x-user-id may be used to identify user (student USN or numeric user_id)
  async validate(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'token is required' });

      const qr = await db.oneOrNone(
        `SELECT token_id, event_id, token, expires_at, issued_by FROM qr_tokens WHERE token = $1`,
        [token]
      );

      if (!qr) return res.status(404).json({ error: 'Invalid token' });

      const now = new Date();
      if (new Date(qr.expires_at) < now) {
        return res.status(410).json({ error: 'Token expired' });
      }

      // Resolve user_id from header x-user-id: could be student USN or numeric id
      let targetUserId = null;
      const header = req.headers['x-user-id'];
      if (header) {
        if (/^\d+$/.test(header)) {
          targetUserId = Number(header);
        } else {
          // treat as student USN -> lookup user_id from student_details
          const row = await db.oneOrNone(`SELECT user_id FROM student_details WHERE usn = $1`, [header]);
          if (row) targetUserId = row.user_id;
        }
      }

      // If we have a user, attempt to mark attendance in registrations
      let attendanceUpdated = false;
      if (targetUserId) {
        const result = await db.query(
          `UPDATE registrations SET status = 'attended', attendance_marked_at = NOW(), attendance_method = 'qr' WHERE event_id = $1 AND user_id = $2 RETURNING registration_id`,
          [qr.event_id, targetUserId]
        );
        if (result && result.rowCount > 0) attendanceUpdated = true;
      }

      const event = await db.oneOrNone(
        `SELECT event_id, title, category, start_at, end_at, venue FROM events WHERE event_id = $1`,
        [qr.event_id]
      );

      return res.json({ status: 'success', token: qr.token, event, attendanceMarked: attendanceUpdated });
    } catch (err) {
      console.error('QR validate error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export default QRController;
