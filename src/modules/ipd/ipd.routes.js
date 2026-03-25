const router = require('express').Router();
const c = require('./ipd.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const {
  admitSchema,
  dischargeSchema,
  transferBedSchema,
  addAttendingDoctorSchema,
  addNoteSchema,
  updateStatusSchema,
} = require('./ipd.validation');

router.use(protect);

const CLINICAL = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];

router.get('/',                   authorize(...CLINICAL, 'BILLING'), c.findAll);
router.post('/',                  authorize('ADMIN', 'RECEPTIONIST', 'DOCTOR'), validate(admitSchema), c.admit);
router.get('/:id',                authorize(...CLINICAL, 'BILLING'), c.findById);
router.patch('/:id/status',       authorize(...CLINICAL), validate(updateStatusSchema), c.updateStatus);
router.post('/:id/discharge',     authorize('ADMIN', 'DOCTOR'), validate(dischargeSchema), c.discharge);
router.post('/:id/transfer-bed',  authorize('ADMIN', 'NURSE', 'DOCTOR'), validate(transferBedSchema), c.transferBed);
router.post('/:id/doctors',       authorize('ADMIN', 'DOCTOR'), validate(addAttendingDoctorSchema), c.addAttendingDoctor);
router.post('/:id/notes',         authorize(...CLINICAL), validate(addNoteSchema), c.addNote);

module.exports = router;
