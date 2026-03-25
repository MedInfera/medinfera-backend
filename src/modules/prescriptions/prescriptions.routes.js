const router = require('express').Router();
const c = require('./prescriptions.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createPrescriptionSchema, dispenseSchema } = require('./prescriptions.validation');

router.use(protect);

router.get('/',         authorize('SUPER_ADMIN','ADMIN','DOCTOR','PHARMACIST','NURSE'), c.getPrescriptions);
router.post('/',        authorize('DOCTOR'), validate(createPrescriptionSchema), c.createPrescription);
router.get('/:id',      authorize('SUPER_ADMIN','ADMIN','DOCTOR','PHARMACIST','NURSE','PATIENT'), c.getPrescriptionById);
router.post('/dispense',authorize('PHARMACIST','ADMIN'), validate(dispenseSchema), c.dispensePrescription);

module.exports = router;
