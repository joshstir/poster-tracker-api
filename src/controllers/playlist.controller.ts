import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import playlistService from '../services/playlist.service';

export class PlaylistController {
  async createPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const { title, tags, posterIds } = req.body;

      const playlist = await playlistService.createPlaylist(userId, {
        title,
        tags,
        posterIds,
      });

      res.status(201).json(playlist);
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  }

  async getPlaylists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const playlists = await playlistService.getAllPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  }

  async getPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const playlistId = parseInt(req.params.id);

      const playlist = await playlistService.getPlaylistById(playlistId, userId);

      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json(playlist);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      res.status(500).json({ error: 'Failed to fetch playlist' });
    }
  }

  async updatePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const playlistId = parseInt(req.params.id);
      const { title, tags, posterIds } = req.body;

      const playlist = await playlistService.updatePlaylist(playlistId, userId, {
        title,
        tags,
        posterIds,
      });

      if (!playlist) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.json(playlist);
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({ error: 'Failed to update playlist' });
    }
  }

  async deletePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const playlistId = parseInt(req.params.id);

      const deleted = await playlistService.deletePlaylist(playlistId, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Playlist not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({ error: 'Failed to delete playlist' });
    }
  }
}

export default new PlaylistController();
