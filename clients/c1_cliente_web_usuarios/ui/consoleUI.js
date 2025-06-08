// clients/c1_cliente_web_usuarios/ui/consoleUI.js

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función auxiliar para hacer preguntas
const ask = (question) => new Promise(resolve => rl.question(question, resolve));

// --- MENÚS ---
async function showMainMenu() {
    console.log('\n--- MENÚ PRINCIPAL ---');
    console.log('1. Registrar un nuevo usuario');
    console.log('2. Iniciar Sesión');
    console.log('3. Salir');
    return await ask('Elige una opción: ');
}

async function showUserMenu(username) {
    console.log(`\n--- MENÚ DE USUARIO (${username}) ---`);
    console.log('1. Guardar una preferencia de producto');
    console.log('2. Guardar una preferencia de servicio');
    console.log('3. Listar mis preferencias');
    console.log('4. Cerrar Sesión (Logout)');
    return await ask('Elige una opción: ');
}

// --- RECOPILACIÓN DE DATOS ---
async function getRegistrationData() {
    console.log('\n--- Formulario de Registro ---');
    const nombre = await ask('Nombre: ');
    const apellido = await ask('Apellido: ');
    const email = await ask('Email: ');
    const password = await ask('Contraseña: ');
    const telefono = await ask('Teléfono: ');
    return { nombre, apellido, email, password, telefono };
}

async function getLoginData() {
    console.log('\n--- Formulario de Login ---');
    const email = await ask('Email: ');
    const password = await ask('Contraseña: ');
    return { email, password };
}

async function getPreferenceData(type) {
    console.log(`\n--- Nueva Preferencia de ${type} ---`);
    const id = await ask(`ID del ${type} a guardar: `);
    return { type, id };
}

function close() {
    rl.close();
}

module.exports = {
    showMainMenu,
    showUserMenu,
    getRegistrationData,
    getLoginData,
    getPreferenceData,
    close
};