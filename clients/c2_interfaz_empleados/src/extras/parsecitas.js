function parseCitasResponse(response) {
  const lines = response.trim().split('\n');
  if (lines.length < 2) {
    console.error("❌ Respuesta inválida. Debe tener al menos dos líneas.");
    return;
  }

  const rawData = lines.slice(1); // omitimos la cabecera con el código
  const rows = [];

  for (const line of rawData) {
    const parts = line.split(',');
    if (parts.length !== 3) continue;

    const [id_cita, fechaStr, estado] = parts;

    const dateObj = new Date(fechaStr);
    if (isNaN(dateObj.getTime())) {
      rows.push({
        ID: id_cita,
        Fecha: 'Invalid Date',
        Estado: estado,
      });
    } else {
      rows.push({
        ID: id_cita,
        Fecha: dateObj.toLocaleString('es-CL'),
        Estado: estado,
      });
    }
  }

  console.table(rows);
}

module.exports = { parseCitasResponse };