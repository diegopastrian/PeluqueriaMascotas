// s2_gestion_clientes/handlers/preferenceHandler.js

const pool = require('../db');
const { buildTransaction } = require('../../../bus_service_helpers/transactionHelper'); // Ajusta la ruta
const { verifyToken } = require('../helpers/jwtHelper');
const { SERVICE_CODE, SERVICE_NAME_CODE } = require('../config');

// Copiamos la lógica de 'PREFG'
function handleSavePreference(fields, socket) {
    // ... (La lógica de validación, verificación de token y DB es EXACTAMENTE la misma que tenías)
    // ... cópiala y pégala aquí
}

// Copiamos la lógica de 'PREFL'
function handleListPreferences(fields, socket) {
    // ... (La lógica de validación, verificación de token y DB es EXACTAMENTE la misma que tenías)
    // ... cópiala y pégala aquí
}

module.exports = {
    handleSavePreference,
    handleListPreferences
};