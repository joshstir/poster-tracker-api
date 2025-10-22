import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import tagService from '../services/tag.service';

export class TagController {
  async getPredefinedTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tags = await tagService.getPredefinedTags();
      res.json({ tags });
    } catch (error) {
      console.error('Error fetching predefined tags:', error);
      res.status(500).json({ error: 'Failed to fetch predefined tags' });
    }
  }

  async getUserTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const tags = await tagService.getUserTags(userId);
      res.json({ tags });
    } catch (error) {
      console.error('Error fetching user tags:', error);
      res.status(500).json({ error: 'Failed to fetch user tags' });
    }
  }

  async createUserTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const { name } = req.body;

      const result = await tagService.createUserTag(userId, name);

      if (result.created) {
        res.status(201).json({ tag: result.name });
      } else {
        res.status(200).json({ tag: result.name, message: 'Tag already exists' });
      }
    } catch (error) {
      console.error('Error creating user tag:', error);
      res.status(500).json({ error: 'Failed to create user tag' });
    }
  }
}

export default new TagController();
