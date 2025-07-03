function formatFecha(fecha) {
    //const date = new Date(fecha);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // enero = 0
    const año = fecha.getFullYear();
    return `${año}-${mes}-${dia}`;
}
function obtenerRangoFechas(descriptor) {
    const hoy = new Date();
    const inicio = new Date(hoy);
    const fin = new Date(hoy);

    switch (descriptor) {
        case 'hoy':
            return [formatFecha(inicio), formatFecha(fin)];
        case 'ultima_semana':
            inicio.setDate(inicio.getDate() - 7);
            return [formatFecha(inicio), formatFecha(fin)];
        case 'ultimo_mes':
            inicio.setMonth(inicio.getMonth() - 1);
            return [formatFecha(inicio), formatFecha(fin)];
        case 'este_mes':
            inicio.setDate(1);
            return [formatFecha(inicio), formatFecha(fin)];
        case 'todo':
            return ['2000-01-01', formatFecha(fin)];
        default:
            throw new Error('ORRP;Rango de fechas inválido. Usa hoy, ultima_semana, ultimo_mes, este_mes o todo.');
    }
}


module.exports = { formatFecha,obtenerRangoFechas };
