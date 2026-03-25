const router = require('express').Router();
const c = require('./appointments.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const {
  createAppointmentSchema, updateAppointmentSchema,
  updateStatusSchema, rescheduleSchema,
} = require('./appointments.validation');

const STAFF = ['SUPER_ADMIN','ADMIN','DOCTOR','RECEPTIONIST','NURSE','BILLING'];

router.use(protect);

router.get('/', authorize(...STAFF, 'PATIENT'), c.findAll);
router.post('/', authorize('ADMIN','RECEPTIONIST','DOCTOR'), validate(createAppointmentSchema), c.create);
router.get('/slots/:doctorId', authorize(...STAFF), c.getSlots);
router.get('/:id', authorize(...STAFF, 'PATIENT'), c.findById);
router.patch('/:id/status', authorize('ADMIN','RECEPTIONIST','DOCTOR','NURSE'), validate(updateStatusSchema), c.updateStatus);
router.post('/:id/reschedule', authorize('ADMIN','RECEPTIONIST','DOCTOR'), validate(rescheduleSchema), c.reschedule);

module.exports = router;
