// s2_gestion_clientes/helpers/jwtHelper.js

const jwt = require('jsonwebtoken');
const { SECRET_KEY, SERVICE_NAME_CODE } = require('./../config');

/**
 * Verifica un token JWT y devuelve el payload decodificado o un error.
 * @param {string} token - El token JWT a verificar.
 * @returns {{success: boolean, id_cliente?: number, message?: string}}
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return {
            success: true,
            id_cliente: decoded.id,
            role: decoded.role  // Usa el nombre exacto que pusiste en el JWT
        };
    } catch (err) {
        console.error(`[${SERVICE_NAME_CODE}] Error verificando token: ${err.message}`);
        return { success: false, message: 'Token invalido o expirado' };
    }
}


module.exports = { verifyToken };