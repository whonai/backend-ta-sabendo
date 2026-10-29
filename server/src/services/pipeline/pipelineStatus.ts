import EventModel from '../../models/event';
import MonitoredInstagramProfileModel from '../../models/monitoredInstagramProfile';
import VenueModel from '../../models/venue';
import { getAdminVenueInstagramQueues } from '../osm/adminVenueDiscoveryService';

export async function getPipelineStatus() {
  const [venues, osmVenues, withIg, monitored, pendingEvents, igQueue] = await Promise.all([
    VenueModel.countDocuments(),
    VenueModel.countDocuments({ source: 'osm' }),
    VenueModel.countDocuments({ instagramUsername: { $exists: true, $ne: '' } }),
    MonitoredInstagramProfileModel.countDocuments({ active: true }),
    EventModel.countDocuments({ status: 'pending' }),
    getAdminVenueInstagramQueues(),
  ]);

  return {
    venues: {
      total: venues,
      fromOsm: osmVenues,
      withInstagramUsername: withIg,
      instagramQueuePending: igQueue.counts.pending,
      instagramQueueMonitored: igQueue.counts.monitored,
      instagramQueueHiddenNotPriority: igQueue.counts.hiddenNotPriority,
    },
    instagram: { monitoredProfilesActive: monitored },
    events: { pendingReview: pendingEvents },
    dailyCollection: {
      schedulerEnabled: (process.env.ENABLE_INSTAGRAM_COLLECTOR || 'false').toLowerCase() === 'true',
      intervalMinutes: Number(process.env.INSTAGRAM_COLLECTION_INTERVAL_MINUTES || '1440'),
    },
  };
}
