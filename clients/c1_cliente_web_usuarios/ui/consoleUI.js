// clients/c1_cliente_web_usuarios/ui/consoleUI.js

const readline = require('readline');
const inquirer = require('inquirer');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Funcion auxiliar para hacer preguntas
const ask = (question) => new Promise(resolve => rl.question(question, resolve));

// --- MENUS ---
async function showMainMenu() {
    console.log('\n--- Bienvenido a la Peluquería de Mascotas ---');
    const { choice } = await inquirer.prompt([
        {
            type: 'list', 
            name: 'choice',
            message: '¿Qué deseas hacer?',
            choices: [
                { name: '1. Registrarse', value: '1' },
                { name: '2. Iniciar Sesión', value: '2' },
                new inquirer.Separator(),
                { name: '3. Salir de la aplicación', value: '3' },
            ],
        },
    ]);
    return choice;
}

async function showUserMenu(username) {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: `Bienvenido, ${username}! ¿Qué deseas hacer?`,
            choices: [
                { name: '1. Ajustar Preferencias', value: '1' },
                { name: '2. Gestionar Mascotas', value: '2' },
                { name: '3. Ver Catálogo', value: '3' },
                { name: '4. Ver Carrito de Compras', value: '4' }, // <-- AÑADIR
                new inquirer.Separator(),
                { name: '5. Logout', value: '5' }, // <-- ACTUALIZAR
            ],
        },
    ]);
    return choice;
}
// --- PREFERENCIAS ---
async function showPreferencesMenu() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'Ajustar Preferencias',
            choices: [
                { name: '1. Ver mis preferencias', value: '1' },
                { name: '2. Eliminar una preferencia', value: '2' },
                new inquirer.Separator(),
                { name: '3. Volver al menu principal', value: '3' },
            ],
        },
    ]);
    return choice;
}
async function promptForPreferenceToDelete() {
    return await inquirer.prompt([
        {
            type: 'input',
            name: 'id',
            message: 'Copia y pega el "id_preferencia" que deseas eliminar:',
            validate: function(value) {
                var pass = value.match(/^[0-9]+$/);
                if (pass) { return true; }
                return 'Por favor, ingrese solo el numero de ID.';
            }
        },
    ]);
}

// En ui/consoleUI.js, reemplaza la función promptForPostListingAction

async function promptForPostListingAction() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '¿Qué deseas hacer ahora?',
            choices: [
                { name: '1. Agregar un ítem al Carrito de Compras', value: 'add_to_cart' },
                { name: '2. Agregar un ítem a mis Preferencias', value: 'add_preference' },
                new inquirer.Separator(),
                { name: '3. Volver al menú anterior', value: 'back' },
            ],
        },
    ]);
    return choice;
}

async function promptForPreferenceId(itemType) {
    const { id } = await inquirer.prompt([
        {
            type: 'input',
            name: 'id',
            message: `Ingresa el ID del ${itemType} que quieres agregar a tus preferencias:`,
        },
    ]);
    return id;
}

// --- AUTENTICACION ---
async function getRegistrationData() {
    console.log('\n--- Formulario de Registro ---');
    
    const userData = await inquirer.prompt([
        {
            type: 'input',
            name: 'nombre',
            message: 'Nombre:',
        },
        {
            type: 'input',
            name: 'apellido',
            message: 'Apellido:',
        },
        {
            type: 'input',
            name: 'email',
            message: 'Email:',
        },
        {
            type: 'password',
            name: 'password',
            message: 'Contraseña:',
            mask: '*',
        },
        {
            type: 'input',
            name: 'telefono',
            message: 'Telefono:',
        },
    ]);
    return userData;
}

async function promptForLogin() {
    console.log('\n--- Iniciar Sesión ---');
    const credentials = await inquirer.prompt([
        {
            type: 'input',
            name: 'correo',
            message: 'Correo electrónico:',
        },
        {
            type: 'password', // Usamos 'password' para ocultar la entrada
            name: 'password_plain',
            message: 'Contraseña:',
            mask: '*', // Muestra '*' en lugar de los caracteres
        },
    ]);
    return credentials;
}

async function promptForLogoutConfirmation() {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: '¿Estás seguro de que quieres cerrar la sesión?',
            default: true,
        },
    ]);
    return confirmed;
}

// --- MASCOTAS ---
async function showPetMenu() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '🐾 Gestion de Mascotas',
            choices: [
                { name: '1. Registrar una nueva mascota', value: '1' },
                { name: '2. Listar mis mascotas', value: '2' },
                { name: '3. Ver detalle de una mascota', value: '3' },
                { name: '4. Actualizar una mascota', value: '4' },
                { name: '5. Eliminar una mascota', value: '5' },
                new inquirer.Separator(),
                { name: '6. Volver al menu principal', value: '6' },
            ],
        },
    ]);
    return choice;
}

async function promptForPetDetails() {
    return await inquirer.prompt([
        { type: 'input', name: 'nombre', message: 'Nombre de la mascota:' },
        { type: 'input', name: 'especie', message: 'Especie (ej: Perro, Gato):' },
        { type: 'input', name: 'raza', message: 'Raza:' },
        { type: 'input', name: 'edad', message: 'Edad (años):' },
    ]);
}

async function promptForPetId(action) {
    const { id } = await inquirer.prompt([
        {
            type: 'input',
            name: 'id',
            message: `Ingrese el ID de la mascota que desea ${action}:`
        }
    ]);
    return id;
}

async function promptForPetSelection() {
    const { petId } = await inquirer.prompt([
        {
            type: 'input', name: 'petId',
            message: 'Ingresa el ID de la mascota para la cual es el servicio:',
            validate: (value) => value.match(/^[0-9]+$/) ? true : 'Por favor, ingresa un ID numérico válido.'
        }
    ]);
    return { petId };
}

// -- CATALOGO --
async function showCatalogMenu() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '📚 Catálogo',
            choices: [
                { name: '1. Listar Productos', value: '1' },
                { name: '2. Listar Servicios', value: '2' },
                new inquirer.Separator(),
                { name: '3. Volver al menú principal', value: '3' },
            ],
        },
    ]);
    return choice;
}


function close() {
    rl.close();
}

// --- CARRITO DE COMPRAS ---

async function showCartMenu(hasItems) {
    const choices = [];
    if (hasItems) {
        choices.push(
            { name: '1. ✅ Realizar Compra', value: '1' },
            { name: '2. 🗑️ Eliminar un ítem del carrito', value: '2' },
            new inquirer.Separator(),
        );
    }
    choices.push({ name: '3. ↩️ Volver al menú principal', value: '3' });

    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '🛒 Gestionar Carrito',
            choices: choices,
        },
    ]);
    return choice;
}

async function promptForItemId(itemType, action) {
    const { itemId } = await inquirer.prompt([
        {
            type: 'input',
            name: 'itemId',
            //message: `Ingresa el ID del ${itemType} que quieres ${action}:`,
            message: `Ingresa el ID del producto que quieres ${action}:`,
            validate: function(value) {
                // Valida que la entrada sea un número
                if (value.match(/^[0-9]+$/)) {
                    return true;
                }
                return 'Por favor, ingresa un ID numérico válido.';
            }
        }
    ]);
    return { itemId };
}

async function promptForQuantity(maxStock, itemType) {
    const { quantity } = await inquirer.prompt([
        {
            type: 'number',
            name: 'quantity',
            message: 'Ingresa la cantidad:',
            default: 1,
            validate: (value) => {
                if (value > 0) {
                    if (itemType === 'producto' && value > maxStock) {
                        return `La cantidad no puede superar el stock disponible (${maxStock}).`;
                    }
                    return true;
                }
                return 'La cantidad debe ser mayor a 0.';
            }
        }
    ]);
    return { quantity };
}

async function promptToRemoveFromCart(cartItems) {
    const choices = cartItems.map((item, index) => ({
        name: `${item.quantity}x ${item.name} ($${item.price})`,
        value: index
    }));

    const { itemIndex } = await inquirer.prompt([
        {
            type: 'list',
            name: 'itemIndex',
            message: 'Selecciona el ítem a eliminar:',
            choices: choices,
        }
    ]);
    return { itemIndex };
}

async function promptForPurchaseConfirmation(total) {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: `El total de tu compra es $${total}. ¿Confirmas la compra?`,
            default: true,
        },
    ]);
    return confirmed;
}

async function promptForDailySlot(availability) {
    const choices = Object.keys(availability).sort().map(time => {
        const vetCount = availability[time].length;

        // --- CAMBIO CLAVE AQUÍ ---
        // Al no poner la 'Z', new Date() la interpretará como una hora local,
        // por lo que toLocaleTimeString() no hará ninguna conversión.
        const timeObj = new Date(`1970-01-01T${time}`);

        const displayTime = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
            name: `Hora: ${displayTime} (${vetCount} vet. disponible(s))`,
            value: time
        };
    });

    choices.push(new inquirer.Separator(), { name: 'Cancelar', value: null });

    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message: 'Selecciona una hora disponible:',
            choices: choices,
            pageSize: 15
        }
    ]);
    return selected;
}

async function promptForVetSelection(vets) {
    // Si solo hay un veterinario, se elige automáticamente.
    if (vets.length === 1) {
        console.log(`\nSe ha asignado automáticamente al/a la Dr(a). ${vets[0].nombre}.`);
        return vets[0];
    }

    const choices = vets.map(vet => ({
        name: `Dr(a). ${vet.nombre}`,
        value: vet
    }));
    choices.push(new inquirer.Separator(), { name: 'Cancelar', value: null });

    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message: 'Elige un veterinario para tu cita:',
            choices: choices
        }
    ]);
    return selected;
}

async function promptForProductAction() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '¿Qué deseas hacer con estos productos?',
            choices: [
                { name: '1. 🛒 Agregar un producto al Carrito', value: 'add_to_cart' },
                { name: '2. ⭐ Agregar un producto a mis Preferencias', value: 'add_preference' },
                new inquirer.Separator(),
                { name: '3. ↩️ Volver', value: 'back' },
            ],
        },
    ]);
    return choice;
}

async function promptForServiceAction() {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: '¿Qué deseas hacer con estos servicios?',
            choices: [
                { name: '1. 📅 Agendar un servicio', value: 'schedule' },
                { name: '2. ⭐ Agregar un servicio a mis Preferencias', value: 'add_preference' },
                new inquirer.Separator(),
                { name: '3. ↩️ Volver', value: 'back' },
            ],
        },
    ]);
    return choice;
}


// Modificar la confirmación para incluir al veterinario
async function promptForAppointmentConfirmation(service, vet, time) {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: `¿Confirmas agendar el servicio "${service.name}" con el/la Dr(a). ${vet.nombre} para el día ${new Date(time).toLocaleString()}?`,
            default: true,
        },
    ]);
    return confirmed;
}

async function promptForDate(actionText = 'para la cita') {
    const { date } = await inquirer.prompt([
        {
            type: 'input',
            name: 'date',
            message: `Ingresa la fecha (YYYY-MM-DD) para ${actionText}:`,
            validate: (value) => value.match(/^\d{4}-\d{2}-\d{2}$/) ? true : 'Formato inválido. Usa AAAA-MM-DD.'
        }
    ]);
    return { date };
}


module.exports = {
    showMainMenu,
    showUserMenu,
    getRegistrationData,
    promptForLogin,
    showPreferencesMenu,
    promptForPreferenceToDelete,
    showPetMenu,
    promptForPetDetails,
    promptForPetId,
    promptForLogoutConfirmation,
    showCatalogMenu,
    promptForPreferenceId,
    showCartMenu,
    promptForItemId,
    promptForQuantity,
    promptToRemoveFromCart,
    promptForPurchaseConfirmation,
    promptForDailySlot,
    promptForVetSelection,
    promptForAppointmentConfirmation,
    promptForProductAction,
    promptForServiceAction,
    promptForDate,
    promptForPetSelection,
    close: () => {
        console.log('Adios!')
    }
};