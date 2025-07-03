const bus = require('../services/busService');
const ui = require('../ui/consoleUI');


// --- MANEJADORES DE ACCIONES ---

async function handleRegister() {
    const data = await ui.getRegistrationData();
    const payload = `registrar;${data.nombre};${data.apellido};${data.email};${data.password};${data.telefono}`;
    const res = await bus.send('CLIEN', payload);
    bus.once('response', (res) => {
        if (res.status !== 'OK') {
            console.error(`\n[Error de Bus] No se pudo comunicar con el servicio CLIEN.`);
            return;
        }
    });
    const responseParts = res.data.split(';');
    if (responseParts.length === 3 && !isNaN(parseInt(responseParts[1], 10))) {
        console.log('\n[exito] ¡Usuario registrado! Ahora puedes iniciar sesion.');
    } else {
        // Si no, la segunda parte es el mensaje de error
        const errorMsg = responseParts[1] || 'Error desconocido del servicio.';
        console.error(`\n[Error] Registro fallido: ${errorMsg}`);
    }
}

async function handleLogin() {
    const data = await ui.promptForLogin();
    const payload = `login;${data.correo};${data.password_plain}`;

    const res = await bus.send('CLIEN', payload);

    if (res.status !== 'OK') {
        console.error(`\n[Error de Bus] No se pudo comunicar con el servicio CLIEN.`);
        return;
    }
    
    const responseParts = res.data.split(';');
    // Una respuesta de login exitosa tiene 4 partes: 'login', token, id, nombre
    if (responseParts.length === 4 && responseParts[0] === 'login') {
        authToken = responseParts[1];
        username = responseParts[3];
        console.log(`\n[exito] Bienvenido, ${username}!`);
        return{ authToken, username };
    } else {
        const errorMsg = responseParts[1] || 'Credenciales invalidas o error desconocido.';
        console.error(`\n[Error] Login fallido: ${errorMsg}`);
        authToken = null;
        username = '';
        return {authToken:null, username: ''};
    }
}

async function handleLogout() {
    const confirmed = await ui.promptForLogoutConfirmation();

    if (confirmed) {
        console.log('Cerrando sesión...');
        // Si el usuario confirma, devolvemos null para limpiar la sesión.
        return { username: null, authToken: null, loggedOut: true };
    } else {
        console.log('Cierre de sesión cancelado.');
        // Si el usuario cancela, devolvemos una bandera para no hacer nada.
        return { loggedOut: false };
    }
}



module.exports = {
    handleRegister,
    handleLogin,
    handleLogout
};