// Auth routes — placeholder until we write the full auth module next
const router = require('express').Router();

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth module is working ✅' });
});

module.exports = router;