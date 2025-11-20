import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getUserNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/:id/read', markNotificationRead)
router.patch('/read-all', markAllNotificationsRead)

export default router

