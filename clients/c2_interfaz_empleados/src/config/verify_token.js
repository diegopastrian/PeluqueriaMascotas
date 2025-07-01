const jwt = require('jsonwebtoken');
const path = require('path');
const config = require('./busConfig.js');

// Cargamos las variables de entorno globales del proyecto
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env.global') });
const allowedRolesEnv = 'veterinario,administrador,recepcionista'
const allowedRoles = allowedRolesEnv.split(',').map(r => r.trim());

function verifyToken(token, roles = allowedRoles) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (!roles.includes(decoded.role)) {
      return { 
        success: false, 
        message: `Acceso denegado: Solo ${roles.join(' o ')} pueden realizar esta operación` 
      };
    }
    return { success: true, id: decoded.id, rol: decoded.rol };
  } catch (err) {
    return { success: false, message: 'Token inválido o expirado' };
  }
}

module.exports = { verifyToken };
