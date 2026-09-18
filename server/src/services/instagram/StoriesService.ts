import { v4 as uuidv4 } from 'uuid';
import InstagramStoryModel from '../../models/instagramStory';
import { InstagramStoryItem, StoryProcessingStatus } from '../../instagram/types';

export class StoriesService {
  async findByMediaId(instagramMediaId: string) {
    return InstagramStoryModel.findOne({ instagramMediaId }).lean();
  }

  async registerNewStory(params: {
    item: InstagramStoryItem;
    venueId: string;
    contentHash?: string;
  }) {
    const existing = await this.findByMediaId(params.item.mediaId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      instagramMediaId: params.item.mediaId,
      contentHash: params.contentHash,
      username: params.item.username,
      venueId: params.venueId,
      mediaType: params.item.mediaType,
      mediaUrl: params.item.mediaUrl,
      thumbnailUrl: params.item.thumbnailUrl,
      timestamp: params.item.timestamp,
      processingStatus: 'NEW' as StoryProcessingStatus,
      createdAt: now,
      updatedAt: now,
    };
    await InstagramStoryModel.create(doc);
    return doc;
  }

  async updateStory(
    instagramMediaId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    await InstagramStoryModel.findOneAndUpdate(
      { instagramMediaId },
      { ...patch, updatedAt: new Date().toISOString() }
    );
  }
}
