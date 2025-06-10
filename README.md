# Proyecto Peluqueria de Mascotas - Arquitectura de Software

Este repositorio contiene el proyecto para el curso de Arquitectura de Software, enfocado en el desarrollo de un sistema de gestion para una peluqueria de mascotas. El sistema implementa una Arquitectura Orientada a Servicios (SOA) y utiliza el stack MERN (PostgreSQL, Express.js, React, Node.js).

## Descripcion General del Sistema

El sistema permitira a los clientes agendar citas, consultar servicios y productos, y realizar compras. Los empleados podran gestionar la agenda y consultar historiales, mientras que los administradores tendran control sobre el inventario y otras configuraciones del sistema.

## Arquitectura

El sistema sigue una **Arquitectura Orientada a Servicios (SOA)**. Las funcionalidades de negocio estan encapsuladas en servicios backend independientes. La comunicacion entre los componentes cliente y los servicios se realiza a traves de un **Bus de Servicios** provisto, utilizando un formato de transaccion especifico (`NNNNNSSSSSDATOS`).

*   **Clientes (React):** Interfaces de usuario para diferentes roles (C1: Usuarios, C2: Empleados, C3: Administradores).
*   **Servicios (Node.js/Express.js):** Logica de negocio backend (S1: Gestion de Citas, S2: Gestion de Clientes, etc.).
*   **Base de Datos (PostgreSQL):** Almacenamiento de datos.
*   **Bus de Servicios:** Canal de comunicacion entre clientes y servicios.

## Stack Tecnologico

*   **Base de Datos:** PostgreSQL
*   **Backend (Servicios):** Node.js, Express.js
*   **Frontend (Clientes):** React (utilizando Vite para la creacion de proyectos)
*   **Lenguaje Principal:** JavaScript (con opcion a TypeScript)

## Estructura de Directorios

El proyecto esta organizado de la siguiente manera:

*   `proyecto-peluqueria-mern/`
    *   `bus_service_helpers/`: Funciones helper en JavaScript para construir y parsear las transacciones del Bus de Servicios.
    *   `services/`: Contiene un subdirectorio para cada servicio backend (S1-S8). Cada servicio es una aplicacion Node.js/Express independiente.
        *   `sX_nombre_servicio/`:
            *   `server.js`: Punto de entrada del servicio.
            *   `controllers/`: Logica de negocio para las transacciones.
            *   `models/`: Esquemas de Mongoose para PostgreSQL.
            *   `package.json`: Dependencias del servicio.
    *   `clients/`: Contiene un subdirectorio para cada aplicacion cliente React (C1-C3).
        *   `cX_nombre_cliente/`:
            *   `src/`: Codigo fuente de la aplicacion React.
            *   `package.json`: Dependencias del cliente.
    *   `database/`: Scripts de configuracion de base de datos, seeds, y diseño del esquema de PostgreSQL.
    *   `docs/`: Documentacion del proyecto, incluyendo la definicion de las transacciones del bus (`SSSSS` y formato de `DATOS`) para cada servicio.
    *   `docker-compose.yml`: (Opcional) Para orquestar el entorno de desarrollo con Docker.
    *   `.gitignore`: Especifica los archivos y directorios ignorados por Git.
    *   `README.md`: Este archivo.

## Prerrequisitos

*   Node.js (se recomienda una version >= 18.18.0 o >= 20.9.0, verificar dependencias)
*   npm (generalmente viene con Node.js)
*   PostgreSQL (instalado localmente o accesible)
*   Docker (para ejecutar el Bus de Servicios provisto)

## Configuracion y Ejecucion

1.  **Clonar el Repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd proyecto-peluqueria-mern
    ```

2.  **Ejecutar el Bus de Servicios (Docker):**
    ```bash
    docker run -d -p 5000:5000 jrgiadach/soabus:v1
    ```
    Verificar que este corriendo en `localhost:5000`.

3.  **Instalar Dependencias (para cada servicio y cliente):**
    Navegar a cada directorio de servicio (ej. `services/s1_gestion_citas/`) y ejecutar:
    ```bash
    npm install
    ```
    Hacer lo mismo para cada directorio de cliente (ej. `clients/c1_cliente_web_usuarios/`):
    ```bash
    npm install
    ```
    Y para `bus_service_helpers/`:
    ```bash
    npm install # Si tuviera dependencias, aunque inicialmente solo es un helper.
    ```

4.  **Configurar Variables de Entorno:**
    Cada servicio podria requerir variables de entorno (ej. URI de conexion a PostgreSQL, puerto del servicio). Crear archivos `.env` segun sea necesario (y asegurarse de que `.env` este en `.gitignore`).

5.  **Ejecutar los Servicios Backend:**
    Navegar a cada directorio de servicio y ejecutar su script de inicio (ej. `npm start` o `npm run dev` si se usa `nodemon`):
    ```bash
    cd services/s1_gestion_citas
    npm run dev # o npm start
    ```
    Repetir para todos los servicios que se quieran probar.

6.  **Ejecutar las Aplicaciones Cliente:**
    Navegar a cada directorio de cliente y ejecutar su script de inicio:
    ```bash
    cd clients/c1_cliente_web_usuarios
    npm run dev # o npm start
    ```
    Acceder a la aplicacion cliente en el puerto indicado (generalmente `localhost:5173` para Vite o `localhost:3000` para CRA).

## Documentacion Adicional

*   **Definicion de Transacciones del Bus:** Ver `docs/api_definitions/`.
*   **Diagrama de Arquitectura:** Ver `docs/architecture.md`.

## Contribuidores

*   Diego Pastrian
*   Robinson Garcia
*   Sebastian Espinoza
*   Lucas Araya

---
