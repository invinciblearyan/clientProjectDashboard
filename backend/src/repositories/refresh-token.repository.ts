import type { RefreshToken } from '@prisma/client';
import { prisma } from '../utils/prisma';

export type RefreshRotationResult =
  | { status: 'rotated'; newToken: RefreshToken }
  | { status: 'reuse'; userId: string }
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'inactive' }
  | { status: 'lost_race' };

export const refreshTokenRepository = {
  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  revoke(id: string, replacedByTokenId?: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        ...(replacedByTokenId ? { replacedByTokenId } : {}),
      },
    });
  },

  revokeAllForUser(userId: string): Promise<number> {
    return prisma.refreshToken
      .updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then((result) => result.count);
  },

  /**
   * Atomically rotates a refresh token.
   * - If the token is already revoked when read, treat as reuse (revoke all for user).
   * - If two requests race on the same active token, only one wins; the loser gets lost_race (401, no revoke-all).
   */
  rotateToken(params: {
    tokenHash: string;
    newToken: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
    };
  }): Promise<RefreshRotationResult> {
    return prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash: params.tokenHash },
      });

      if (!storedToken) {
        return { status: 'not_found' };
      }

      if (storedToken.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { userId: storedToken.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { status: 'reuse', userId: storedToken.userId };
      }

      if (storedToken.expiresAt < new Date()) {
        return { status: 'expired' };
      }

      const user = await tx.user.findUnique({ where: { id: storedToken.userId } });
      if (!user || !user.isActive) {
        return { status: 'inactive' };
      }

      const claim = await tx.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (claim.count === 0) {
        return { status: 'lost_race' };
      }

      const newToken = await tx.refreshToken.create({
        data: params.newToken,
      });

      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { replacedByTokenId: newToken.id },
      });

      return { status: 'rotated', newToken };
    });
  },
};
