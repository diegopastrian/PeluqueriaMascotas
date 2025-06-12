const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT } = require('../config/busConfig.js');

const CITAS_SERVICE_CODE = 'CITAS';

async function getAvailableSlots(date, idServicio = null) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = idServicio ? `horarios;${date};${idServicio}` : `horarios;${date}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de horarios disponibles: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
        //  console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'horarios') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Consulta de horarios exitosa', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al consultar horarios'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function createAppointment(idCliente, idMascota, idEmpleado, fecha, servicios, comentarios = '') {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const serviciosStr = servicios.join(',');
      const data = comentarios
        ? `crear;${idCliente};${idMascota};${idEmpleado};${fecha};${serviciosStr};${comentarios}`
        : `crear;${idCliente};${idMascota};${idEmpleado};${fecha};${serviciosStr}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de crear cita: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
          console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'crear') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Cita creada exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al crear cita'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function modifyAppointment(idCita, idCliente, idEmpleado = null, fecha = null, servicios = null, comentarios = null) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      let data = `modificar;${idCita};${idCliente}`;
      if (idEmpleado) data += `;${idEmpleado}`;
      if (fecha) data += `;${fecha}`;
      if (servicios && servicios.length > 0) data += `;${servicios.join(',')}`;
      if (comentarios) data += `;${comentarios}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de modificar cita: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
      //    console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'modificar') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Cita modificada exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al modificar cita'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}



async function listClientAppointments(idCliente, estadoFiltro = null) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = estadoFiltro ? `listar;${idCliente};${estadoFiltro}` : `listar;${idCliente}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de listar citas: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
        //  console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'listar') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Listado de citas exitoso', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al listar citas'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}












async function cancelClientAppointment(idCita, idCliente, motivo) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = `cancelar;${idCita};${idCliente};${motivo}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de cancelar cita (cliente): ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
          console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'cancelar') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Cita cancelada exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al cancelar cita'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}









async function cancelEmployeeAppointment(idCita, idEmpleado, motivo) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = `cancelarEmp;${idCita};${idEmpleado};${motivo}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de cancelar cita (empleado): ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
          console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'cancelarEmp') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Cita cancelada exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al cancelar cita'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}
















async function listEmployeeAgenda(idEmpleado) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = `listarAgenda;${idEmpleado}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de listar agenda: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
        //  console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'listarAgenda') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Consulta de agenda exitosa', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al listar agenda'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}







async function confirmAppointment(idCita, idEmpleado) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const data = `confirmar;${idCita};${idEmpleado}`;
      const request = buildTransaction(CITAS_SERVICE_CODE, data);
      console.log(`[EMPLOYEE] Enviando solicitud de confirmar cita: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      messages.forEach((message) => {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];
          console.log('fields: ' + fields);

          if (parsed.serviceName === CITAS_SERVICE_CODE && operation === 'confirmar') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Cita confirmada exitosamente', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al confirmar cita'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexión: ${err.message}`));
      clientSocket.end();
    });
  });
}




module.exports = {
  getAvailableSlots,
  createAppointment,
  modifyAppointment,
  cancelClientAppointment,
  cancelEmployeeAppointment,
  listClientAppointments,
  listEmployeeAgenda,
  confirmAppointment,
};