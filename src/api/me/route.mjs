import express from 'express';
import { getAuth0User } from '../auth0.mjs';

const router = express.Router();

router.get('/', (req, res) => {
    const user = getAuth0User(req);

    if (!user) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
        });
    }

    res.json({
        status: 'ok',
        data: user,
    });
});

export default router;
