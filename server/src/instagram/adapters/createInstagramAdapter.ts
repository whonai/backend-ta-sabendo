import { InstagramAdapter } from '../types';
import { InstagrapiInstagramAdapter } from './InstagrapiInstagramAdapter';
import { MockInstagramAdapter } from './MockInstagramAdapter';

export function createInstagramAdapter(): InstagramAdapter {
  const mode = (process.env.INSTAGRAM_ADAPTER || 'instagrapi').trim().toLowerCase();
  if (mode === 'mock') {
    return new MockInstagramAdapter();
  }
  return new InstagrapiInstagramAdapter();
}
