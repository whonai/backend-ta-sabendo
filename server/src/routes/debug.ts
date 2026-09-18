import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  // return request info for debugging
  res.json({
    headers: req.headers,
    query: req.query,
    path: req.path,
    time: new Date().toISOString()
  });
});

export default router;
