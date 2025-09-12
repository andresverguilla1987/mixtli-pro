function r2Key({ familyId, userId, albumSlug, filename }) {
  if (!familyId || !userId || !albumSlug || !filename) throw new Error('r2Key params missing');
  return `${familyId}/${userId}/${albumSlug}/${filename}`;
}

function r2Prefix({ familyId, userId, albumSlug }) {
  if (!familyId || !userId) throw new Error('r2Prefix params missing');
  if (albumSlug) return `${familyId}/${userId}/${albumSlug}/`;
  return `${familyId}/${userId}/`;
}

module.exports = { r2Key, r2Prefix };
