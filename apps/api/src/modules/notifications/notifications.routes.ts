import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { NotificationsController } from './notifications.controller';

const router = Router();

router.get('/', authenticate, NotificationsController.list);
router.get('/unread-count', authenticate, NotificationsController.unreadCount);
router.post('/daily-reminder', (req, res, next) => {
  const internalKey = req.headers['x-internal-key'];
  if (!internalKey || internalKey !== process.env.JWT_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized internal call' });
  }
  next();
}, NotificationsController.sendDailyReminders);
router.patch('/:id/read', authenticate, NotificationsController.markRead);
router.patch('/:id/dismiss', authenticate, NotificationsController.dismiss);

export default router;
