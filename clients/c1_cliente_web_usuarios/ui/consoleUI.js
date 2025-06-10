// clients/c1_cliente_web_usuarios/ui/consoleUI.js

const readline = require('readline');
const inquirer = require('inquirer');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funcion auxiliar para hacer preguntas
const ask = (question) => new Promise(resolve => rl.question(question, resolve));

// --- MENuS ---
async function showMainMenu() {
    console.log('\n--- Bienvenido a la Peluquería de Mascotas ---');
    const { choice } = await inquirer.prompt([
        {
            type: 'list', // Usamos 'list' para que funcione con las flechas
            name: 'choice',
            message: '¿Qué deseas hacer?',
            choices: [
                { name: '1. Registrarse', value: '1' },
                { name: '2. Iniciar Sesión', value: '2' },
                new inquirer.Separator(),
                { name: '3. Salir de la aplicación', value: '3' },
            ],
        },
    ]);
    return choice;
}

async function showUserMenu(username) { //logeado
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: `Bienvenido, ${username}! ¿Que deseas hacer?`,
            choices: [
                { name: '1. Ajustar Preferencias', value: '1' },
                { name: '2. Gestionar Mascotas', value: '2' },
                { name: '3. Logout', value: '3' },
            ],
        },
    ]);
    return choice;
}

// --- PREFERENCIAS ---
async function showPreferencesMenu() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'Ajustar Preferencias',
            choices: [
                { name: '1. Ver mis preferencias', value: '1' },
                { name: '2. Eliminar una preferencia', value: '2' },
                new inquirer.Separator(),
                { name: '3. Volver al menu principal', value: '3' },
            ],
        },
    ]);
    return choice;
}
async function promptForPreferenceToDelete() {
    return await inquirer.prompt([
        {
            type: 'input',
            name: 'id',
            message: 'Copia y pega el "id_preferencia" que deseas eliminar:',
            validate: function(value) {
                var pass = value.match(/^[0-9]+$/);
                if (pass) { return true; }
                return 'Por favor, ingrese solo el numero de ID.';
            }
        },
    ]);
}

// --- AUTENTICACION ---
async function getRegistrationData() {
    console.log('\n--- Formulario de Registro ---');
    // Pide exactamente los mismos campos que tu función original
    const userData = await inquirer.prompt([
        {
            type: 'input',
            name: 'nombre',
            message: 'Nombre:',
        },
        {
            type: 'input',
            name: 'apellido',
            message: 'Apellido:',
        },
        {
            type: 'input',
            name: 'email',
            message: 'Email:',
        },
        {
            type: 'password',
            name: 'password',
            message: 'Contraseña:',
            mask: '*',
        },
        {
            type: 'input',
            name: 'telefono',
            message: 'Telefono:',
        },
    ]);
    return userData;
}

async function promptForLogin() {
    console.log('\n--- Iniciar Sesión ---');
    const credentials = await inquirer.prompt([
        {
            type: 'input',
            name: 'correo',
            message: 'Correo electrónico:',
        },
        {
            type: 'password', // Usamos 'password' para ocultar la entrada
            name: 'password_plain',
            message: 'Contraseña:',
            mask: '*', // Muestra '*' en lugar de los caracteres
        },
    ]);
    return credentials;
}

async function promptForLogoutConfirmation() {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: '¿Estás seguro de que quieres cerrar la sesión?',
            default: true,
        },
    ]);
    return confirmed;
}

// --- MASCOTAS ---
async function showPetMenu() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '🐾 Gestion de Mascotas',
            choices: [
                { name: '1. Registrar una nueva mascota', value: '1' },
                { name: '2. Listar mis mascotas', value: '2' },
                { name: '3. Ver detalle de una mascota', value: '3' },
                { name: '4. Actualizar una mascota', value: '4' },
                { name: '5. Eliminar una mascota', value: '5' },
                new inquirer.Separator(),
                { name: '6. Volver al menu principal', value: '6' },
            ],
        },
    ]);
    return choice;
}

async function promptForPetDetails() {
    return await inquirer.prompt([
        { type: 'input', name: 'nombre', message: 'Nombre de la mascota:' },
        { type: 'input', name: 'especie', message: 'Especie (ej: Perro, Gato):' },
        { type: 'input', name: 'raza', message: 'Raza:' },
        { type: 'input', name: 'edad', message: 'Edad (años):' },
    ]);
}

async function promptForPetId(action) {
    const { id } = await inquirer.prompt([
        {
            type: 'input',
            name: 'id',
            message: `Ingrese el ID de la mascota que desea ${action}:`
        }
    ]);
    return id;
}

function close() {
    rl.close();
}

module.exports = {
    showMainMenu,
    showUserMenu,
    getRegistrationData,
    promptForLogin,
    showPreferencesMenu,
    promptForPreferenceToDelete,
    showPetMenu,
    promptForPetDetails,
    promptForPetId,
    promptForLogoutConfirmation,
    close: () => {
        console.log('Adios!')
    }
};