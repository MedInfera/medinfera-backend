const router = require('express').Router();
const c = require('./doctors.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createDoctorProfileSchema, updateDoctorProfileSchema, scheduleSchema, leaveSchema } = require('./doctors.validation');

router.use(protect);

router.get('/', authorize('SUPER_ADMIN','ADMIN','RECEPTIONIST','NURSE','BILLING'), c.findAll);
router.post('/', authorize('SUPER_ADMIN','ADMIN'), validate(createDoctorProfileSchema), c.create);
router.get('/:id', authorize('SUPER_ADMIN','ADMIN','DOCTOR','RECEPTIONIST','NURSE'), c.findById);
router.patch('/:id', authorize('SUPER_ADMIN','ADMIN','DOCTOR'), validate(updateDoctorProfileSchema), c.update);
router.get('/:id/dashboard', authorize('SUPER_ADMIN','ADMIN','DOCTOR'), c.getDashboard);
router.post('/:id/schedules', authorize('SUPER_ADMIN','ADMIN','DOCTOR'), validate(scheduleSchema), c.upsertSchedule);
router.delete('/:id/schedules/:scheduleId', authorize('SUPER_ADMIN','ADMIN','DOCTOR'), c.deleteSchedule);
router.post('/:id/leaves', authorize('SUPER_ADMIN','ADMIN','DOCTOR'), validate(leaveSchema), c.addLeave);
router.delete('/:id/leaves/:leaveId', authorize('SUPER_ADMIN','ADMIN'), c.removeLeave);

module.exports = router;
