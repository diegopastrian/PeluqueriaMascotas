const jwt = require('jsonwebtoken');
const config = require('../config');

function verifyToken(token, allowedRoles) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (!allowedRoles.includes(decoded.tipo_usuario)) {
      return { success: false, message: `Acceso denegado: Solo ${allowedRoles.join(' o ')} pueden realizar esta operación` };
    }
    return { success: true, id: decoded.id, tipo_usuario: decoded.tipo_usuario };
  } catch (err) {
    return { success: false, message: 'Token inválido o expirado' };
  }
}

module.exports = { verifyToken };