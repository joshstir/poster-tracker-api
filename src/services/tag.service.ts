import prisma from '../config/database';

class TagService {
  async getPredefinedTags() {
    const tags = await prisma.predefinedTag.findMany({
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => tag.name);
  }

  async getUserTags(userId: string) {
    const tags = await prisma.userTag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => tag.name);
  }

  async createUserTag(userId: string, name: string) {
    // Check if tag already exists for this user
    const existing = await prisma.userTag.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });

    if (existing) {
      return { name: existing.name, created: false };
    }

    const tag = await prisma.userTag.create({
      data: {
        userId,
        name,
      },
    });

    return { name: tag.name, created: true };
  }
}

export default new TagService();
