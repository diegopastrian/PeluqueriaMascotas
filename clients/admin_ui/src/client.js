require('dotenv').config();
const { showMainMenu, promptRegisterEmployee, promptLoginEmployee, promptAdjustStock, promptAddStock, promptQueryStock } = require('./ui/adminConsole');
const { registerEmployee, loginEmployee } = require('./service/authService');
const { adjustStock, addStock, queryStock ,consultaglobal, showAllStockTable} = require('./service/stockService');
const { verifyToken } = require('./config/verify_token.js');

async function main() {
  let token = '';
  let employeeId = '';
  let employeeName = '';

  while (true) {
    const isAuthenticated = !!token;
    const action = await showMainMenu(isAuthenticated);

    if (action === 'exit') {
      console.log('Saliendo del sistema...');
      break;
    }

    try {
      if (action === 'register') {
        const employeeData = await promptRegisterEmployee();
        const result = await registerEmployee(employeeData);
        console.log(`✅ ${result.message}: ID=${result.id}, Email=${result.email}`);
      } else if (action === 'login') {
  const loginData = await promptLoginEmployee(); 
const result = await loginEmployee(loginData);
const verification = verifyToken(result.token);
if (!verification.success) throw new Error("Solo empleados pueden acceder alejate de aqui");

token = result.token;
employeeId = result.id;
employeeName = result.nombre;
console.log(`✅ ${result.message}`);
      } else if (action === 'logout') {
        token = '';
        employeeId = '';
        employeeName = '';
        console.log('✅ Sesion cerrada');
      } else if (action === 'adjustStock') {
        await showAllStockTable();  
        const stockData = await promptAdjustStock();
        const result = await adjustStock(token, stockData.productId, stockData.quantity, stockData.motivo);
        console.log(`✅ ${result.message}: ${result.data}`);
      } else if (action === 'addStock') {
        const stockData = await promptAddStock();
        const result = await addStock(token,stockData.productName, stockData.desc,stockData.precio_costo,stockData.precioventa,stockData.stock_inicial);
        console.log(`✅ ${result.message}: ${result.data}`);
      } else if (action === 'queryStock') {
        await showAllStockTable();  
       // const stockData = await promptQueryStock();
       // const result = await queryStock(stockData.productId);
       // console.log(`✅ ${result.message}: ${result.data}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    // Pausa para que el usuario vea el resultado antes de volver al menu
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main().catch((err) => {
  console.error(`Error en la aplicacion: ${err.message}`);
  process.exit(1);
});