const router = require('express').Router();
const c = require('./beds.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const {
  createWardSchema,
  updateWardSchema,
  createBedSchema,
  updateBedStatusSchema,
} = require('./beds.validation');

router.use(protect);

const VIEW_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'BILLING'];

// Ward Routes
router.get('/wards', authorize(...VIEW_ROLES), c.getWards);
router.post('/wards', authorize('SUPER_ADMIN', 'ADMIN'), validate(createWardSchema), c.createWard);
router.get('/wards/:id', authorize(...VIEW_ROLES), c.getWardById);
router.patch('/wards/:id', authorize('SUPER_ADMIN', 'ADMIN'), validate(updateWardSchema), c.updateWard);

// Stats
router.get('/stats', authorize('SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR'), c.getOccupancyStats);

// Bed Routes
router.get('/', authorize(...VIEW_ROLES), c.getBeds);
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), validate(createBedSchema), c.createBed);
router.get('/:id', authorize(...VIEW_ROLES), c.getBedById);
router.patch('/:id/status', authorize('SUPER_ADMIN', 'ADMIN', 'NURSE'), c.updateBedStatus);

module.exports = router;
