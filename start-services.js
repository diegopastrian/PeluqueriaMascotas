// start-services.js

const { spawn } = require('child_process');
const path = require('path');

// --- Configuración de los servicios a iniciar ---
const services = [
    {
        name: 'S2-Clientes',
        path: './services/s2_gestion_clientes',
        color: '\x1b[36m', // Color cian para los logs
    },
    {
        name: 'S7-Catálogo',
        path: './services/s7_catalogos_precios',
        color: '\x1b[35m', // Color magenta para los logs
    }
    // Puedes agregar más servicios aquí en el futuro
    // {
    //     name: 'S1-Citas',
    //     path: './services/s1_gestion_citas',
    //     color: '\x1b[33m', // Color amarillo
    // }
];

// Función para iniciar un servicio
function startService(service) {
    // Usamos spawn para crear un nuevo proceso
    // 'node' es el comando, ['server.js'] son los argumentos
    // cwd (current working directory) le dice dónde ejecutar el comando
    const child = spawn('node', ['server.js'], {
        cwd: path.resolve(__dirname, service.path),
        shell: true // Mejora la compatibilidad en Windows
    });

    // Redirigimos la salida estándar (logs normales) del servicio a nuestra consola
    child.stdout.on('data', (data) => {
        process.stdout.write(`${service.color}[${service.name}] ${data.toString()}\x1b[0m`);
    });

    // Redirigimos la salida de error del servicio a nuestra consola
    child.stderr.on('data', (data) => {
        process.stderr.write(`${service.color}[${service.name}_ERROR] ${data.toString()}\x1b[0m`);
    });

    // Manejamos el cierre del proceso
    child.on('close', (code) => {
        console.log(`${service.color}[${service.name}] Servicio detenido con código ${code}\x1b[0m`);
    });
}

// Iniciamos todos los servicios definidos en la configuración
console.log('--- Iniciando servicios de desarrollo ---');
services.forEach(startService);