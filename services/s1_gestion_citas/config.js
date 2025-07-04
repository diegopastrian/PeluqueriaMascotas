
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
    startHour: '09:00', // Hora de inicio laboral
    endHour: '13:59',   // Hora de fin laboral
    slotInterval: 60,   // Intervalo en minutos
  },
};
