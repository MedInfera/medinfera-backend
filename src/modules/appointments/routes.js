// Appointments routes — managed by Priyanshi
const router = require('express').Router();
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Appointments module working ✅' });
});
module.exports = router;