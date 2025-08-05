import express from 'express';
const router = express.Router();

// /healthz is a conventional .well-known route for a health check
router.get('/healthz', (req, res) => {
    res.send('ok');
});

export default router;