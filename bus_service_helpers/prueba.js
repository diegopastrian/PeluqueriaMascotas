import { buildRequest, calculatelength, parseResponse } from './servicebushelper.js'

//servicio invocado
const sssss = 'CITAC';


// Build a request  crear cita        id_cliente;id_mascota;id_empleado;YYYY-MM-DDTHH:MM;id_servicio1,id_servicio2;[comentarios]
const request = buildRequest(sssss,'1;1;2;2025-06-05T14:30;01,02;[buenardo]');

console.log('Request:', request); // Output: Request: 00043CITAC1;1;2;2025-06-2715:20;01,02;[buenardo]

// Parse a response   crear cita

const datos_respuesta = sssss + 'OKC1001;PENDIENTE' ;
const tamano = calculatelength(datos_respuesta);
const response = tamano + datos_respuesta;
const parsed = parseResponse(response);
console.log('Parsed Response:', parsed);
// Output: Parsed Response: {
/*  length: 22,
  serviceCode: 'CITAC',
  status: 'OK',
  data: 'C1001;PENDIENTE'
}*/

// Example with error response
const errorResponse = '00014sumarNK120 - 2';
const parsedError = parseResponse(errorResponse);
console.log('Parsed Error Response:', parsedError);
// Output: Parsed Error Response: { length: 18, serviceCode: 'sumar', status: 'NK', data: 'Invalid data' }
