const jwt = require('jsonwebtoken');
const { SERVICE_NAME_CODE, SECRET_KEY } = require('./config');

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return {
            success: true,
            id: decoded.id,
            tipo_usuario: decoded.role
        };
    } catch (err) {
        console.error(`[${SERVICE_NAME_CODE}] Error verificando token: ${err.message}`);
        return { success: false, message: 'Token inválido o expirado' };
    }
}

module.exports = { verifyToken };
