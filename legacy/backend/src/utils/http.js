function ok(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, ...data });
}

function fail(res, status, code, message, fieldErrors = {}) {
  return res.status(status).json({
    ok: false,
    error: { code, message, fieldErrors }
  });
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const [key, ...rawValue] = part.trim().split('=');
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});
}

function fieldErrorsFromZod(error) {
  return error.issues.reduce((errors, issue) => {
    const key = issue.path.join('.') || 'request';
    errors[key] = issue.message;
    return errors;
  }, {});
}

module.exports = {
  fail,
  fieldErrorsFromZod,
  ok,
  parseCookies
};
