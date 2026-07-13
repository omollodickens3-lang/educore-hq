const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getClasses,
  createClass,
  updateClass,
  deleteClass
} = require('../controllers/classController');

router.get('/', authenticate, getClasses);
router.post('/', authenticate, createClass);
router.put('/:id', authenticate, updateClass);
router.delete('/:id', authenticate, deleteClass);

module.exports = router;
