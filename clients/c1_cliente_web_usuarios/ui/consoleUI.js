// clients/c1_cliente_web_usuarios/ui/consoleUI.js

const readline = require('readline');
const inquirer = require('inquirer');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función auxiliar para hacer preguntas
const ask = (question) => new Promise(resolve => rl.question(question, resolve));

// --- MENÚS ---
async function showMainMenu() { //no logueado
    console.log('\n--- MENÚ PRINCIPAL ---');
    console.log('1. Registrar un nuevo usuario');
    console.log('2. Iniciar Sesión');
    console.log('3. Salir');
    return await ask('Elige una opción: ');
}

async function showUserMenu(username) { //logeado
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: `Bienvenido, ${username}! ¿Qué deseas hacer?`,
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
                { name: '3. Volver al menú principal', value: '3' },
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
                return 'Por favor, ingrese solo el número de ID.';
            }
        },
    ]);
}

// --- AUTENTICACION ---
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



function close() {
    rl.close();
}

module.exports = {
    showMainMenu,
    showUserMenu,
    getRegistrationData,
    getLoginData,
    showPreferencesMenu,
    promptForPreferenceToDelete,
    close: () => {
        console.log('Adiós!')
    }
};