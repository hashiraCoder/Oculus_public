import { Router } from 'express';
import AuthController from '../controllers/auth.controller.js';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/forgot-password', validateForgotPassword, AuthController.forgotPassword);
router.post('/reset-password', validateResetPassword, AuthController.resetPassword);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', ...AuthController.logoutAll);


export default router;
