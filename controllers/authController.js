import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { signToken } from '../config/jwt.js';

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'email and password required' });

      const user = await db.oneOrNone(
        `SELECT user_id, name, email, password_hash, role, is_active FROM users WHERE email = $1`,
        [email]
      );

      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      // create JWT
      const token = signToken({ user_id: user.user_id, email: user.email, role: user.role });

      // update last_login
      try {
        await db.none(`UPDATE users SET last_login = NOW() WHERE user_id = $1`, [user.user_id]);
      } catch (e) {
        console.warn('Failed to update last_login:', e.message);
      }

      return res.json({ status: 'success', token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error('Auth login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export default AuthController;
