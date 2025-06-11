CREATE TABLE clientes
(
    id_cliente     SERIAL PRIMARY KEY,
    nombre         VARCHAR(25) NOT NULL,
    apellido       VARCHAR(25) NOT NULL,
    email          varchar(255),
    telefono       VARCHAR(20),
    password       TEXT        NOT NULL,
    es_invitado    BOOLEAN   DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mascotas
(
    id_mascota SERIAL PRIMARY KEY,
    nombre     varchar(50) NOT NULL,
    especie    VARCHAR(20) NOT NULL,
    raza       VARCHAR(50),
    edad       INT,
    id_cliente INTEGER REFERENCES clientes (id_cliente) ON DELETE CASCADE
);

CREATE TABLE empleados
(
    id_empleado SERIAL PRIMARY KEY,
    nombre      VARCHAR(50)         NOT NULL,
    apellido    VARCHAR(50)         NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    telefono    VARCHAR(20),
    rol         VARCHAR(30)         NOT NULL,
    password    TEXT                NOT NULL
);

CREATE TABLE servicios
(
    id_servicio SERIAL PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio      NUMERIC(10, 0),
    tiempo_estimado INTERVAL
);

CREATE TABLE productos
(
    id_producto SERIAL PRIMARY KEY,
    nombre      VARCHAR(100)   NOT NULL,
    descripcion TEXT,
    precio      NUMERIC(10, 0) NOT NULL,
    stock       INTEGER        NOT NULL,
    imagen_url  TEXT
);

CREATE TABLE citas
(
    id_cita     SERIAL PRIMARY KEY,
    id_cliente  INTEGER REFERENCES clientes (id_cliente) ON DELETE CASCADE,
    id_mascota  INTEGER   REFERENCES mascotas (id_mascota) ON DELETE SET NULL,
    id_empleado INTEGER REFERENCES empleados (id_empleado),
    fecha       TIMESTAMP NOT NULL,
    estado      VARCHAR(30) DEFAULT 'pendiente',
    comentario  TEXT
);

-- Servicios asociados a una cita
CREATE TABLE cita_servicios
(
    id_cita_servicio INTEGER REFERENCES citas (id_cita) ON DELETE CASCADE,
    id_servicio      INTEGER REFERENCES servicios (id_servicio),
    PRIMARY KEY (id_cita_servicio, id_servicio)
);

CREATE TABLE historial_servicios
(
    id_historial SERIAL PRIMARY KEY,
    id_mascota   INTEGER REFERENCES mascotas (id_mascota) ON DELETE CASCADE,
    id_servicios INTEGER REFERENCES servicios (id_servicio),
    fecha        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas        TEXT
);

CREATE TABLE carritos
(
    id_carrito SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes (id_cliente)
);

CREATE TABLE carrito_productos
(
    id_carrito  INTEGER REFERENCES carritos (id_carrito) ON DELETE CASCADE,
    id_producto INTEGER REFERENCES productos (id_producto),
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (id_carrito, id_producto)
);

-- ordenes (compras realizadas)
CREATE TABLE ordenes
(
    id_orden   SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes (id_cliente),
    fecha      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    estado     VARCHAR(20) DEFAULT 'procesando', -- procesando, enviado, entregado, cancelado
    total      NUMERIC(10, 0) NOT NULL
);

-- Detalles de productos en una orden
CREATE TABLE orden_productos
(
    id_orden        INTEGER REFERENCES ordenes (id_orden) ON DELETE CASCADE,
    id_producto     INTEGER REFERENCES productos (id_producto),
    cantidad        INTEGER        NOT NULL,
    precio_unitario NUMERIC(10, 0) NOT NULL,
    PRIMARY KEY (id_orden, id_producto)
);

-- Preferencias del cliente (servicios y productos frecuentes)
CREATE TABLE preferencias
(
    id_preferencia SERIAL PRIMARY KEY,
    id_cliente     INTEGER REFERENCES clientes (id_cliente) ON DELETE CASCADE, -- Añadido ON DELETE CASCADE para coherencia
    tipo           VARCHAR(20) NOT NULL, -- 'producto' o 'servicio'
    id_referencia  INTEGER     NOT NULL, -- ID del producto o servicio
    UNIQUE (id_cliente, tipo, id_referencia) 
);

-- Notificaciones enviadas al cliente
CREATE TABLE notificaciones
(
    id_notificacion SERIAL PRIMARY KEY,
    id_cliente      INTEGER REFERENCES clientes (id_cliente),
    mensaje         TEXT NOT NULL,
    fecha_envio     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo            VARCHAR(50), -- cita, recordatorio, etc.
    leida           BOOLEAN   DEFAULT FALSE
);
