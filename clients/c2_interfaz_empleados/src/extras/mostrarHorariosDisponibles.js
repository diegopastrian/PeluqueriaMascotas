// mostrarHorariosDisponibles.js

/**
 * Muestra una tabla con los horarios disponibles en consola
 * @param {string} data - String con formato "fecha,duracion,id;fecha,duracion,id;..."
 */
function mostrarHorariosDisponibles(data) {
  if (!data || typeof data !== 'string') {
    console.warn("⚠️ No se recibieron horarios disponibles.");
    return;
  }

const horarios = data
  .split(";")
  .filter((item) => item.includes(","))
  .map((item) => {
    const [fechaStr, duracion, id_slot] = item.split(",");
    const fecha = new Date(fechaStr.trim());

    return {
      id_empleado: parseInt(id_slot),
      Fecha: fecha.toLocaleDateString('es-CL'),
      Hora: fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      Duración: `${duracion} min`,
    };
  });
  console.log("✅ Horarios disponibles:");
  console.table(horarios);
}

module.exports = { mostrarHorariosDisponibles};
