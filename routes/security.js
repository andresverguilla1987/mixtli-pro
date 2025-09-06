import express from 'express';
const router = express.Router();
router.get('/ping', (req,res)=>res.json({pong:true}));
export default router;
