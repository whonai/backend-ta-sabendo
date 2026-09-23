import { Router } from 'express';
import VenueModel from '../models/venue';
import { toVenue } from '../mappers';
import { defaultOsmBbox, importOsmVenues } from '../services/osm/osmVenueImportService';
const router = Router();

type VenueUpsertBody = {
  id?: string;
  name?: string;
  category?: string;
  isVerified?: boolean;
  address?: string;
  neighborhood?: string;
  coordinates?: { lat?: number; lng?: number };
  photoUrl?: string;
  description?: string;
  openingHours?: string;
  activeEventsCount?: number;
  claimedByOwner?: boolean;
  source?: string;
};

export function buildVenueDocFromBody(body: VenueUpsertBody, fallbackId?: string): Record<string, unknown> | null {
  const id = String(body.id || fallbackId || '').trim();
  const name = String(body.name || '').trim();
  if (!id || !name) return null;

  const lat = body.coordinates?.lat;
  const lng = body.coordinates?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return {
    id,
    name,
    category: String(body.category || 'bares'),
    isVerified: Boolean(body.isVerified),
    address: String(body.address || ''),
    neighborhood: String(body.neighborhood || 'Centro'),
    coordinates: { lat, lng },
    photoUrl: String(body.photoUrl || ''),
    description: String(body.description || ''),
    openingHours: String(body.openingHours || ''),
    activeEventsCount: Number(body.activeEventsCount) || 0,
    claimedByOwner: body.claimedByOwner === true,
    source: String(body.source || 'admin'),
  };
}

/** Cria ou atualiza estabelecimento (id pode ser gerado no front, ex. venue_1790117042887). */
router.post('/venues', async (req, res) => {
  try {
    const doc = buildVenueDocFromBody((req.body || {}) as VenueUpsertBody);
    if (!doc) {
      return res.status(400).json({
        message: 'Campos obrigatórios: id, name, coordinates { lat, lng }',
      });
    }

    await VenueModel.findOneAndUpdate({ id: doc.id }, doc, { upsert: true, new: true });
    res.status(201).json(toVenue(doc, Number(doc.activeEventsCount) || 0));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: 'Erro ao salvar estabelecimento', error: message });
  }
});

/** Parte 1 — importa bares/locais do OpenStreetMap (Feira bbox padrão). */
router.post('/venues/import-osm', async (req, res) => {
  try {
    const bbox = {
      south: Number(req.body?.south ?? defaultOsmBbox().south),
      west: Number(req.body?.west ?? defaultOsmBbox().west),
      north: Number(req.body?.north ?? defaultOsmBbox().north),
      east: Number(req.body?.east ?? defaultOsmBbox().east),
    };
    const batchSize = Math.min(100, Math.max(10, Number(req.body?.batchSize) || 40));
    const result = await importOsmVenues(bbox, batchSize);
    res.json({
      success: true,
      message: 'Import OSM concluído',
      attribution: '© OpenStreetMap contributors (ODbL)',
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: 'Falha no import OSM', error: message });
  }
});

export default router;
