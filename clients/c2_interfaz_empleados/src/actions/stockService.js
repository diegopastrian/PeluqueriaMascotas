const net = require('net');
const { buildTransaction, parseResponse } = require('../../../../bus_service_helpers/transactionHelper.js');
const { BUS_HOST, BUS_PORT } = require('../config/busConfig.js');

const INVEN_SERVICE_CODE = 'INVEN';

async function adjustStock(token, productId, quantity, motivo) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(INVEN_SERVICE_CODE, `ajustar;${token};${productId};${quantity};${motivo}`);
      console.log(`[ADMIN] Enviando solicitud de ajuste de stock: ${request}`);
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
          console.log('fieldssss: ' + fields );
          if (parsed.serviceName === INVEN_SERVICE_CODE && operation === 'ajustar') {
            if (parsed.status === 'OK' && !isNaN(fields[1]) ) {
              resolve({ message: 'Ajuste de stock exitoso', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al ajustar stock'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexion: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function addStock(token, productName,desc,precio_costo,precioventa, stock_inicial) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(INVEN_SERVICE_CODE, `agregar;${token};${productName};${desc};${precio_costo};${precioventa};${stock_inicial}`);
      console.log(`[ADMIN] Enviando solicitud de agregar stock: ${request}`);
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
          console.log('fieldssssssssss: ' + fields );

          if (parsed.serviceName === INVEN_SERVICE_CODE && operation === 'agregar') {
            if (parsed.status === 'OK' && !isNaN(fields[1])) {
              resolve({ message: 'Producto agregado al stock exitoso', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al agregar stock'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexion: ${err.message}`));
      clientSocket.end();
    });
  });
}

async function queryStock(productId) {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(INVEN_SERVICE_CODE, `consultar;${productId}`);
      console.log(`[ADMIN] Enviando solicitud de consulta de stock: ${request}`);
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

          if (parsed.serviceName === INVEN_SERVICE_CODE && operation === 'consultar') {
            if (parsed.status === 'OK') {
              resolve({ message: 'Consulta de stock exitosa', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al consultar stock'));
            }
          }
        } catch (error) {
          reject(new Error(`Error parseando respuesta: ${error.message}`));
        }
      });
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      reject(new Error(`Error en la conexion: ${err.message}`));
      clientSocket.end();
    });
  });

}
async function consultaglobal() {
  return new Promise((resolve, reject) => {
    const clientSocket = new net.Socket();
    let responded = false; // bandera para evitar resolver/rechazar varias veces

    clientSocket.connect(BUS_PORT, BUS_HOST, () => {
      const request = buildTransaction(INVEN_SERVICE_CODE, `consulta_padre;todo`);
      console.log(`[ADMIN] Enviando solicitud de consulta de stock: ${request}`);
      clientSocket.write(request);
    });

    clientSocket.on('data', (data) => {
      const rawData = data.toString();
      const messages = rawData.match(/\d{5}[A-Z]{5}(?:OK|NK)?.*?(?=\d{5}[A-Z]{5}|$)/g) || [rawData];

      for (const message of messages) {
        try {
          const parsed = parseResponse(message);
          const fields = parsed.data.split(';');
          const operation = fields[0];

          if (parsed.serviceName === INVEN_SERVICE_CODE && operation === 'consulta_padre') {
            responded = true;
            if (parsed.status === 'OK') {
              resolve({ message: 'Consulta de stock exitosa', data: parsed.data });
            } else {
              reject(new Error(fields[1] || 'Error al consultar stock'));
            }
            break;
          }
        } catch (error) {
          if (!responded) {
            responded = true;
            reject(new Error(`Error parseando respuesta: ${error.message}`));
          }
        }
      }

      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      if (!responded) {
        responded = true;
        reject(new Error(`Error en la conexion: ${err.message}`));
      }
      clientSocket.end();
    });

    // Fallback en caso de timeout silencioso (opcional)
    setTimeout(() => {
      if (!responded) {
        responded = true;
        reject(new Error('Tiempo de espera agotado esperando respuesta del servicio de inventario'));
        clientSocket.end();
      }
    }, 5000); // 5 segundos
  });
}


const showAllStockTable = async () => {
  try {
    const result = await consultaglobal();

    const [, ...productosRaw] = result.data.split(';'); // Elimina 'consulta_padre'
    const productos = productosRaw.join(';').split('|').map(row => {
      const [id, nombre, stock] = row.split(';');
      return {
        ID: parseInt(id),
        Nombre: nombre,
        Stock: parseInt(stock)      };
    });

    if (productos.length === 0) {
      console.log('ℹ️ No hay productos en stock.');
      return;
    }

    console.table(productos);
  } catch (error) {
    console.error('❌ Error al obtener el stock:', error.message);
  }
};
module.exports = { adjustStock, addStock, queryStock,consultaglobal ,showAllStockTable};