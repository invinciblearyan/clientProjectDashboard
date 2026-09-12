class PresenceTracker {
  private connectionCounts = new Map<string, number>();
  private socketUsers = new Map<string, string>();

  addConnection(socketId: string, userId: string): void {
    this.socketUsers.set(socketId, userId);
    this.connectionCounts.set(userId, (this.connectionCounts.get(userId) ?? 0) + 1);
  }

  removeConnection(socketId: string): string | null {
    const userId = this.socketUsers.get(socketId);
    if (!userId) {
      return null;
    }

    this.socketUsers.delete(socketId);
    const nextCount = (this.connectionCounts.get(userId) ?? 1) - 1;

    if (nextCount <= 0) {
      this.connectionCounts.delete(userId);
      return userId;
    }

    this.connectionCounts.set(userId, nextCount);
    return null;
  }

  getOnlineUserCount(): number {
    return this.connectionCounts.size;
  }

  isUserOnline(userId: string): boolean {
    return this.connectionCounts.has(userId);
  }

  resetForTests(): void {
    this.connectionCounts.clear();
    this.socketUsers.clear();
  }
}

export const presenceTracker = new PresenceTracker();
