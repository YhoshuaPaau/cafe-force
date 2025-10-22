// Datos históricos de precios base (para gráfica, en Q/lb; actualiza con reales de Anacafé)
const datosPrecios = [
    [1, 30], [2, 31], [3, 32], [4, 33], [5, 34], [6, 35], [7, 36], [8, 37], [9, 38], [10, 39], [11, 40], [12, 41]
];

// Datos fijos por municipio: temp (°C promedio anual), lluvia (mm mensual promedio), priceAdjustment (ajuste en Q/lb por tipo)
const datosMunicipios = {
    "Cobán": { temp: 22, lluvia: 208, priceAdjustmentArabica: 3, priceAdjustmentRobusta: 2 }, // Alto por centro cafetalero
    "Santa Cruz Verapaz": { temp: 21, lluvia: 202, priceAdjustmentArabica: 2, priceAdjustmentRobusta: 1 },
    "San Cristóbal Verapaz": { temp: 20, lluvia: 210, priceAdjustmentArabica: 1, priceAdjustmentRobusta: 1 },
    "Tactic": { temp: 21, lluvia: 195, priceAdjustmentArabica: 2, priceAdjustmentRobusta: 1 },
    "Tamahú": { temp: 22, lluvia: 200, priceAdjustmentArabica: 1, priceAdjustmentRobusta: 0 },
    "Tucurú": { temp: 23, lluvia: 220, priceAdjustmentArabica: 0, priceAdjustmentRobusta: -1 }, // Remoto, más bajo
    "Panzós": { temp: 25, lluvia: 250, priceAdjustmentArabica: -2, priceAdjustmentRobusta: -2 },
    "Senahú": { temp: 24, lluvia: 240, priceAdjustmentArabica: -1, priceAdjustmentRobusta: -1 },
    "San Pedro Carchá": { temp: 22, lluvia: 205, priceAdjustmentArabica: 2, priceAdjustmentRobusta: 1 },
    "San Juan Chamelco": { temp: 21, lluvia: 198, priceAdjustmentArabica: 1, priceAdjustmentRobusta: 0 },
    "Lanquín": { temp: 23, lluvia: 230, priceAdjustmentArabica: -1, priceAdjustmentRobusta: -2 },
    "Cahabón": { temp: 24, lluvia: 235, priceAdjustmentArabica: -1, priceAdjustmentRobusta: -1 },
    "Chisec": { temp: 25, lluvia: 245, priceAdjustmentArabica: -2, priceAdjustmentRobusta: -2 },
    "Chahal": { temp: 26, lluvia: 260, priceAdjustmentArabica: -3, priceAdjustmentRobusta: -3 }, // Más remoto
    "Fray Bartolomé de las Casas": { temp: 25, lluvia: 255, priceAdjustmentArabica: -2, priceAdjustmentRobusta: -2 },
    "Santa Catalina La Tinta": { temp: 24, lluvia: 225, priceAdjustmentArabica: 0, priceAdjustmentRobusta: -1 },
    "Raxruhá": { temp: 23, lluvia: 215, priceAdjustmentArabica: -1, priceAdjustmentRobusta: -1 }
};

// Precios base (Q/lb, basados en datos 2025)
const basePriceArabica = 35;
const basePriceRobusta = 25;

// Función para cargar tabla de precios globales (convertidos a Q, tipo cambio ~7.8Q/USD)
async function cargarPrecios() {
    const url = 'https://api.tradingeconomics.com/markets/commodities?c=guest:guest';
    const tipoCambio = 7.8; // Aproximado Q por USD
    try {
        const response = await fetch(url);
        const data = await response.json();
        const tbody = document.querySelector('#precios-table tbody');
        tbody.innerHTML = '';

        const tipos = { 'Coffee': 'Arabica', 'Robusta Coffee': 'Robusta' };
        let found = false;
        Object.keys(tipos).forEach(key => {
            const item = data.find(com => com.name === key || com.Name === key);
            if (item) {
                found = true;
                const prevQ = (item.previous * tipoCambio).toFixed(2);
                const lastQ = (item.last * tipoCambio).toFixed(2);
                const cambio = item.change;
                const cambioClass = cambio > 0 ? 'up' : (cambio < 0 ? 'down' : '');
                const cambioText = cambio > 0 ? `↑ ${cambio}` : (cambio < 0 ? `↓ ${Math.abs(cambio)}` : 'Sin cambio');

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tipos[key]}</td>
                    <td>${prevQ}</td>
                    <td>${lastQ}</td>
                    <td class="${cambioClass}">${cambioText}</td>
                `;
                tbody.appendChild(row);
            }
        });
        if (!found) throw new Error('No data'); // Forzar fallback si no encuentra
    } catch (error) {
        // Fallback con datos reales de octubre 2025 (Arabica ~33Q/lb, Robusta ~24.5Q/lb)
        const tbody = document.querySelector('#precios-table tbody');
        tbody.innerHTML = '<tr><td>Arabica</td><td>32.00</td><td>33.07</td><td class="up">↑ 1.07</td></tr><tr><td>Robusta</td><td>25.00</td><td>24.57</td><td class="down">↓ 0.43</td></tr>';
    }
}

// Gráfico inicial
let chart;
function initGrafico() {
    const ctx = document.getElementById('grafico').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datosPrecios.map(d => `Mes ${d[0]}`),
            datasets: [{
                label: 'Precios Históricos (Q/lb)',
                data: datosPrecios.map(d => d[1]),
                borderColor: 'blue',
                fill: false
            }]
        },
        options: { scales: { y: { beginAtZero: false } } }
    });
}

// Cargar al inicio
window.onload = function() {
    initGrafico();
    cargarPrecios();
    actualizarMunicipio(); // Inicial
};

// Función para actualizar campos fijos al seleccionar municipio
function actualizarMunicipio() {
    const ubicacion = document.getElementById('ubicacion').value;
    const data = datosMunicipios[ubicacion] || { temp: 22, lluvia: 200 }; // Default
    document.getElementById('temp').value = data.temp;
    document.getElementById('lluvia').value = data.lluvia;
}

// Predicción
async function predecirPrecio() {
    let cosecha = parseFloat(document.getElementById('cosecha').value) || 0;
    const unidad = document.getElementById('unidad').value;
    const tipo = document.getElementById('tipo').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const temp = parseFloat(document.getElementById('temp').value);
    const lluvia = parseFloat(document.getElementById('lluvia').value);

    if (unidad === 'libras') cosecha /= 100;

    // Precio base ajustado por tipo y municipio
    let basePrice = tipo === 'Arabica' ? basePriceArabica : basePriceRobusta;
    const dataMunicipio = datosMunicipios[ubicacion];
    const priceAdjustment = tipo === 'Arabica' ? dataMunicipio.priceAdjustmentArabica : dataMunicipio.priceAdjustmentRobusta;
    basePrice += priceAdjustment;

    const model = tf.sequential();
    model.add(tf.layers.dense({units: 1, inputShape: [1]}));
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

    const xs = tf.tensor2d(datosPrecios.map(d => d[0]), [datosPrecios.length, 1]);
    const ys = tf.tensor2d(datosPrecios.map(d => d[1]), [datosPrecios.length, 1]);

    await model.fit(xs, ys, {epochs: 100});

    const proximoMes = datosPrecios.length + 1;
    let prediccion = model.predict(tf.tensor2d([proximoMes], [1, 1])).dataSync()[0] + basePrice - 30; // Ajuste para alinear con base

    // Ajustes por factores (más penalización para variar sugerencia)
    if (temp > 22) prediccion -= (temp - 22) * 1.5;
    else if (temp < 18) prediccion -= (18 - temp) * 1.5;
    if (lluvia > 250) prediccion -= (lluvia - 250) / 20; // Óptimo 150-250
    if (lluvia < 150) prediccion -= (150 - lluvia) / 20;
    prediccion -= cosecha / 10; // Más fuerte para cosechas grandes

    document.getElementById('resultado').innerHTML = `Precio predicho en ${ubicacion} para ${tipo}: Q${prediccion.toFixed(2)}/lb (ajustado por local). Sugerencia: ${prediccion > basePrice ? 'Vende ahora (alto)' : 'Espera (podría subir)'}.`;

    chart.data.labels.push(`Mes ${proximoMes} (Predicho)`);
    chart.data.datasets[0].data.push(prediccion);
    chart.data.datasets[0].borderDash = [5, 5];
    chart.update();
}