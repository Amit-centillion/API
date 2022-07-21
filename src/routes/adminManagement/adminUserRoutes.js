import express from 'express';
import { validator } from '../../validation';
import { authMiddleware, resetPasswordMiddleware } from '../../middleware';
import { adminUserController } from '../../controllers';
import { fileUpload } from '../../utils';
const router = express.Router();

// call_back CRUD Routes
router.post(
	'/create',
	validator.adminUserValidation,
	fileUpload.upload.single('profileImage'),
	authMiddleware,
	adminUserController.adminUserCreate,
);
router.post('/login', adminUserController.adminUserLogin);

router.get('/get', authMiddleware, adminUserController.adminUserList);
router.put(
	'/update/:id',
	validator.adminUserValidation,
	fileUpload.upload.single('profileImage'),
	authMiddleware,

	adminUserController.adminUserUpdate,
);
router.put('/status/:id', authMiddleware, adminUserController.adminUserStatus);
router.delete(
	'/delete/:id',
	authMiddleware,
	adminUserController.adminUserDelete,
);

router.put(
	'/changePassword',
	authMiddleware,
	adminUserController.adminUserChangePassword,
);

router.post('/forget-password', adminUserController.forgetPassword);
router.put(
	'/reset-password',
	resetPasswordMiddleware,
	adminUserController.resetPassword,
);

module.exports = router;
