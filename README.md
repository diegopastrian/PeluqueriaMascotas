# Proyecto Peluquería de Mascotas - Arquitectura de Software

Este repositorio contiene el proyecto para el curso de Arquitectura de Software, enfocado en el desarrollo de un sistema de gestión para una peluquería de mascotas. El sistema implementa una Arquitectura Orientada a Servicios (SOA) y utiliza el stack MERN (MongoDB, Express.js, React, Node.js).

## Descripción General del Sistema

El sistema permitirá a los clientes agendar citas, consultar servicios y productos, y realizar compras. Los empleados podrán gestionar la agenda y consultar historiales, mientras que los administradores tendrán control sobre el inventario y otras configuraciones del sistema.

## Arquitectura

El sistema sigue una **Arquitectura Orientada a Servicios (SOA)**. Las funcionalidades de negocio están encapsuladas en servicios backend independientes. La comunicación entre los componentes cliente y los servicios se realiza a través de un **Bus de Servicios** provisto, utilizando un formato de transacción específico (`NNNNNSSSSSDATOS`).

*   **Clientes (React):** Interfaces de usuario para diferentes roles (C1: Usuarios, C2: Empleados, C3: Administradores).
*   **Servicios (Node.js/Express.js):** Lógica de negocio backend (S1: Gestión de Citas, S2: Gestión de Clientes, etc.).
*   **Base de Datos (MongoDB):** Almacenamiento de datos.
*   **Bus de Servicios:** Canal de comunicación entre clientes y servicios.

## Stack Tecnológico

*   **Base de Datos:** MongoDB
*   **Backend (Servicios):** Node.js, Express.js
*   **Frontend (Clientes):** React (utilizando Vite para la creación de proyectos)
*   **Lenguaje Principal:** JavaScript (con opción a TypeScript)

## Estructura de Directorios

El proyecto está organizado de la siguiente manera:

*   `proyecto-peluqueria-mern/`
    *   `bus_service_helpers/`: Funciones helper en JavaScript para construir y parsear las transacciones del Bus de Servicios.
    *   `services/`: Contiene un subdirectorio para cada servicio backend (S1-S8). Cada servicio es una aplicación Node.js/Express independiente.
        *   `sX_nombre_servicio/`:
            *   `server.js`: Punto de entrada del servicio.
            *   `controllers/`: Lógica de negocio para las transacciones.
            *   `models/`: Esquemas de Mongoose para MongoDB.
            *   `package.json`: Dependencias del servicio.
    *   `clients/`: Contiene un subdirectorio para cada aplicación cliente React (C1-C3).
        *   `cX_nombre_cliente/`:
            *   `src/`: Código fuente de la aplicación React.
            *   `package.json`: Dependencias del cliente.
    *   `database/`: Scripts de configuración de base de datos, seeds, y diseño del esquema de MongoDB.
    *   `docs/`: Documentación del proyecto, incluyendo la definición de las transacciones del bus (`SSSSS` y formato de `DATOS`) para cada servicio.
    *   `docker-compose.yml`: (Opcional) Para orquestar el entorno de desarrollo con Docker.
    *   `.gitignore`: Especifica los archivos y directorios ignorados por Git.
    *   `README.md`: Este archivo.

## Prerrequisitos

*   Node.js (se recomienda una versión >= 18.18.0 o >= 20.9.0, verificar dependencias)
*   npm (generalmente viene con Node.js)
*   MongoDB (instalado localmente o accesible)
*   Docker (para ejecutar el Bus de Servicios provisto)

## Configuración y Ejecución

1.  **Clonar el Repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd proyecto-peluqueria-mern
    ```

2.  **Ejecutar el Bus de Servicios (Docker):**
    ```bash
    docker run -d -p 5000:5000 jrgiadach/soabus:v1
    ```
    Verificar que esté corriendo en `localhost:5000`.

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
    Cada servicio podría requerir variables de entorno (ej. URI de conexión a MongoDB, puerto del servicio). Crear archivos `.env` según sea necesario (y asegurarse de que `.env` esté en `.gitignore`).

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
    Acceder a la aplicación cliente en el puerto indicado (generalmente `localhost:5173` para Vite o `localhost:3000` para CRA).

## Documentación Adicional

*   **Definición de Transacciones del Bus:** Ver `docs/api_definitions/`.
*   **Diagrama de Arquitectura:** Ver `docs/architecture.md`.

## Contribuidores

*   Diego Pastrián
*   Robinson Garcia
*   Sebastián Espinoza
*   Lucas Araya

---