import MonitoredInstagramProfileModel from '../../models/monitoredInstagramProfile';
import { createInstagramAdapter } from '../../instagram/adapters/createInstagramAdapter';
import { InstagramAdapter } from '../../instagram/types';
import { createEventExtractorService } from '../eventExtractor/EventExtractorService';
import { createOcrService } from '../ocr/TesseractOcrService';
import { StoriesService } from './StoriesService';
import { StoryProcessingPipeline } from './storyProcessingPipeline';
import { hashString } from '../../utils/mediaDownload';

export class InstagramCollectorService {
  constructor(
    private readonly adapter: InstagramAdapter,
    private readonly storiesService: StoriesService,
    private readonly pipeline: StoryProcessingPipeline
  ) {}

  static createDefault(): InstagramCollectorService {
    const adapter = createInstagramAdapter();
    const storiesService = new StoriesService();
    const pipeline = new StoryProcessingPipeline(
      createOcrService(),
      createEventExtractorService(),
      storiesService
    );
    return new InstagramCollectorService(adapter, storiesService, pipeline);
  }

  async runCollectionCycle(): Promise<void> {
    const adapterName = process.env.INSTAGRAM_ADAPTER || 'instagrapi';
    const profiles = await MonitoredInstagramProfileModel.find({ active: true }).lean();
    // eslint-disable-next-line no-console
    console.log(
      `[Instagram] ========== Coleta iniciada (${profiles.length} perfil(is), adapter=${adapterName}) ==========`
    );

    if (profiles.length === 0) {
      // eslint-disable-next-line no-console
      console.log(
        '[Instagram] Nenhum perfil ativo. Cadastre via POST /api/admin/instagram-profiles'
      );
      return;
    }

    for (const profile of profiles) {
      const username = String(profile.username).replace(/^@/, '');
      const venueId = String(profile.venueId);
      const now = new Date().toISOString();

      // eslint-disable-next-line no-console
      console.log(`[Instagram] Checking @${username}`);

      try {
        // eslint-disable-next-line no-console
        console.log(`[Instagram] Buscando stories de @${username} (venueId=${venueId})…`);
        const stories = await this.adapter.getStories(username);
        // eslint-disable-next-line no-console
        console.log(`[Instagram] API retornou ${stories.length} story/stories para @${username}`);
        for (const s of stories) {
          // eslint-disable-next-line no-console
          console.log(
            `[Instagram]   · id=${s.mediaId} type=${s.mediaType} at=${s.timestamp || '?'}`
          );
        }

        const newStories = [];
        for (const item of stories) {
          const existing = await this.storiesService.findByMediaId(item.mediaId);
          if (existing) continue;
          const contentHash = hashString(`${item.mediaId}:${item.mediaUrl}`);
          await this.storiesService.registerNewStory({ item, venueId, contentHash });
          newStories.push(item);
        }

        // eslint-disable-next-line no-console
        console.log(
          `[Instagram] ${newStories.length} story/stories novos para processar (@${username})`
        );

        for (const item of newStories) {
          try {
            await this.pipeline.processStoryRecord({
              instagramMediaId: item.mediaId,
              username: item.username,
              venueId,
              mediaType: item.mediaType,
              mediaUrl: item.mediaUrl,
              thumbnailUrl: item.thumbnailUrl,
              timestamp: item.timestamp,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            // eslint-disable-next-line no-console
            console.log(`[Instagram] Story pipeline error @${username} ${item.mediaId}: ${message}`);
          }
        }

        // eslint-disable-next-line no-console
        console.log(`[Instagram] OK @${username}`);

        await MonitoredInstagramProfileModel.findOneAndUpdate(
          { id: profile.id },
          {
            lastCheckedAt: now,
            lastSuccessfulCheckAt: now,
            lastError: '',
            lastErrorStage: '',
            updatedAt: now,
          }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error(`[Instagram] ERRO @${username}: ${message}`);
        await MonitoredInstagramProfileModel.findOneAndUpdate(
          { id: profile.id },
          {
            lastCheckedAt: now,
            lastError: message,
            lastErrorStage: 'COLLECTION_ERROR',
            lastErrorAt: now,
            updatedAt: now,
          }
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log('[Instagram] ========== Coleta finalizada ==========');
  }
}
