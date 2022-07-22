import express from 'express';
import { scheduleAppointmentController } from '../controllers';

const router = express.Router();

router.post('/create', scheduleAppointmentController.scheduleAppointment);
router.get('/get', scheduleAppointmentController.getScheduleAppointment);

module.exports = router;
