const router = require('express').Router();
const c = require('./patients.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createPatientSchema, updatePatientSchema, vitalSignSchema } = require('./patients.validation');

const STAFF = ['SUPER_ADMIN','ADMIN','DOCTOR','RECEPTIONIST','NURSE','BILLING'];

router.use(protect);

router.get('/', authorize(...STAFF), c.findAll);
router.post('/', authorize('ADMIN','RECEPTIONIST','DOCTOR','NURSE'), validate(createPatientSchema), c.create);
router.get('/:id', authorize(...STAFF), c.findById);
router.patch('/:id', authorize('ADMIN','RECEPTIONIST','DOCTOR'), validate(updatePatientSchema), c.update);
router.delete('/:id', authorize('ADMIN'), c.remove);
router.post('/:id/vitals', authorize('DOCTOR','NURSE','RECEPTIONIST'), validate(vitalSignSchema), c.addVitals);
router.get('/:id/vitals', authorize(...STAFF), c.getVitals);
router.get('/:id/medical-history', authorize(...STAFF), c.getMedicalHistory);

module.exports = router;
