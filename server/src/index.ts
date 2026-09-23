import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import eventsRouter from './routes/events';
import urbanReportsRouter from './routes/urbanReports';
import streetsRouter from './routes/streets';
import pulseRouter, { pulseHandler } from './routes/pulse';
import venuesRouter from './routes/venues';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import debugRouter from './routes/debug';
import { connectDb } from './db';
import { startInstagramCollectorScheduler } from './services/instagram/instagramScheduler';
import { requireAdmin } from './middleware/requireAdmin';
import { getPipelineStatus } from './services/pipeline/pipelineStatus';
import { discoverInstagramForVenue } from './services/instagram/instagramDiscoverService';
import { writeInstagramError } from './services/instagram/instagramApiErrors';

const app = express();

const PORT = process.env.PORT || 3001;

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(express.json());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use('/api/events', eventsRouter);
app.use('/api/urban-reports', urbanReportsRouter);
app.use('/api/streets', streetsRouter);
app.use('/api/pulse', pulseRouter);
app.get('/api/city/pulse', pulseHandler);
app.use('/api/venues', venuesRouter);
app.use('/api/auth', authRouter);

/** Pipeline admin (registrado no app root — não depende só do admin router). */
app.get('/api/admin/pipeline/status', requireAdmin, async (_req, res) => {
  res.json(await getPipelineStatus());
});
app.post('/api/admin/venues/:id/discover-instagram', requireAdmin, async (req, res) => {
  try {
    const result = await discoverInstagramForVenue(req.params.id);
    res.json(result);
  } catch (err: unknown) {
    writeInstagramError(res, err);
  }
});

app.use('/api/admin', adminRouter);
app.use('/api/debug', debugRouter);

app.get('/api/health', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  res.status(mongoReady ? 200 : 503).json({
    ok: mongoReady,
    service: 'express',
    mongo: mongoReady ? 'connected' : 'disconnected',
    /** Se false, reinicie o server — build antigo sem pipeline admin. */
    apiBuild: 'pipeline-admin-v2',
    features: {
      adminPipeline: true,
      adminVenuesDiscover: true,
      adminVenuesImportOsm: true,
    },
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[express] unhandled error', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro interno do servidor', error: message });
    }
  }
);

connectDb()
  .then(() => {
    startInstagramCollectorScheduler();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Tá Rolando Feira backend running on port ${PORT} (apiBuild pipeline-admin-v2)`);
    });
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('Erro conectando ao MongoDB', err);
    process.exit(1);
  });
