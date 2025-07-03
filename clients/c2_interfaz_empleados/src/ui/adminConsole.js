const inquirer = require('inquirer');

async function showMainMenu(isAuthenticated) {
  const choices = [
    ...(isAuthenticated ? [
      { name: 'Ajustar Stock', value: 'adjustStock' },
      { name: 'Agregar Producto al Stock', value: 'addStock' },
      { name: 'Consultar Stock', value: 'queryStock' },
      { name: 'Consulta de Clientes y Mascotas', value: 'clientAndPets' },
      { name: 'Gestión de Citas', value: 'appointments' },
      { name: 'Registro de Ventas', value: 'sales' },
    //  { name: 'Registrar Servicio', value: 'registerService' },
      { name: 'Cerrar Sesión', value: 'logout' },
    ] : [
      { name: 'Registrarse como empleado', value: 'register' },
      { name: 'Iniciar Sesión', value: 'login' },
    ]),
    { name: 'Salir', value: 'exit' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Bienvenido al Panel de Empleados. Seleccione una opción:',
      choices,
    },
  ]);

  return action;
}

async function showClientAndPetsMenu() {
  const choices = [
    { name: 'Listar Clientes', value: 'listClients' },
    { name: 'Listar Mascotas de un Cliente', value: 'listClientPets' },
    { name: 'Volver al Menú Principal', value: 'back' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Consulta de Clientes y Mascotas. Seleccione una opción:',
      choices,
    },
  ]);

  return action;
}

async function showAppointmentsMenu() {
  const choices = [
    { name: 'Consultar Horarios Disponibles', value: 'getAvailableSlots' },
    { name: 'Ver Mi Agenda de Citas', value: 'viewAgenda' },
    { name: 'Listar Citas de un Cliente', value: 'listClientAppointments' },
    { name: 'Volver al Menú Principal', value: 'back' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Gestión de Citas. Seleccione una opción:',
      choices,
    },
  ]);

  return action;
}

async function promptRegisterEmployee() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'nombre',
      message: 'Nombre del empleado:',
      validate: (input) => input.trim() ? true : 'El nombre es obligatorio',
    },
    {
      type: 'input',
      name: 'apellido',
      message: 'Apellido del empleado:',
      validate: (input) => input.trim() ? true : 'El apellido es obligatorio',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Correo electrónico:',
      validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? true : 'Ingrese un correo válido',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Contraseña:',
      mask: '*',
      validate: (input) => input.length >= 6 ? true : 'La contraseña debe tener al menos 6 caracteres',
    },
    {
      type: 'input',
      name: 'telefono',
      message: 'Teléfono:',
      validate: (input) => /^\d{9}$/.test(input) ? true : 'Ingrese un teléfono válido de 9 dígitos',
    },
    {
      type: 'list',
      name: 'rol',
      message: 'Rol del empleado:',
      choices: ['administrador', 'veterinario', 'recepcionista'],
      default: 'veterinario',
    },
  ]);
}

async function promptLoginEmployee() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Correo electrónico:',
      validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? true : 'Ingrese un correo válido',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Contraseña:',
      mask: '*',
      validate: (input) => input.trim() ? true : 'La contraseña es obligatoria',
    },
  ]);
}

async function promptAdjustStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productId',
      message: 'ID del producto:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del producto debe ser un número',
    },
    {
      type: 'input',
      name: 'quantity',
      message: 'Cantidad a ajustar (positiva o negativa):',
      validate: (input) => /^-?\d+$/.test(input) ? true : 'La cantidad debe ser un número',
    },
    {
      type: 'input',
      name: 'motivo',
      message: 'Motivo:',
      validate: (input) => input.trim() ? true : 'Escriba el motivo',
    },
  ]);
}

async function promptAddStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productName',
      message: 'Nombre del producto:',
      validate: (input) => input.trim() ? true : 'El nombre del producto es obligatorio',
    },
    {
      type: 'input',
      name: 'desc',
      message: 'Descripción del producto:',
      validate: (input) => input.trim() ? true : 'La descripción del producto es obligatoria',
    },
    {
      type: 'input',
      name: 'precio_costo',
      message: 'Precio costo por unidad:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'El precio debe ser un número positivo',
    },
    {
      type: 'input',
      name: 'precioventa',
      message: 'Precio venta por unidad:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'El precio debe ser un número positivo',
    },
    {
      type: 'input',
      name: 'stock_inicial',
      message: 'Stock inicial:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'El stock debe ser un número positivo',
    },
  ]);
}

async function promptQueryStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productId',
      message: 'ID del producto a consultar:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del producto debe ser un número',
    },
  ]);
}

async function promptGetAvailableSlots() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'date',
      message: 'Fecha (YYYY-MM-DD):',
      validate: (input) => /^\d{4}-\d{2}-\d{2}$/.test(input) ? true : 'La fecha debe tener el formato YYYY-MM-DD',
    },
    {
      type: 'input',
      name: 'idServicio',
      message: 'ID del servicio (opcional, presione Enter para omitir):',
      validate: (input) => !input || /^\d+$/.test(input) ? true : 'El ID del servicio debe ser un número',
      default: '',
    },
  ]);
}

async function promptCreateAppointment() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
    {
      type: 'input',
      name: 'idMascota',
      message: 'ID de la mascota:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID de la mascota debe ser un número',
    },
    {
      type: 'input',
      name: 'idEmpleado',
      message: 'ID del empleado:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del empleado debe ser un número',
    },
    {
      type: 'input',
      name: 'fecha',
      message: 'Fecha y hora (YYYY-MM-DDTHH:MM):',
      validate: (input) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input) ? true : 'La fecha debe tener el formato YYYY-MM-DDTHH:MM',
    },
    {
      type: 'input',
      name: 'servicios',
      message: 'IDs de servicios (separados por comas, ej: 1,2):',
      validate: (input) => /^(\d+,)*\d+$/.test(input) || input.trim() === '' ? true : 'Los IDs deben ser números separados por comas',
      default: '',
    },
    {
      type: 'input',
      name: 'comentarios',
      message: 'Comentarios (opcional, presione Enter para omitir):',
      default: '',
    },
  ]);
}

async function promptModifyAppointment() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCita',
      message: 'ID de la cita:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID de la cita debe ser un número',
    },
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
    {
      type: 'input',
      name: 'idEmpleado',
      message: 'Nuevo ID del empleado (opcional, presione Enter para omitir):',
      validate: (input) => !input || /^\d+$/.test(input) ? true : 'El ID del empleado debe ser un número',
      default: '',
    },
    {
      type: 'input',
      name: 'fecha',
      message: 'Nueva fecha y hora (YYYY-MM-DDTHH:MM, opcional, presione Enter para omitir):',
      validate: (input) => !input || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input) ? true : 'La fecha debe tener el formato YYYY-MM-DDTHH:MM',
      default: '',
    },
    {
      type: 'input',
      name: 'servicios',
      message: 'Nuevos IDs de servicios (separados por comas, opcional, presione Enter para omitir):',
      validate: (input) => !input || /^(\d+,)*\d+$/.test(input) ? true : 'Los IDs deben ser números separados por comas',
      default: '',
    },
    {
      type: 'input',
      name: 'comentarios',
      message: 'Nuevos comentarios (opcional, presione Enter para omitir):',
      default: '',
    },
  ]);
}

async function promptCancelClientAppointment() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCita',
      message: 'ID de la cita:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID de la cita debe ser un número',
    },
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
    {
      type: 'input',
      name: 'motivo',
      message: 'Motivo de cancelación:',
      validate: (input) => input.trim() ? true : 'Escriba el motivo',
    },
  ]);
}

async function promptListClientAppointments() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
    {
      type: 'list',
      name: 'estadoFiltro',
      message: 'Filtro por estado (opcional):',
      choices: [
        { name: 'Sin filtro', value: '' },
        { name: 'Pendiente', value: 'pendiente' },
        { name: 'Modificada', value: 'modificada' },
        { name: 'Cancelada', value: 'cancelada' },
        { name: 'Confirmada', value: 'confirmada' },
      ],
      default: '',
    },
  ]);
}

async function promptListClients() {
  return {};
}

async function promptListClientPets() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
  ]);
}

async function promptAgendaAction(citas) {
  const choices = citas.map(cita => ({
    name: `Cita ID: ${cita.id_cita} - ${cita.cliente} (${cita.mascota}) a las ${cita.fecha_hora.substring(0, 16)} [${cita.estado}]`,
    value: cita.id_cita,
  }));

  const { idCita } = await inquirer.prompt([
    {
      type: 'list',
      name: 'idCita',
      message: 'Seleccione una cita para actuar:',
      choices: [...choices, { name: 'Volver', value: 'back' }],
    },
  ]);

  if (idCita === 'back') return { action: 'back' };

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `Acción para la cita ID ${idCita}:`,
      choices: [
        { name: 'Confirmar', value: 'confirm' },
        { name: 'Cancelar', value: 'cancel' },
        { name: 'Volver', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return { action: 'back' };

  if (action === 'cancel') {
    const { motivo, motivoOtro } = await inquirer.prompt([
      {
        type: 'list',
        name: 'motivo',
        message: 'Motivo de cancelación:',
        choices: [
          'Falta de disponibilidad del empleado',
          'Cierre temporal de la clínica',
          'Otro',
        ],
      },
      {
        type: 'input',
        name: 'motivoOtro',
        message: 'Especifique el motivo:',
        when: (answers) => answers.motivo === 'Otro',
        validate: (input) => input.trim() ? true : 'Escriba el motivo',
      },
    ]);

    return { action: 'cancel', idCita, motivo: motivo === 'Otro' ? motivoOtro : motivo };
  }

  return { action: 'confirm', idCita };
}

async function promptListOrders() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente (opcional, presione Enter para listar todas las órdenes):',
      validate: (input) => !input || /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
      
    },
  ]);
}

async function promptGenerateComprobante(orders) {
  const [operation, ...data] = orders.split(';');

  if (operation !== 'obtener_one_or_all') {
    console.error('Operación no válida');
    return [];
  }

  // Reconstruye la cadena después del primer ';'
  const dataString = data.join(';');

  // Ahora separa por orden individual usando '|'
  const ordenesRaw = dataString.split('|');
   const ordenes = ordenesRaw.map(row => {
    const [id_orden, id_cliente, estado, fecha, total] = row.split(';');
    return {
      id_orden: parseInt(id_orden),
      id_cliente: parseInt(id_cliente),
      estado,
      fecha,
      total: parseFloat(total)
    };
  });

  const choices = ordenes.map(order => ({
    name: `Orden ID: ${order.id_orden} - Cliente: (ID: ${order.id_cliente}) - Fecha: ${order.fecha} - Total: ${order.total} [${order.estado}]`,
    value: order.id_orden,
  }));

  const { idOrden } = await inquirer.prompt([
    {
      type: 'list',
      name: 'idOrden',
      message: 'Seleccione una orden para generar comprobante:',
      choices: [...choices, { name: 'Volver', value: 'back' }],
    },
  ]);

  if (idOrden === 'back') return { action: 'back' };

  const { tipoComprobante } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tipoComprobante',
      message: 'Seleccione el tipo de comprobante:',
      choices: [
        { name: 'Comprobante de Orden', value: 'ORDEN' },
      ],
    },
  ]);
  const selectedOrder = ordenes.find(o => o.id_orden === idOrden);

  return { action: 'generate', idOrden, tipoComprobante , order: selectedOrder };
}

async function promptRegisterService() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'idCliente',
      message: 'ID del cliente:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del cliente debe ser un número',
    },
    {
      type: 'input',
      name: 'idCita',
      message: 'ID de la cita origen (opcional, presione Enter para omitir):',
      validate: (input) => !input || /^\d+$/.test(input) ? true : 'El ID de la cita debe ser un número',
      default: '',
    },
    {
      type: 'input',
      name: 'idsServicios',
      message: 'IDs de servicios realizados (separados por comas, ej: 1,2):',
      validate: (input) => /^(\d+,)*\d+$/.test(input) ? true : 'Los IDs deben ser números separados por comas',
    },
    {
      type: 'input',
      name: 'fecha',
      message: 'Fecha del servicio (YYYY-MM-DD, presione Enter para usar la fecha actual):',
      validate: (input) => !input || /^\d{4}-\d{2}-\d{2}$/.test(input) ? true : 'La fecha debe tener el formato YYYY-MM-DD',
      default: '',
    },
    {
      type: 'input',
      name: 'comentarios',
      message: 'Comentarios (opcional, presione Enter para omitir):',
      default: '',
    },
  ]);
}



//const inquirer = require('inquirer');

async function promptOrderReportParams() {
  const { idCliente, tipo } = await inquirer.prompt([
    { name: 'idCliente', message: 'ID del cliente:', type: 'input' },
    {
      name: 'tipo',
      message: '¿Cómo deseas definir el rango?',
      type: 'list',
      choices: [
        { name: 'Usar palabra clave (hoy, ultimo_mes, etc.)', value: 'palabra' },
        { name: 'Usar fechas específicas', value: 'fechas' }
      ]
    }
  ]);

  if (tipo === 'palabra') {
    const { rango } = await inquirer.prompt([
      {
        name: 'rango',
        message: 'Elige el rango de tiempo:',
        type: 'list',
        choices: ['hoy', 'ultima_semana', 'ultimo_mes', 'este_mes', 'todo']
      }
    ]);
    return { idCliente, rango };
  } else {
    const { fechaInicio, fechaFin } = await inquirer.prompt([
      { name: 'fechaInicio', message: 'Fecha de inicio (YYYY-MM-DD):', type: 'input' },
      { name: 'fechaFin', message: 'Fecha de fin (YYYY-MM-DD):', type: 'input' }
    ]);
    return { idCliente, fechaInicio, fechaFin };
  }
}



module.exports = {
  promptOrderReportParams, //nuevo prompt
  showMainMenu,
  showClientAndPetsMenu,
  showAppointmentsMenu,
  promptRegisterEmployee,
  promptLoginEmployee,
  promptAdjustStock,
  promptAddStock,
  promptQueryStock,
  promptGetAvailableSlots,
  promptCreateAppointment,
  promptModifyAppointment,
  promptCancelClientAppointment,
  promptListClientAppointments,
  promptListClients,
  promptListClientPets,
  promptAgendaAction,
  promptListOrders,
  promptGenerateComprobante,
  promptRegisterService,
};