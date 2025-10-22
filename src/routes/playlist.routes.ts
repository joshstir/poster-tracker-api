import { Router } from 'express';
import playlistController from '../controllers/playlist.controller';
import { authenticateAzureAD } from '../middleware/auth';
import { playlistValidation, playlistUpdateValidation } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticateAzureAD);

// CRUD operations
router.post('/', playlistValidation, playlistController.createPlaylist);
router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylist);
router.put('/:id', playlistUpdateValidation, playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);

export default router;
