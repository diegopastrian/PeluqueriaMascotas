
module.exports = {
  bus: {
    host:  'localhost',
    port:  5000,
  },
  service: {
    code: 'CITAS',
    name: 'CITAS',
    healthPort: 3003,
  },
  jwt: {
    secret: 'tu_clave_secreta_muy_segura',
  },
  schedule: {
    startHour: '08:00', // Hora de inicio laboral
    endHour: '15:00',   // Hora de fin laboral
    slotInterval: 180,   // Intervalo en minutos
  },
};
