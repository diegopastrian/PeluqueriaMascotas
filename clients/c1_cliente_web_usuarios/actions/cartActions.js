// actions/cartActions.js

const ui = require('../ui/consoleUI');
const bus = require('../services/busService');
const jwt = require('jsonwebtoken'); // <--- AÑADE ESTA LÍNEA EXACTAMENTE AQUÍ

// --- ESTADO DEL CARRITO (EN MEMORIA) ---
// El carrito será un array de objetos:
// [{ id: '1', name: 'Shampoo', type: 'producto', price: 15.50, quantity: 2 }, ...]
let cartItems = [];

// --- FUNCIONES INTERNAS DEL CARRITO ---

function addToCart(item, quantity) {
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id && cartItem.type === item.type);

    if (existingItem) {
        // Si el ítem ya existe, solo actualizamos la cantidad
        existingItem.quantity += quantity;
    } else {
        // Si es un ítem nuevo, lo agregamos al carrito
        cartItems.push({
            id: item.id,
            name: item.name,
            type: item.type,
            price: parseFloat(item.price),
            quantity: quantity
        });
    }
    console.log(`\n✅ ${quantity} x "${item.name}" agregado(s) al carrito.`);
}

function removeFromCart(itemIndex) {
    if (itemIndex >= 0 && itemIndex < cartItems.length) {
        const removedItem = cartItems.splice(itemIndex, 1);
        console.log(`\n✅ "${removedItem[0].name}" eliminado del carrito.`);
    } else {
        console.log('\n❌ Índice no válido.');
    }
}

function calculateTotal() {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
}

// --- FUNCIONES EXPUESTAS (MANEJADORES) ---

async function handleAddToCart(items, itemType) {
    // Usamos la nueva función de la UI que pide un ID
    const { itemId } = await ui.promptForItemId(itemType, 'agregar al carrito');

    // Buscamos el ítem en la lista que obtuvimos del catálogo
    const selectedItem = items.find(item => item.id === itemId);

    if (!selectedItem) {
        // Si el ID no existe en la lista actual, informamos al usuario y salimos
        return console.log(`\n❌ Error: El ID "${itemId}" no corresponde a un ${itemType} válido de la lista.`);
    }

    // --- El resto de la lógica de validación de stock y cantidad permanece igual ---

    // Validar stock si es un producto
    if (itemType === 'producto') {
        const currentInCart = cartItems.find(ci => ci.id === selectedItem.id && ci.type === 'producto');
        const quantityInCart = currentInCart ? currentInCart.quantity : 0;
        if (quantityInCart >= selectedItem.stock) {
            return console.log(`\n❌ No puedes agregar más "${selectedItem.name}". Ya tienes ${quantityInCart} en el carrito y el stock total es ${selectedItem.stock}.`);
        }
    }

    const { quantity } = await ui.promptForQuantity(selectedItem.stock, itemType);

    // Validar de nuevo con la cantidad solicitada
    if (itemType === 'producto') {
        const currentInCart = cartItems.find(ci => ci.id === selectedItem.id && ci.type === 'producto');
        const quantityInCart = currentInCart ? currentInCart.quantity : 0;
        if ((quantityInCart + quantity) > selectedItem.stock) {
            return console.log(`\n❌ Stock insuficiente. Solo puedes agregar ${selectedItem.stock - quantityInCart} más de "${selectedItem.name}".`);
        }
    }

    addToCart(selectedItem, quantity);
}


async function handleViewCart() {
    if (cartItems.length === 0) {
        return console.log('\n🛒 Tu carrito está vacío.');
    }

    console.log('\n--- 🛒 Contenido de tu Carrito ---');
    const displayItems = cartItems.map(item => ({
        ...item,
        subtotal: (item.price * item.quantity).toFixed(2)
    }));
    console.table(displayItems);
    console.log(`------------------------------------`);
    console.log(`   TOTAL: $${calculateTotal()}`);
    console.log(`------------------------------------\n`);
}

// ... (el resto del archivo, como cartItems, addToCart, etc., permanece igual)

// === REEMPLAZA ESTA FUNCIÓN COMPLETA ===
async function handlePurchase(token) {
    if (cartItems.length === 0) {
        return console.log('\n❌ No puedes realizar una compra con el carrito vacío.');
    }

    const total = calculateTotal();
    const confirmed = await ui.promptForPurchaseConfirmation(total);
    if (!confirmed) {
        return console.log('\nCompra cancelada.');
    }

    // --- CAMBIOS CLAVE AQUÍ ---

    // 1. Decodificar el token para obtener el ID del cliente
    let id_cliente;
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) {
            console.error('\n❌ Error: Token inválido o corrupto. No se pudo obtener el ID de cliente.');
            return;
        }
        id_cliente = decoded.id;
    } catch (error) {
        console.error('\n❌ Error al decodificar el token:', error.message);
        return;
    }

    // 2. Formatear los ítems como ya lo hacías
    const itemsPayload = cartItems.map(item => {
        // En tu servicio de ordenes esperas (id_producto, cantidad, precio_unitario)
        return `${item.id},${item.quantity},${item.price}`;
    }).join('|');

    // 3. Construir el payload CORRECTO con los 5 campos
    // formato: crear;token;id_cliente;itemsPayload;total
    const transactionData = `crear;${token};${id_cliente};${itemsPayload};${total}`;

    // --- FIN DE CAMBIOS CLAVE ---

    console.log('\n⏳ Procesando tu orden...');

    // El servicio de órdenes (S5) tiene el código 'ORDEN'
    const response = await bus.send('ORDEN', transactionData);

    // La respuesta de S5 confirma que la orden fue creada.
    // La generación del comprobante y la notificación ocurren en segundo plano.
    if (response.status === 'OK' && response.data.startsWith('ORCR;')) {
        const orderId = response.data.split(';')[1];
        console.log(`\n ¡Compra realizada con éxito! El ID de tu orden es: ${orderId}`);
        console.log('   Se ha iniciado la generación de tu comprobante y recibirás una notificación por email.');
        console.log('   Gracias por tu compra. Vaciando el carrito...');
        cartItems = []; // Vaciar el carrito después de una compra exitosa
    } else {
        const errorMessage = response.data.split(';')[1] || 'Error desconocido del servicio.';
        console.error(`\n Hubo un error al procesar tu orden: ${errorMessage}`);
    }
}

async function handleCartSubMenu(token) {
    let keepInMenu = true;
    while (keepInMenu) {
        await handleViewCart(); // Muestra el carrito siempre al entrar al menú
        const choice = await ui.showCartMenu(cartItems.length > 0);
        switch (choice) {
            case '1': // Comprar
                await handlePurchase(token);
                if (cartItems.length === 0) keepInMenu = false; // Salir del menú si el carrito se vació
                break;
            case '2': // Eliminar un ítem
                const { itemIndex } = await ui.promptToRemoveFromCart(cartItems);
                removeFromCart(itemIndex);
                break;
            case '3': // Volver
                keepInMenu = false;
                break;
            default:
                console.log('Opción no válida.');
                break;
        }
    }
}


module.exports = {
    handleCartSubMenu,
    handleAddToCart,
};