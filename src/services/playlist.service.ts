import prisma from '../config/database';
import { PlaylistCreateInput, PlaylistUpdateInput } from '../types';

class PlaylistService {
  async createPlaylist(userId: string, data: PlaylistCreateInput) {
    const { title, tags = [], posterIds = [] } = data;

    // Create the playlist
    const playlist = await prisma.playlist.create({
      data: {
        userId,
        title,
      },
    });

    // Add tags if provided
    if (tags.length > 0) {
      await this.updatePlaylistTags(playlist.id, userId, tags);
    }

    // Add posters if provided
    if (posterIds.length > 0) {
      await this.updatePlaylistPosters(playlist.id, userId, posterIds);
    }

    return this.getPlaylistById(playlist.id, userId);
  }

  async getPlaylistById(playlistId: number, userId: string) {
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
        posters: {
          include: {
            poster: {
              include: {
                tags: {
                  include: {
                    predefinedTag: true,
                    userTag: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!playlist) {
      return null;
    }

    return this.formatPlaylist(playlist);
  }

  async getAllPlaylists(userId: string) {
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        tags: {
          include: {
            predefinedTag: true,
            userTag: true,
          },
        },
        posters: {
          include: {
            poster: {
              include: {
                tags: {
                  include: {
                    predefinedTag: true,
                    userTag: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return playlists.map((playlist) => this.formatPlaylist(playlist));
  }

  async updatePlaylist(
    playlistId: number,
    userId: string,
    data: PlaylistUpdateInput
  ) {
    const { title, tags, posterIds } = data;

    // Update basic fields
    if (title) {
      await prisma.playlist.update({
        where: {
          id: playlistId,
          userId,
        },
        data: { title },
      });
    }

    // Update tags if provided
    if (tags !== undefined) {
      await this.updatePlaylistTags(playlistId, userId, tags);
    }

    // Update posters if provided
    if (posterIds !== undefined) {
      await this.updatePlaylistPosters(playlistId, userId, posterIds);
    }

    return this.getPlaylistById(playlistId, userId);
  }

  async deletePlaylist(playlistId: number, userId: string) {
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
    });

    if (!playlist) {
      return false;
    }

    await prisma.playlist.delete({
      where: { id: playlistId },
    });

    return true;
  }

  private async updatePlaylistTags(
    playlistId: number,
    userId: string,
    tags: string[]
  ) {
    // Delete existing tags
    await prisma.playlistTag.deleteMany({
      where: { playlistId },
    });

    // Add new tags
    for (const tagName of tags) {
      // Check if it's a predefined tag
      const predefinedTag = await prisma.predefinedTag.findUnique({
        where: { name: tagName },
      });

      if (predefinedTag) {
        await prisma.playlistTag.create({
          data: {
            playlistId,
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

        await prisma.playlistTag.create({
          data: {
            playlistId,
            userTagId: userTag.id,
          },
        });
      }
    }
  }

  private async updatePlaylistPosters(
    playlistId: number,
    userId: string,
    posterIds: number[]
  ) {
    // Delete existing posters
    await prisma.playlistPoster.deleteMany({
      where: { playlistId },
    });

    // Verify all posters belong to user and add them
    for (const posterId of posterIds) {
      const poster = await prisma.poster.findFirst({
        where: {
          id: posterId,
          userId,
        },
      });

      if (poster) {
        await prisma.playlistPoster.create({
          data: {
            playlistId,
            posterId,
          },
        });
      }
    }
  }

  private formatPlaylist(playlist: any) {
    return {
      id: playlist.id,
      title: playlist.title,
      tags: playlist.tags.map((tag: any) =>
        tag.predefinedTag?.name || tag.userTag?.name
      ),
      posters: playlist.posters.map((pp: any) => ({
        id: pp.poster.id,
        title: pp.poster.title,
        year: pp.poster.year,
        imageUrl: pp.poster.imageUrl,
        tags: pp.poster.tags.map((tag: any) =>
          tag.predefinedTag?.name || tag.userTag?.name
        ),
      })),
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }
}

export default new PlaylistService();
