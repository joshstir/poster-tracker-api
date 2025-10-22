import { Router } from 'express';
import tagController from '../controllers/tag.controller';
import { authenticateAzureAD } from '../middleware/auth';
import { userTagValidation } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticateAzureAD);

// Tag operations
router.get('/predefined', tagController.getPredefinedTags);
router.get('/user', tagController.getUserTags);
router.post('/user', userTagValidation, tagController.createUserTag);

export default router;
