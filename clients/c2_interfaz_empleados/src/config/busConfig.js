const BUS_HOST = 'localhost';
const BUS_PORT = 5000;
const SERVICE_CODE = 'CLIEN';
const JWT_SECRET = 'tu_clave_secreta_muy_segura';

module.exports = {
  BUS_HOST,
  BUS_PORT,
  SERVICE_CODE,
  jwt: {
    secret: JWT_SECRET
  }
};