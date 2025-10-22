// Datos históricos de precios (para gráfica y modelo; actualiza con reales)
const datosPrecios = [
    [1, 18], [2, 19], [3, 20], [4, 21], [5, 22], [6, 23], [7, 24], [8, 25], [9, 26], [10, 27], [11, 28], [12, 29]
];

// Mapa de coordenadas (igual)
const coordenadasMunicipios = {
    "Cobán": [15.47083, -90.37083],
    "Santa Cruz Verapaz": [15.36667, -90.43333],
    "San Cristóbal Verapaz": [15.39632, -90.56513],
    "Tactic": [15.32218, -90.35448],
    "Tamahú": [15.3089, -90.23599],
    "Tucurú": [15.3, -90.06667],
    "Panzós": [15.4, -89.66667],
    "Senahú": [15.4, -89.83333],
    "San Pedro Carchá": [15.48333, -90.26667],
    "San Juan Chamelco": [15.43333, -90.33333],
    "Lanquín": [15.56667, -89.96667],
    "Cahabón": [15.56667, -89.81667],
    "Chisec": [15.81667, -90.28333],
    "Chahal": [15.79122, -89.60518],
    "Fray Bartolomé de las Casas": [15.80697, -89.86103],
    "Santa Catalina La Tinta": [15.31667, -89.88333],
    "Raxruhá": [15.8666, -90.0424]
};

// Función para cargar tabla de precios dinámicos
async function cargarPrecios() {
    const url = 'https://api.tradingeconomics.com/markets/commodities?c=guest:guest';
    try {
        const response = await fetch(url);
        const data = await response.json();
        const tbody = document.querySelector('#precios-table tbody');
        tbody.innerHTML = ''; // Limpiar tabla

        // Filtrar para café (Arabica es 'Coffee', Robusta es 'Robusta Coffee')
        const tipos = ['Coffee', 'Robusta Coffee'];
        tipos.forEach(tipo => {
            const item = data.find(com => com.name === tipo || com.Name === tipo); // Buscar por nombre
            if (item) {
                const cambio = item.change; // Variación
                const cambioClass = cambio > 0 ? 'up' : (cambio < 0 ? 'down' : '');
                const cambioText = cambio > 0 ? `↑ ${cambio}` : (cambio < 0 ? `↓ ${Math.abs(cambio)}` : 'Sin cambio');

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tipo === 'Coffee' ? 'Arabica' : 'Robusta'}</td>
                    <td>${item.previous.toFixed(2)}</td>
                    <td>${item.last.toFixed(2)}</td>
                    <td class="${cambioClass}">${cambioText}</td>
                `;
                tbody.appendChild(row);
            }
        });
    } catch (error) {
        console.error('Error al cargar precios:', error);
        // Fallback hardcoded si falla
        const tbody = document.querySelector('#precios-table tbody');
        tbody.innerHTML = '<tr><td>Arabica</td><td>4.50</td><td>4.60</td><td>↑ 0.10</td></tr><tr><td>Robusta</td><td>3.20</td><td>3.15</td><td>↓ 0.05</td></tr>';
    }
}

// Gráfico inicial (igual)
let chart;
function initGrafico() {
    const ctx = document.getElementById('grafico').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosPrecios.map(d => `Mes ${d[0]}`),
            datasets: [{
                label: 'Precios Históricos',
                data: datosPrecios.map(d => d[1]),
                borderColor: 'blue',
                fill: false
            }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

// Cargar todo al inicio
window.onload = function() {
    initGrafico();
    cargarPrecios(); // Carga la tabla dinámica
};

// Función para clima (igual)
async function actualizarClima() {
    const ubicacion = document.getElementById('ubicacion').value;
    const coords = coordenadasMunicipios[ubicacion];
    if (!coords) return;

    const apiKey = 'TU_API_KEY'; // Reemplaza
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        document.getElementById('temp').value = data.main.temp || 20;
        document.getElementById('lluvia').value = data.rain ? (data.rain['1h'] || 0) : 0;
    } catch (error) {
        alert('Error al obtener clima. Usa valores manuales.');
        document.getElementById('temp').removeAttribute('readonly');
        document.getElementById('lluvia').removeAttribute('readonly');
    }
}

// Predicción (igual)
async function predecirPrecio() {
    let cosecha = parseFloat(document.getElementById('cosecha').value) || 0;
    const unidad = document.getElementById('unidad').value;
    const tipo = document.getElementById('tipo').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const temp = parseFloat(document.getElementById('temp').value) || 20;
    const lluvia = parseFloat(document.getElementById('lluvia').value) || 200;

    if (unidad === 'libras') cosecha /= 100;

    const model = tf.sequential();
    model.add(tf.layers.dense({units: 1, inputShape: [1]}));
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

    const xs = tf.tensor2d(datosPrecios.map(d => d[0]), [datosPrecios.length, 1]);
    const ys = tf.tensor2d(datosPrecios.map(d => d[1]), [datosPrecios.length, 1]);

    await model.fit(xs, ys, {epochs: 100});

    const proximoMes = datosPrecios.length + 1;
    let prediccion = model.predict(tf.tensor2d([proximoMes], [1, 1])).dataSync()[0];

    if (temp > 22) prediccion -= (temp - 22) / 2;
    else if (temp < 18) prediccion -= (18 - temp) / 2;
    if (lluvia > 300) prediccion -= (lluvia - 300) / 50;
    else if (lluvia < 100) prediccion -= (100 - lluvia) / 50;
    prediccion -= cosecha / 50;
    if (tipo === 'Robusta') prediccion -= 2;
    if (ubicacion === 'Cobán') prediccion += 1;

    document.getElementById('resultado').innerHTML = `Precio predicho: Q${prediccion.toFixed(2)}/lb. Sugerencia: ${prediccion > 25 ? 'Vende ahora' : 'Espera'}.`;

    chart.data.labels.push(`Mes ${proximoMes} (Predicho)`);
    chart.data.datasets[0].data.push(prediccion);
    chart.data.datasets[0].borderDash = [5, 5];
    chart.update();
}