// helpers/jwtHelper.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'tu_clave_secreta_muy_segura'; // ¡Debe ser la misma que en S2!

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        // Devuelve el payload completo para poder verificar el id_cliente si es necesario
        return { success: true, payload: decoded };
    } catch (err) {
        return { success: false, message: 'Token invalido o expirado' };
    }
}

module.exports = { verifyToken };