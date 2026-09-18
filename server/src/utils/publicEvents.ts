/** Eventos visíveis no app público (mapa, pulse, listagens). */
export const PUBLIC_EVENT_STATUS_FILTER = {
  status: { $nin: ['pending', 'rejected'] as string[] },
};

export function isPublicEventStatus(status: string | undefined): boolean {
  return status !== 'pending' && status !== 'rejected';
}
