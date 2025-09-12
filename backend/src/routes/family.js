const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// POST /api/family/create { name }
router.post('/create', async (req,res)=>{
  try{
    const { name } = req.body||{};
    const me = await prisma.user.findUnique({ where: { id: req.userId }});
    if (!me) return res.status(404).json({ error: 'user_not_found' });
    const existing = await prisma.family.findFirst({ where: { ownerId: me.id }});
    if (existing) return res.status(400).json({ error: 'already_has_family' });

    const fam = await prisma.family.create({
      data: { name: name || 'Mixtli Familia', ownerId: me.id }
    });
    await prisma.familyMember.create({
      data: { familyId: fam.id, userId: me.id, role: 'owner', status: 'active' }
    });
    await prisma.user.update({ where: { id: me.id }, data: { familyId: fam.id }});
    return res.json({ status:'ok', family: fam });
  }catch(e){
    console.error('family/create', e);
    res.status(500).json({ error: 'family_create_failed' });
  }
});

// POST /api/family/invite { email }
router.post('/invite', async (req,res)=>{
  try{
    const { email } = req.body||{};
    if (!email) return res.status(400).json({ error: 'email_required' });
    const me = await prisma.user.findUnique({ where: { id: req.userId }, include: { family:true }});
    if (!me?.familyId) return res.status(400).json({ error: 'no_family' });

    const famId = me.familyId;
    const fm = await prisma.familyMember.findUnique({ where: { familyId_userId: { familyId: famId, userId: me.id }}});
    if (fm?.role !== 'owner') return res.status(403).json({ error: 'not_owner' });

    const members = await prisma.familyMember.count({ where: { familyId: famId, status: 'active' }});
    if (members >= 5) return res.status(400).json({ error: 'family_full' });

    const token = crypto.randomBytes(24).toString('hex');
    const inv = await prisma.invite.create({
      data: { familyId: famId, email, token, expiresAt: new Date(Date.now()+7*24*3600*1000) }
    });
    return res.json({ status:'ok', inviteToken: inv.token });
  }catch(e){
    console.error('family/invite', e);
    res.status(500).json({ error: 'family_invite_failed' });
  }
});

// POST /api/family/join { token, userEmail }
router.post('/join', async (req,res)=>{
  try{
    const { token, userEmail } = req.body||{};
    const inv = await prisma.invite.findUnique({ where: { token }});
    if (!inv) return res.status(400).json({ error: 'invalid_token' });
    if (inv.expiresAt < new Date()) return res.status(400).json({ error: 'expired' });

    const user = await prisma.user.findUnique({ where: { id: req.userId }});
    if (!user || user.email.toLowerCase() !== String(userEmail||'').toLowerCase()) {
      return res.status(400).json({ error: 'email_mismatch' });
    }
    const count = await prisma.familyMember.count({ where: { familyId: inv.familyId, status: 'active' }});
    if (count >= 5) return res.status(400).json({ error: 'family_full' });

    await prisma.familyMember.upsert({
      where: { familyId_userId: { familyId: inv.familyId, userId: user.id }},
      update: { status: 'active', role: 'member' },
      create: { familyId: inv.familyId, userId: user.id, status: 'active', role: 'member' }
    });
    await prisma.user.update({ where: { id: user.id }, data: { familyId: inv.familyId }});
    await prisma.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() }});
    res.json({ status:'ok' });
  }catch(e){
    console.error('family/join', e);
    res.status(500).json({ error: 'family_join_failed' });
  }
});

// GET /api/family/members
router.get('/members', async (req,res)=>{
  try{
    const me = await prisma.user.findUnique({ where: { id: req.userId }});
    if (!me?.familyId) return res.json({ members: [] });
    const members = await prisma.familyMember.findMany({
      where: { familyId: me.familyId, status: 'active' },
      include: { user: true }
    });
    res.json({ members: members.map(m => ({ id:m.user.id, email:m.user.email, role:m.role })) });
  }catch(e){
    console.error('family/members', e);
    res.status(500).json({ error: 'family_members_failed' });
  }
});

module.exports = router;
