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
        console.log('\n[Éxito] ¡Usuario registrado! Ahora puedes iniciar sesión.');
    } else {
        // Si no, la segunda parte es el mensaje de error
        const errorMsg = responseParts[1] || 'Error desconocido del servicio.';
        console.error(`\n[Error] Registro fallido: ${errorMsg}`);
    }
}

async function handleLogin() {
    const data = await ui.getLoginData();
    const payload = `login;${data.email};${data.password}`;

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
        console.log(`\n[Éxito] Bienvenido, ${username}!`);
        return{ authToken, username };
    } else {
        const errorMsg = responseParts[1] || 'Credenciales inválidas o error desconocido.';
        console.error(`\n[Error] Login fallido: ${errorMsg}`);
        authToken = null;
        username = '';
        return {authToken:null, username: ''};
    }
}

async function handleLogout(authToken) {
    const payload = `logout;${authToken}`;
    
    const res = await bus.send('CLIEN', payload);
    if (res.status === 'OK') {
        console.log('\n[Éxito] Has cerrado sesión correctamente.');
    } else {
        console.error(`\n[Error de Bus] No se pudo comunicar con el servicio CLIEN.`);
        return;
    }

    return { authToken: null, username: '' };
}

module.exports = {
    handleRegister,
    handleLogin,
    handleLogout
};