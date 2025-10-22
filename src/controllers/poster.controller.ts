import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import posterService from '../services/poster.service';
import storageService from '../services/storage.service';

export class PosterController {
  async createPoster(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Image file is required' });
        return;
      }

      const userId = req.user!.id;
      const { title, year, tags } = req.body;

      // Upload image to Azure Blob Storage
      const imageUrl = await storageService.uploadImage(req.file, userId);

      // Parse tags if provided as string
      const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

      // Create poster
      const poster = await posterService.createPoster(
        userId,
        {
          title,
          year: parseInt(year),
          tags: parsedTags,
        },
        imageUrl
      );

      res.status(201).json(poster);
    } catch (error) {
      console.error('Error creating poster:', error);
      res.status(500).json({ error: 'Failed to create poster' });
    }
  }

  async getPosters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const posters = await posterService.getAllPosters(userId);
      res.json(posters);
    } catch (error) {
      console.error('Error fetching posters:', error);
      res.status(500).json({ error: 'Failed to fetch posters' });
    }
  }

  async getPoster(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const posterId = parseInt(req.params.id);

      const poster = await posterService.getPosterById(posterId, userId);

      if (!poster) {
        res.status(404).json({ error: 'Poster not found' });
        return;
      }

      res.json(poster);
    } catch (error) {
      console.error('Error fetching poster:', error);
      res.status(500).json({ error: 'Failed to fetch poster' });
    }
  }

  async updatePoster(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const posterId = parseInt(req.params.id);
      const { title, year, tags } = req.body;

      const updateData: any = {};
      if (title) updateData.title = title;
      if (year) updateData.year = parseInt(year);
      if (tags) updateData.tags = Array.isArray(tags) ? tags : JSON.parse(tags);

      const poster = await posterService.updatePoster(posterId, userId, updateData);

      if (!poster) {
        res.status(404).json({ error: 'Poster not found' });
        return;
      }

      res.json(poster);
    } catch (error) {
      console.error('Error updating poster:', error);
      res.status(500).json({ error: 'Failed to update poster' });
    }
  }

  async deletePoster(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const posterId = parseInt(req.params.id);

      const deleted = await posterService.deletePoster(posterId, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Poster not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting poster:', error);
      res.status(500).json({ error: 'Failed to delete poster' });
    }
  }

  async searchPosters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { title, year, tags } = req.query;

      const searchQuery: any = {};
      if (title) searchQuery.title = title as string;
      if (year) searchQuery.year = parseInt(year as string);
      if (tags) {
        searchQuery.tags = Array.isArray(tags) ? tags : [tags];
      }

      const posters = await posterService.searchPosters(userId, searchQuery);
      res.json(posters);
    } catch (error) {
      console.error('Error searching posters:', error);
      res.status(500).json({ error: 'Failed to search posters' });
    }
  }
}

export default new PosterController();
