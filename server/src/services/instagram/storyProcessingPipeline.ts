import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import EventModel from '../../models/event';
import VenueModel from '../../models/venue';
import { EventExtractorService } from '../eventExtractor/EventExtractorService';
import { OcrService } from '../../instagram/types';
import { StoriesService } from './StoriesService';
import { findLikelyDuplicateEvent } from './eventDuplicateDetection';
import { downloadToFile, ensureDir, hashFile } from '../../utils/mediaDownload';
import { dayLabelForEvent, isValidYmd, normalizeHm } from '../../utils/eventSchedule';
import { withRetry } from '../../utils/retry';

const MIN_CONFIDENCE_TO_CREATE = Number(process.env.EVENT_EXTRACTION_MIN_CONFIDENCE || '0.55');

const DEFAULT_CREATOR = {
  id: 'usr_instagram_pipeline',
  name: 'Pipeline Instagram',
  reputationLevel: 'Colaborador',
  trustworthinessScore: 70,
};

export class StoryProcessingPipeline {
  constructor(
    private readonly ocr: OcrService,
    private readonly extractor: EventExtractorService,
    private readonly storiesService: StoriesService
  ) {}

  private mediaDir(): string {
    return process.env.INSTAGRAM_MEDIA_DIR || path.join(process.cwd(), 'data', 'instagram-media');
  }

  async processStoryRecord(story: {
    instagramMediaId: string;
    username: string;
    venueId: string;
    mediaType?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    timestamp?: string;
  }): Promise<void> {
    const mediaId = story.instagramMediaId;
    // eslint-disable-next-line no-console
    console.log(`[OCR] Processing story ${mediaId}`);

    await this.storiesService.updateStory(mediaId, { processingStatus: 'PROCESSING' });

    const imageUrl =
      story.mediaType === 'video'
        ? story.thumbnailUrl || story.mediaUrl
        : story.mediaUrl || story.thumbnailUrl;

    if (!imageUrl) {
      await this.storiesService.updateStory(mediaId, {
        processingStatus: 'ERROR',
        lastError: 'No media URL for OCR',
        lastErrorStage: 'OCR_ERROR',
        processedAt: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      console.log(`[OCR] Failed for story ${mediaId} — no media URL`);
      return;
    }

    const ext = story.mediaType === 'video' ? 'jpg' : 'jpg';
    const localPath = path.join(this.mediaDir(), story.username, `${mediaId}.${ext}`);

    try {
      await ensureDir(path.dirname(localPath));
      await withRetry(() => downloadToFile(imageUrl, localPath), { maxAttempts: 3 });
      const contentHash = await hashFile(localPath);
      await this.storiesService.updateStory(mediaId, { localMediaPath: localPath, contentHash });

      const ocrResult = await withRetry(() => this.ocr.extractTextFromImage(localPath), {
        maxAttempts: 2,
      });
      // eslint-disable-next-line no-console
      console.log('[OCR] Text extracted');

      await this.storiesService.updateStory(mediaId, { ocrText: ocrResult.text });

      const permalink = `https://instagram.com/stories/${story.username}/${mediaId}`;
      const extraction = this.extractor.extractFromText(
        ocrResult.text,
        story.venueId,
        permalink,
        story.timestamp ? new Date(story.timestamp) : new Date()
      );

      if (!extraction.isEvent) {
        // eslint-disable-next-line no-console
        console.log(
          `[EventExtractor] Not an event (confidence ${extraction.confidence.toFixed(2)})`
        );
        await this.storiesService.updateStory(mediaId, {
          processingStatus: 'IGNORED',
          extractionConfidence: extraction.confidence,
          processedAt: new Date().toISOString(),
        });
        return;
      }

      // eslint-disable-next-line no-console
      console.log('[EventExtractor] Event detected');
      // eslint-disable-next-line no-console
      console.log(`[EventExtractor] Confidence: ${extraction.confidence.toFixed(2)}`);

      if (extraction.confidence < MIN_CONFIDENCE_TO_CREATE) {
        await this.storiesService.updateStory(mediaId, {
          processingStatus: 'IGNORED',
          extractionConfidence: extraction.confidence,
          processedAt: new Date().toISOString(),
        });
        return;
      }

      const dup = await findLikelyDuplicateEvent({
        venueId: story.venueId,
        title: extraction.event.title,
        date: extraction.event.date,
        startTime: extraction.event.startTime,
      });

      const venueRaw = await VenueModel.findOne({ id: story.venueId }).lean();
      const venue = venueRaw as Record<string, unknown> | null;
      const nowIso = new Date().toISOString();
      const eventId = uuidv4();

      const schedule = {
        date: isValidYmd(extraction.event.date) ? extraction.event.date : '',
        dayLabel: isValidYmd(extraction.event.date)
          ? dayLabelForEvent(extraction.event.date!, new Date())
          : 'Data a confirmar',
        startTime: extraction.event.startTime ? normalizeHm(extraction.event.startTime) : '',
        endTime: extraction.event.endTime ? normalizeHm(extraction.event.endTime) : undefined,
      };

      const priceStr =
        extraction.event.price != null ? `R$ ${extraction.event.price}` : '';

      const doc: Record<string, unknown> = {
        id: eventId,
        title: extraction.event.title || 'Evento (revisar)',
        description: extraction.event.description || ocrResult.text.slice(0, 500),
        category: extraction.event.category || 'espontaneo',
        venueName: String(venue?.name || extraction.event.venue || ''),
        address: String(venue?.address || ''),
        neighborhood: String(venue?.neighborhood || 'Centro'),
        coordinates: (venue?.coordinates as { lat: number; lng: number }) || {
          lat: -12.2575,
          lng: -38.9668,
        },
        date: schedule.date,
        dayLabel: schedule.dayLabel,
        startTime: schedule.startTime || '',
        endTime: schedule.endTime,
        price: priceStr,
        imageUrl: story.mediaUrl || '',
        externalLink: extraction.event.sourceUrl || permalink,
        interestedCount: 0,
        goingCount: 0,
        currentAttendees: 0,
        status: 'pending',
        origin: 'platform',
        venueId: story.venueId,
        confirmationsCount: 0,
        disputesCount: 0,
        evidenceCount: 0,
        reliabilityScore: Math.round(extraction.confidence * 100),
        createdBy: DEFAULT_CREATOR,
        createdAt: nowIso,
        updatedAt: nowIso,
        source: 'instagram',
        extractionConfidence: extraction.confidence,
        extractedText: ocrResult.text,
        sourceInstagramUsername: story.username,
        sourceMediaId: mediaId,
        detectedAt: nowIso,
        artist: extraction.event.artist,
        incompleteFields: extraction.incompleteFields,
        possibleDuplicateOf: dup.isLikelyDuplicate ? dup.existingEventId : undefined,
      };

      await EventModel.findOneAndUpdate({ id: eventId }, doc, { upsert: true });

      await this.storiesService.updateStory(mediaId, {
        processingStatus: 'PROCESSED',
        linkedEventId: eventId,
        extractionConfidence: extraction.confidence,
        processedAt: nowIso,
      });

      // eslint-disable-next-line no-console
      console.log('[Events] Event created as PENDING');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stage = message.toLowerCase().includes('ocr') ? 'OCR_ERROR' : 'EVENT_EXTRACTION_ERROR';
      await this.storiesService.updateStory(mediaId, {
        processingStatus: 'ERROR',
        lastError: message,
        lastErrorStage: stage,
        processedAt: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      console.log(`[OCR] Failed for story ${mediaId}`);
      throw err;
    } finally {
      try {
        await fs.access(localPath);
        if (process.env.INSTAGRAM_DELETE_MEDIA_AFTER_OCR === 'true') {
          await fs.unlink(localPath);
        }
      } catch {
        /* ignore */
      }
    }
  }
}
