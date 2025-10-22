import prisma from '../config/database';
import { PosterCreateInput, PosterUpdateInput, PosterSearchQuery } from '../types';
import storageService from './storage.service';

class PosterService {
  async createPoster(
    userId: string,
    data: PosterCreateInput,
    imageUrl: string
  ) {
    const { title, year, tags } = data;

    // Create the poster
    const poster = await prisma.poster.create({
      data: {
        userId,
        title,
        year,
        imageUrl,
      },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
      },
    });

    // Add tags if provided
    if (tags && tags.length > 0) {
      await this.updatePosterTags(poster.id, userId, tags);
    }

    // Fetch and return the complete poster with tags
    return this.getPosterById(poster.id, userId);
  }

  async getPosterById(posterId: number, userId: string) {
    const poster = await prisma.poster.findFirst({
      where: {
        id: posterId,
        userId,
      },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
      },
    });

    if (!poster) {
      return null;
    }

    return this.formatPoster(poster);
  }

  async getAllPosters(userId: string) {
    const posters = await prisma.poster.findMany({
      where: { userId },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posters.map((poster) => this.formatPoster(poster));
  }

  async updatePoster(
    posterId: number,
    userId: string,
    data: PosterUpdateInput
  ) {
    const { title, year, tags } = data;

    // Update basic fields
    const poster = await prisma.poster.update({
      where: {
        id: posterId,
        userId,
      },
      data: {
        ...(title && { title }),
        ...(year && { year }),
      },
    });

    // Update tags if provided
    if (tags) {
      await this.updatePosterTags(posterId, userId, tags);
    }

    return this.getPosterById(posterId, userId);
  }

  async deletePoster(posterId: number, userId: string) {
    const poster = await prisma.poster.findFirst({
      where: {
        id: posterId,
        userId,
      },
    });

    if (!poster) {
      return false;
    }

    // Delete image from storage
    await storageService.deleteImage(poster.imageUrl);

    // Delete poster (cascades to tags and playlist associations)
    await prisma.poster.delete({
      where: { id: posterId },
    });

    return true;
  }

  async searchPosters(userId: string, query: PosterSearchQuery) {
    const { title, year, tags } = query;

    const posters = await prisma.poster.findMany({
      where: {
        userId,
        ...(title && {
          title: {
            contains: title,
            mode: 'insensitive',
          },
        }),
        ...(year && { year }),
        ...(tags &&
          tags.length > 0 && {
            tags: {
              some: {
                OR: [
                  {
                    predefinedTag: {
                      name: { in: tags },
                    },
                  },
                  {
                    userTag: {
                      name: { in: tags },
                    },
                  },
                ],
              },
            },
          }),
      },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posters.map((poster) => this.formatPoster(poster));
  }

  private async updatePosterTags(
    posterId: number,
    userId: string,
    tags: string[]
  ) {
    // Delete existing tags
    await prisma.posterTag.deleteMany({
      where: { posterId },
    });

    // Add new tags
    for (const tagName of tags) {
      // Check if it's a predefined tag
      const predefinedTag = await prisma.predefinedTag.findUnique({
        where: { name: tagName },
      });

      if (predefinedTag) {
        await prisma.posterTag.create({
          data: {
            posterId,
            predefinedTagId: predefinedTag.id,
          },
        });
      } else {
        // Check if user tag exists
        let userTag = await prisma.userTag.findUnique({
          where: {
            userId_name: {
              userId,
              name: tagName,
            },
          },
        });

        // Create user tag if it doesn't exist
        if (!userTag) {
          userTag = await prisma.userTag.create({
            data: {
              userId,
              name: tagName,
            },
          });
        }

        await prisma.posterTag.create({
          data: {
            posterId,
            userTagId: userTag.id,
          },
        });
      }
    }
  }

  private formatPoster(poster: any) {
    return {
      id: poster.id,
      title: poster.title,
      year: poster.year,
      imageUrl: poster.imageUrl,
      tags: poster.tags.map((tag: any) =>
        tag.predefinedTag?.name || tag.userTag?.name
      ),
      createdAt: poster.createdAt,
      updatedAt: poster.updatedAt,
    };
  }
}

export default new PosterService();
