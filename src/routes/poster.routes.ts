import { Router } from 'express';
import posterController from '../controllers/poster.controller';
import { authenticateAzureAD } from '../middleware/auth';
import { upload } from '../config/multer';
import { posterValidation, posterUpdateValidation } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticateAzureAD);

// Search posters (must be before /:id route)
router.get('/search', posterController.searchPosters);

// CRUD operations
router.post('/', upload.single('image'), posterValidation, posterController.createPoster);
router.get('/', posterController.getPosters);
router.get('/:id', posterController.getPoster);
router.put('/:id', posterUpdateValidation, posterController.updatePoster);
router.delete('/:id', posterController.deletePoster);

export default router;
