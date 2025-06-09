// clients/c1_cliente_web_usuarios/app.js

const bus = require('./services/busService');
const ui = require('./ui/consoleUI');
const authActions = require('./actions/AuthActions');
const preferenceActions = require('./actions/preferenceActions');
let authToken = null;
let username = '';

async function main() {
    console.log('--- Cliente Web de Usuarios (Consola) ---');
    bus.connect();

    // Esperar a que el bus se conecte antes de mostrar el menú
    bus.on('connect', () => {
        mainLoop();
    });

    bus.on('error', (err) => {
        console.error('Error crítico, la aplicación se cerrará.');
        ui.close();
    });
}

async function mainLoop() {
    while (true) {
        if (!authToken) {
            await handleLoggedOutState();
        } else {
            await handleLoggedInState();
        }
    }
}

async function handleLoggedOutState() {
    const choice = await ui.showMainMenu();
    switch (choice) {
        case '1': // Registrar
            await authActions.handleRegister();
            break;
        case '2': // Login
            const loginResult = await authActions.handleLogin();
            username = loginResult.username;
            authToken = loginResult.authToken;
            break;
        case '3': // Salir
            bus.disconnect();
            ui.close();
            process.exit(0);
        default:
            console.log('Opción no válida.');
            break;
    }
}

async function handleLoggedInState() {
    const choice = await ui.showUserMenu(username);
    switch (choice) {
        case '1': // Ajustar Preferencias
            await preferenceActions.handlePreferencesSubMenu(authToken);
            break;
        case '2': // Gestionar Mascotas
            await petActions.handlePetManagement(authToken);
            break;
        case '3': // Logout
            const logoutResult = await authActions.handleLogout();
            username = logoutResult.username;
            authToken = logoutResult.authToken;
            break;
        default:
            console.log('Opción no válida.');
            break;
    }
}

async function main() {
    try {
        await bus.connect();
        await mainLoop();
    } catch (error) {
        console.error('Error fatal en la aplicación:', error);
    } finally {
        bus.disconnect();
    }
}

main();