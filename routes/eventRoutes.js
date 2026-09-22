const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, requireOrganizer } = require('../middleware/authMiddleware');

router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);
router.post('/', authenticateToken, requireOrganizer, eventController.createEvent);
router.delete('/:id', authenticateToken, requireOrganizer, eventController.deleteEvent);

module.exports = router;
