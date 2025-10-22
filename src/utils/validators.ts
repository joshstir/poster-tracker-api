import { body } from 'express-validator';

export const posterValidation = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be a valid year'),
];

export const posterUpdateValidation = [
  body('title').optional().trim(),
  body('year')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be a valid year'),
];

export const playlistValidation = [
  body('title').notEmpty().withMessage('Title is required').trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('posterIds').optional().isArray().withMessage('Poster IDs must be an array'),
];

export const playlistUpdateValidation = [
  body('title').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('posterIds').optional().isArray().withMessage('Poster IDs must be an array'),
];

export const userTagValidation = [
  body('name').notEmpty().withMessage('Tag name is required').trim(),
];
