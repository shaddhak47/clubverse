import express from 'express';
import QRController from '../controllers/qrController.js';

const router = express.Router();

router.post('/validate', QRController.validate);

export default router;
