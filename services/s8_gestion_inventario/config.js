const SERVICE_CODE = 'INVEN';
const SERVICE_NAME_CODE = 'INVEN'; // Es inventory pero se usa 'INVEN' para mantener consistencia con otros servicios con el SSSSS 
const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const HEALTH_PORT = 3002;
const SECRET_KEY = 'tu_clave_secreta_muy_segura';

module.exports = {
    SERVICE_CODE,
    SERVICE_NAME_CODE,
    BUS_HOST,
    BUS_PORT,
    HEALTH_PORT,
    SECRET_KEY
};