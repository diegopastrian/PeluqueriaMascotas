Sistema de Gestión para Peluquería de Mascotas
==============================================

Este proyecto es un sistema de gestión integral para una peluquería de mascotas, desarrollado como parte del curso de Arquitectura de Software. Implementa una **Arquitectura Orientada a Servicios (SOA)** donde múltiples componentes independientes se comunican a través de un bus de mensajería.

Arquitectura del Sistema
------------------------

El sistema está diseñado con una arquitectura de microservicios que se comunican de forma asíncrona. Los componentes principales son:

*   **Capa de Servicios (Backend):** Compuesta por 8 microservicios independientes, cada uno con una responsabilidad única (gestión de clientes, citas, catálogos, etc.).
    
*   **Capa de Clientes (Frontend):** Compuesta por 3 clientes distintos (para usuarios, empleados y administradores) que consumen los servicios del backend.
    
*   **Bus de Transacciones:** Un intermediario para gestionar la comunicación entre clientes y servicios.
    

Tecnologías Utilizadas
----------------------

*   **Backend:** Node.js
    
*   **Base de Datos:** PostgreSQL
    
*   **Cliente de Consola (C1):** Node.js con inquirer para la interactividad.
    
*   **Clientes Web (C2, C3):** Estructura base preparada para React y Vite.
    
*   **Autenticación:** JSON Web Tokens (JWT)
    
*   **Seguridad:** Hasheo de contraseñas con bcryptjs.
    

Estructura del Repositorio
--------------------------

El proyecto está organizado en una estructura de monorepo con los siguientes directorios principales:
```
├── bus_service_helpers/  # Lógica común para el formato de transacciones
├── clients/              # Contiene los diferentes clientes (C1, C2, C3)
│   ├── c1_cliente_web_usuarios/
│   ├── c2_interfaz_empleados/
│   └── c3_interfaz_administrador/
├── database/             # Scripts SQL para la creación de esquemas y migraciones
├── services/             # Contiene los microservicios del backend (S1 a S8)
│   ├── s1_gestion_citas/
│   └── s2_gestion_clientes/
└── README.md
```
Guía de Instalación y Puesta en Marcha
--------------------------------------

Sigue estos pasos para configurar y ejecutar el entorno de desarrollo local.

### 1\. Prerrequisitos

*   **Node.js:** Versión 18.x o superior.
    
*   **PostgreSQL:** Una instancia de PostgreSQL en ejecución.
    
*   **Git:** Para clonar el repositorio.
    

### 2\. Clonar el Repositorio
```Bash

git clone https://github.com/diegopastrian/PeluqueriaMascotas.git
cd PeluqueriaMascotas
```
### 3\. Configuración de la Base de Datos

1.  Crea una nueva base de datos en tu instancia de PostgreSQL. Por ejemplo, peluqueria\_db.
    
2.  Ejecuta el script de creación de esquemas para generar todas las tablas necesarias, que se encuentra en database/migrations/create\_schema.sql.
    
### 4\. Instalación de Dependencias

Cada servicio y cliente tiene sus propias dependencias. Debes instalarlas en cada directorio por separado.

```Bash
# Ejemplo para el servicio S2
cd services/s2_gestion_clientes
npm install

# Ejemplo para el cliente C1
cd clients/c1_cliente_web_usuarios
npm install
```

_Repite este proceso para cada componente que desees ejecutar._

### 5\. Ejecución del Sistema

1.  \# Terminal 1cd services/s2\_gestion\_clientesnode server.js# Deberías ver: Servicio de Gestión de Clientes (S2) escuchando en el puerto 5556
    
2.  \# Terminal de Clientecd clients/c1\_cliente\_web\_usuariosnode app.js
    

Componentes del Sistema
-----------------------

#### Clientes

*   **\[C1\] Cliente de Consola para Usuarios:** Permite a los usuarios registrarse, iniciar sesión y gestionar sus mascotas y preferencias. 
    
*   **\[C2\] Interfaz Web para Empleados:** Permitirá a los empleados gestionar citas, registrar ventas y consultar inventario. 
    
*   **\[C3\] Interfaz Web para Administradores:** Permitirá a los administradores gestionar catálogos, inventario y ver reportes. 
    

#### Servicios

*   **\[S1\] Gestión de Citas (CITAS):** Gestiona la creación, cancelación y listado de citas.
    
*   **\[S2\] Gestión de Clientes (CLIEN):** Responsable de la autenticación, perfiles, mascotas y preferencias de los usuarios. 
    
*   **\[S3\] Historial de Mascotas (HIMAS):** Registra y consulta el historial de visitas y compras por mascota. 
    
*   **\[S4\] Notificaciones (NOTIF):** Envía notificaciones a los usuarios. 
    
*   **\[S5\] Órdenes de Compra (ORCOM):** Gestiona las órdenes de compra generadas por ventas. 
    
*   **\[S6\] Generación de Comprobantes (GECOM):** Genera boletas o facturas de las ventas. 
    
*   **\[S7\] Catálogos y Precios (CATAL):** Provee la lista y detalles de productos y servicios. 
    
*   **\[S8\] Gestión de Inventario (INVEN):** Administra el stock de los productos. 
    

Protocolo de Comunicación
-------------------------

La comunicación en el bus utiliza una trama personalizada para todas las solicitudes y respuestas.

*   **Formato:** NNNNNSSSSS DATOS
    
    *   **NNNNN (5 chars):** Largo del contenido (SSSSS + DATOS), rellenado con ceros.
        
    *   **SSSSS (5 chars):** Nombre del servicio de destino.
        
    *   **DATOS (string):** Payload de la transacción, usualmente con formato operacion;param1;param2;....
        
*   **Helper:** Las funciones para construir estas tramas se encuentran en bus\_service\_helpers/transactionHelper.js.
    

Autores
-------

*   Lucas Nicolás Araya Tapia
    
*   Robinson Osmar Garcia Hidalgo
    
*   Sebastián Ignacio Espinoza Tapia
    
*   Diego Jaime Pastrián Marquéz
