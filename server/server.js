const http = require('http');
const axios = require('axios'); // Necesitarás axios: npm install axios

//const ENDPOINT = 'http://localhost:3000/api/listnumber/history'; // Reemplaza con tu URL
const ENDPOINT = 'https://should-republican-u-staffing.trycloudflare.com/api/listnumber/history';
const POLLING_DELAY_MS = 3000; // 3 segundos entre consultas

// Función para consultar el endpoint
async function fetchData() {
  try {
    const response = await axios.get(ENDPOINT);
    //console.log('✅ Datos recibidos:', response.data);
    console.log('✅ Consulta exitosa a las:', new Date().toLocaleTimeString());
  } catch (error) {
    console.error('❌ Error al consultar:', error.message);
  }finally {
    // Programar la próxima consulta después del delay
    setTimeout(fetchData, POLLING_DELAY_MS);
  }
}

// Servidor HTTP en puerto 3001 (opcional, para verificar que está activo)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor de polling activo en puerto 3001\n');
});

server.listen(3001, () => {
  console.log('🚀 Servidor escuchando en http://localhost:3001');
  // Iniciar polling cada 3 segundos
  fetchData();
});
