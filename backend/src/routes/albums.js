const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// POST /api/albums { name, visibility, password? }
router.post('/', async (req,res)=>{
  try{
    const { name, visibility='private', password } = req.body||{};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const user = await prisma.user.findUnique({ where: { id: req.userId }});
    const slug = String(name).toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').slice(0,40) || 'album';
    const data = {
      ownerId: user.id,
      familyId: user.familyId || null,
      name, slug, visibility,
      passHash: null
    };
    if (visibility === 'family_lock') {
      if (!password || password.length < 4) return res.status(400).json({ error: 'weak_password' });
      data.passHash = await bcrypt.hash(password, 10);
    }
    const album = await prisma.album.create({ data });
    res.json({ status:'ok', album });
  }catch(e){
    console.error('albums/create', e);
    res.status(500).json({ error: 'album_create_failed' });
  }
});

// PATCH /api/albums/:id { visibility, password }
router.patch('/:id', async (req,res)=>{
  try{
    const { id } = req.params;
    const { visibility, password } = req.body||{};
    const album = await prisma.album.findUnique({ where: { id }});
    if (!album || album.ownerId !== req.userId) return res.status(404).json({ error: 'album_not_found' });

    const upd = {};
    if (visibility) upd.visibility = visibility;
    if (visibility === 'family_lock') {
      if (!password || password.length < 4) return res.status(400).json({ error: 'weak_password' });
      upd.passHash = await bcrypt.hash(password, 10);
    }
    if (visibility === 'private' || visibility === 'family') {
      upd.passHash = null;
    }
    const a2 = await prisma.album.update({ where: { id }, data: upd });
    res.json({ status:'ok', album:a2 });
  }catch(e){
    console.error('albums/update', e);
    res.status(500).json({ error: 'album_update_failed' });
  }
});

// POST /api/albums/:id/unlock { password }
router.post('/:id/unlock', async (req,res)=>{
  try{
    const { id } = req.params;
    const { password } = req.body||{};
    const album = await prisma.album.findUnique({ where: { id }});
    if (!album) return res.status(404).json({ error: 'album_not_found' });
    if (album.visibility !== 'family_lock') return res.json({ status:'ok', unlocked:true });

    const me = await prisma.user.findUnique({ where: { id: req.userId }});
    if (!album.familyId || album.familyId !== me.familyId) return res.status(403).json({ error: 'forbidden' });

    const ok = await require('bcryptjs').compare(String(password||''), album.passHash||'');
    return res.json({ status: ok?'ok':'fail', unlocked: !!ok });
  }catch(e){
    console.error('albums/unlock', e);
    res.status(500).json({ error: 'album_unlock_failed' });
  }
});

// GET /api/albums/mine
router.get('/mine', async (req,res)=>{
  try{
    const albums = await prisma.album.findMany({ where: { ownerId: req.userId }});
    res.json({ albums });
  }catch(e){
    console.error('albums/mine', e);
    res.status(500).json({ error: 'album_list_mine_failed' });
  }
});

module.exports = router;
