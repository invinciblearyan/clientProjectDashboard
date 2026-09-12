import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { hashToken } from '../utils/hash';
import {
  getRefreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { toPublicUser } from '../utils/user-mapper';
import { unauthorized } from '../utils/api-error';
import type { AuthUser } from '../types/auth';

const BCRYPT_ROUNDS = 12;

export const authService = {
  async login(email: string, password: string, req: Request) {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw unauthorized('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw unauthorized('Invalid email or password');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.role, req);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toPublicUser(user),
    };
  },

  async refresh(refreshToken: string | undefined, req: Request) {
    if (!refreshToken) {
      throw unauthorized('Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw unauthorized('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const newRefreshTokenValue = signRefreshToken({ sub: payload.sub, jti: randomUUID() });
    const newTokenHash = hashToken(newRefreshTokenValue);

    const rotation = await refreshTokenRepository.rotateToken({
      tokenHash,
      newToken: {
        userId: payload.sub,
        tokenHash: newTokenHash,
        expiresAt: getRefreshTokenExpiryDate(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    if (
      rotation.status === 'not_found' ||
      rotation.status === 'expired' ||
      rotation.status === 'inactive' ||
      rotation.status === 'lost_race'
    ) {
      throw unauthorized('Invalid or expired refresh token');
    }

    if (rotation.status === 'reuse') {
      throw unauthorized('Refresh token has been revoked');
    }

    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw unauthorized('Invalid or expired refresh token');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
      user: toPublicUser(user),
    };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    try {
      verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    if (storedToken && !storedToken.revokedAt) {
      await refreshTokenRepository.revoke(storedToken.id);
    }
  },

  async getCurrentUser(user: AuthUser) {
    const record = await userRepository.findById(user.id);

    if (!record || !record.isActive) {
      throw unauthorized('Invalid or expired access token');
    }

    return toPublicUser(record);
  },

  async issueTokenPair(userId: string, email: string, role: AuthUser['role'], req: Request) {
    const accessToken = signAccessToken({ sub: userId, email, role });
    const refreshTokenValue = signRefreshToken({ sub: userId, jti: randomUUID() });
    const tokenHash = hashToken(refreshTokenValue);

    await refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },
};
