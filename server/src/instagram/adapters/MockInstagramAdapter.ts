import {
  InstagramAdapter,
  InstagramPostItem,
  InstagramProfileInfo,
  InstagramSearchUserItem,
  InstagramStoryItem,
} from '../types';

/** Adapter de desenvolvimento — não chama Instagram. */
export class MockInstagramAdapter implements InstagramAdapter {
  async getProfile(username: string): Promise<InstagramProfileInfo> {
    return { username, fullName: `Mock ${username}` };
  }

  async getStories(username: string): Promise<InstagramStoryItem[]> {
    const now = new Date().toISOString();
    return [
      {
        mediaId: `mock_${username}_${Date.now()}`,
        username,
        mediaType: 'image',
        mediaUrl: 'https://via.placeholder.com/800x1200.png?text=Mock+Story',
        timestamp: now,
      },
    ];
  }

  async getPosts(_username: string, _limit?: number): Promise<InstagramPostItem[]> {
    return [];
  }

  async searchUsers(_query: string, _limit = 5): Promise<InstagramSearchUserItem[]> {
    return [];
  }
}
