// services/s3_historial_mascotas/helpers/jwtHelper.js
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return { success: true, payload: decoded };
    } catch (err) {
        return { success: false, message: 'Token invalido o expirado' };
    }
}
module.exports = { verifyToken };