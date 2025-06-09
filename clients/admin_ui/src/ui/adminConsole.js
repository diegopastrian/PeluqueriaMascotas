const inquirer = require('inquirer');

async function showMainMenu(isAuthenticated) {
  const choices = [
    ...(isAuthenticated ? [
      { name: 'Ajustar Stock', value: 'adjustStock' },
      { name: 'Agregar Producto al Stock', value: 'addStock' },
      { name: 'Consultar Stock', value: 'queryStock' },
      { name: 'Cerrar Sesión', value: 'logout' }
    ] : [
      { name: 'Registrar Empleado', value: 'register' },
      { name: 'Iniciar Sesión', value: 'login' }
    ]),
    { name: 'Salir', value: 'exit' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Bienvenido al Panel de Administración. Seleccione una opción:',
      choices
    }
  ]);

  return action;
}

async function promptRegisterEmployee() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'nombre',
      message: 'Nombre del empleado:',
      validate: (input) => input.trim() ? true : 'El nombre es obligatorio'
    },
    {
      type: 'input',
      name: 'apellido',
      message: 'Apellido del empleado:',
      validate: (input) => input.trim() ? true : 'El apellido es obligatorio'
    },
    {
      type: 'input',
      name: 'email',
      message: 'Correo electrónico:',
      validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? true : 'Ingrese un correo válido'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Contraseña:',
      mask: '*',
      validate: (input) => input.length >= 6 ? true : 'La contraseña debe tener al menos 6 caracteres'
    },
    {
      type: 'input',
      name: 'telefono',
      message: 'Teléfono:',
      validate: (input) => /^\d{9}$/.test(input) ? true : 'Ingrese un teléfono válido de 9 dígitos'
    },
    {
      type: 'list',
      name: 'rol',
      message: 'Rol del empleado:',
      choices: ['administrador', 'veterinario', 'recepcionista'],
      default: 'veterinario'
    }
  ]);
}

async function promptLoginEmployee() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Correo electrónico:',
      validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? true : 'Ingrese un correo válido'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Contraseña:',
      mask: '*',
      validate: (input) => input.trim() ? true : 'La contraseña es obligatoria'
    }
  ]);
}

async function promptAdjustStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productId',
      message: 'ID del producto:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del producto debe ser un número'
    },
    {
      type: 'input',
      name: 'quantity',
      message: 'Cantidad a ajustar (positiva o negativa):',
      validate: (input) => /^-?\d+$/.test(input) ? true : 'La cantidad debe ser un número'
    },
    {
      type: 'input',
      name: 'motivo',
      message: 'Motivo:',
      validate: (input) => input.trim() ? true : 'Escriba el motivo'
    }
  ]);
}

async function promptAddStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productName',
      message: 'Nombre del producto:',
      validate: (input) => input.trim() ? true : 'El nombre del producto es obligatorio'
    },
    {
      type: 'input',
      name: 'desc',
      message: 'Descripcion del producto:',
      validate: (input) => input.trim() ? true : 'El nombre del producto es obligatorio'
    },
    {
      type: 'input',
      name: 'precio_costo',
      message: 'Precio costo por unidad:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'La cantidad debe ser un número positivo'
    },
    {
      type: 'input',
      name: 'precioventa',
      message: 'Precio venta por unidad:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'La cantidad debe ser un número positivo'
    },
    {
      type: 'input',
      name: 'stock_inicial',
      message: 'Stock inical:',
      validate: (input) => /^\d+$/.test(input) && parseInt(input) > 0 ? true : 'La cantidad debe ser un número positivo'
    }
  ]);
}

async function promptQueryStock() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'productId',
      message: 'ID del producto a consultar:',
      validate: (input) => /^\d+$/.test(input) ? true : 'El ID del producto debe ser un número'
    }
  ]);
}

module.exports = {
  showMainMenu,
  promptRegisterEmployee,
  promptLoginEmployee,
  promptAdjustStock,
  promptAddStock,
  promptQueryStock
};