const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lista de todos los directorios que tienen su propio package.json
const projectDirs = [
    // Clientes
    '../clients/c1_cliente_web_usuarios',
    '../clients/c2_interfaz_empleados',
    '../clients/admin_ui',
    '../clients/cliente_ping_test',


    // Servicios
    '../services/s1_gestion_citas',
    '../services/s2_gestion_clientes',
    '../services/s3_historial_mascotas',
    '../services/s4_notificaciones',
    '../services/s5_ordenes_compra',
    '../services/s6_generacion_comprobantes',
    '../services/s7_catalogos_precios',
    '../services/s8_gestion_inventario',

    // Helpers (si aplica)
    '../bus_service_helpers'
];

console.log('--- Iniciando instalación de todas las dependencias del proyecto ---');

projectDirs.forEach(dir => {
    const dirPath = path.resolve(__dirname, dir);
    const packageJsonPath = path.join(dirPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
        console.log(`\n[INFO] Instalando dependencias en: ${dir}`);
        try {
            // Ejecuta 'npm install' en el directorio especificado
            // stdio: 'inherit' muestra la salida de npm en tiempo real
            execSync('npm install', { cwd: dirPath, stdio: 'inherit' });
            console.log(`[SUCCESS] Dependencias instaladas para: ${dir}`);
        } catch (error) {
            console.error(`[ERROR] Falló la instalación en: ${dir}`);
            console.error(error);
            process.exit(1); // Detiene el script si una instalación falla
        }
    } else {
        console.warn(`\n[WARN] No se encontró package.json en: ${dir}. Saltando...`);
    }
});

console.log('\n--- Todas las dependencias han sido instaladas exitosamente. ---');