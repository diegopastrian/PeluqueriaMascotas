// bus_service_helpers/db.js

const  {Pool}  = require('pg');
const path = require('path');

// Cargamos las variables de entorno globales del proyecto  
//NOTA: Aasegurese de crear el archivo .env.glboal en la carpeta raiz
require('dotenv').config({ path: path.resolve(__dirname, '../.env.global') });

// Verificamos que la variable de la base de datos se cargó
if (!process.env.DB_DATABASE) {
    console.error("ERROR: La variable DB_DATABASE no está definida en tu archivo .env.global. Asegúrate de que se llame DB_DATABASE y no DB_NAME.");
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});


module.exports = pool ;
