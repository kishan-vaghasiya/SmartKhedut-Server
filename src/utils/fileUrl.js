// Converts a file saved on disk (e.g. uploads/trade/abc.jpg) into a full URL
// the mobile app / admin panel can load directly in an <Image>/<img>.
function toPublicUrl(req, relativePath) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/?/, '/');
  return `${base}${cleanPath}`;
}

module.exports = { toPublicUrl };
