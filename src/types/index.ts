import { Request } from 'express';

export interface JwtPayload {
  oid: string; // Azure AD Object ID
  email?: string;
  name?: string;
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    azureId: string;
  };
}

export interface PosterCreateInput {
  title: string;
  year: number;
  tags: string[];
}

export interface PosterUpdateInput {
  title?: string;
  year?: number;
  tags?: string[];
}

export interface PlaylistCreateInput {
  title: string;
  tags?: string[];
  posterIds?: number[];
}

export interface PlaylistUpdateInput {
  title?: string;
  tags?: string[];
  posterIds?: number[];
}

export interface PosterSearchQuery {
  title?: string;
  year?: number;
  tags?: string[];
}
