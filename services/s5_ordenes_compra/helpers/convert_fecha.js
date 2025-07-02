function formatFecha(fecha) {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0'); // enero = 0
    const año = date.getFullYear();
    return `${dia}-${mes}-${año}`;
}

module.exports = { formatFecha };