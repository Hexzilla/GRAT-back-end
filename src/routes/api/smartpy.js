const router = require('express').Router();

router.get('/', function(req, res, next){
  console.log('smartpy');
  res.json({ success: true })
});

module.exports = router;
