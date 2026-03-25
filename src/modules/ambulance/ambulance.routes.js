const router = require('express').Router();
const c = require('./ambulance.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const {
  createAmbulanceSchema,
  updateAmbulanceSchema,
  dispatchSchema,
  updateDispatchStatusSchema,
  locationSchema,
} = require('./ambulance.validation');

router.use(protect);

const DISPATCH_ROLES = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'];
const VIEW_ROLES     = [...DISPATCH_ROLES, 'DRIVER', 'NURSE'];

// Fleet
router.get('/',       authorize(...VIEW_ROLES), c.getAmbulances);
router.post('/',      authorize('SUPER_ADMIN', 'ADMIN'), validate(createAmbulanceSchema), c.createAmbulance);
router.get('/:id',    authorize(...VIEW_ROLES), c.getAmbulanceById);
router.patch('/:id',  authorize('SUPER_ADMIN', 'ADMIN'), validate(updateAmbulanceSchema), c.updateAmbulance);

// GPS
router.post('/:id/location', authorize('DRIVER', 'ADMIN'), validate(locationSchema), c.updateLocation);
router.get('/:id/trail',     authorize(...DISPATCH_ROLES), c.getLocationTrail);

// Dispatches
router.get('/dispatches',             authorize(...VIEW_ROLES), c.getDispatches);
router.post('/dispatches',            authorize(...DISPATCH_ROLES), validate(dispatchSchema), c.createDispatch);
router.get('/dispatches/:id',         authorize(...VIEW_ROLES), c.getDispatchById);
router.patch('/dispatches/:id/status',authorize(...VIEW_ROLES), validate(updateDispatchStatusSchema), c.updateDispatchStatus);

module.exports = router;
