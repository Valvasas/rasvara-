const VENDOR_ROLES = new Set(['VENDOR_OWNER', 'VENDOR_STAFF', 'ADMIN', 'SUPER_ADMIN']);
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function hasRole(user, allowedRoles = []) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

function canAccessVendorResource(user, vendorId) {
  if (!user || !vendorId) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  if (!VENDOR_ROLES.has(user.role)) return false;
  return (user.vendorMemberships || []).some((membership) => {
    return membership.vendorId === vendorId && VENDOR_ROLES.has(membership.role);
  });
}

function requireRoles(roles = []) {
  return (req, res, next) => {
    if (!hasRole(req.user, roles)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Akses tidak diizinkan untuk role ini.',
          fieldErrors: {}
        }
      });
    }
    next();
  };
}

module.exports = {
  canAccessVendorResource,
  hasRole,
  requireRoles
};
