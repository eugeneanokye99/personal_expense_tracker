import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { AuthController } from './auth.controller';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.get('/gmail', authenticate, AuthController.initiateGmailOAuth);
router.get('/gmail/callback', AuthController.gmailOAuthCallback);

export default router;
