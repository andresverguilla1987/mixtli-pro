
const express = require('express');
const { listUsers, createUser, me } = require('../controllers/usersController');
const { authRequired, requireRole } = require('../middlewares/auth');
const router = express.Router();

router.get('/', authRequired, requireRole('ADMIN'), listUsers);
router.post('/', authRequired, requireRole('ADMIN'), createUser);
router.get('/me', authRequired, me);

module.exports = router;
