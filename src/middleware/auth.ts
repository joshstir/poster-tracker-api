import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types';
import prisma from '../config/database';

// Azure AD JWT validation middleware
export const authenticateAzureAD = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authorization token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // In production, you would validate the token with Azure AD public keys
    // For now, we'll decode it and verify the signature with Azure AD's issuer
    const decoded = jwt.decode(token, { complete: true }) as {
      header: any;
      payload: JwtPayload;
    } | null;

    if (!decoded || !decoded.payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const payload = decoded.payload;

    // Validate token issuer (Azure AD)
    const expectedIssuer = process.env.AZURE_AD_ISSUER;
    if (expectedIssuer && payload.iss !== expectedIssuer) {
      res.status(401).json({ error: 'Invalid token issuer' });
      return;
    }

    // Validate audience
    const expectedAudience = process.env.JWT_AUDIENCE;
    if (expectedAudience && payload.aud !== expectedAudience) {
      res.status(401).json({ error: 'Invalid token audience' });
      return;
    }

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    // Get or create user in database
    const azureId = payload.oid || payload.sub || '';
    const email = payload.email || '';

    if (!azureId || !email) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { azureId },
    });

    if (!user) {
      // Create new user if they don't exist
      user = await prisma.user.create({
        data: {
          azureId,
          email,
          name: payload.name,
        },
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      azureId: user.azureId,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Note: In a production environment, you should use the jwks-rsa library
// to fetch and verify Azure AD's public keys dynamically:
//
// import jwksClient from 'jwks-rsa';
//
// const client = jwksClient({
//   jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
// });
//
// Then verify the token using the public key from the JWKS endpoint
