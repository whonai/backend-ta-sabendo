import express from 'express';
import cors from 'cors';
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
app.use('/api/admin', adminRouter);
app.use('/api/debug', debugRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

connectDb()
  .then(() => {
    startInstagramCollectorScheduler();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Tá Rolando Feira backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('Erro conectando ao MongoDB', err);
    process.exit(1);
  });
