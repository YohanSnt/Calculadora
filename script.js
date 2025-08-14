let circuitData = {};

// Alternar entre modos de entrada
function toggleInputMode() {
    const mode = document.getElementById('input-mode').value;
    document.getElementById('voltage-inputs').style.display = mode === 'voltage' ? 'block' : 'none';
    document.getElementById('current-input').style.display = mode === 'current' ? 'block' : 'none';
}

// Adicionar/remover componentes (funções mantidas iguais)
function addBattery() {
    const container = document.getElementById('battery-inputs');
    const div = document.createElement('div');
    div.className = 'battery-item';
    div.innerHTML = `
        <input type="number" class="battery-voltage" placeholder="Tensão (V)" min="0" step="0.1">
        <button class="remove-btn" onclick="removeBattery(this)">-</button>
    `;
    container.appendChild(div);
}

function removeBattery(button) {
    const items = document.querySelectorAll('.battery-item');
    if (items.length > 1) {
        button.parentElement.remove();
    } else {
        showError("É necessário pelo menos um gerador!");
    }
}

function addResistor() {
    const container = document.getElementById('resistor-inputs');
    const div = document.createElement('div');
    div.className = 'resistor-item';
    div.innerHTML = `
        <input type="number" class="resistor-value" placeholder="Resistência (Ω)" min="0" step="0.1">
        <button class="remove-btn" onclick="removeResistor(this)">-</button>
    `;
    container.appendChild(div);
}

function removeResistor(button) {
    const items = document.querySelectorAll('.resistor-item');
    if (items.length > 1) {
        button.parentElement.remove();
    } else {
        showError("É necessário pelo menos um resistor!");
    }
}

// Calcular parâmetros do circuito
function calculateCircuit() {
    const powerLed = document.getElementById('power-led');
    powerLed.classList.add('on');
    
    const inputMode = document.getElementById('input-mode').value;
    const resistorType = document.getElementById('resistor-type').value;
    const resistorValues = Array.from(document.querySelectorAll('.resistor-value')).map(input => parseFloat(input.value) || 0);
    
    // Validar resistores
    if (resistorValues.some(r => r <= 0)) {
        showError("Todos os resistores devem ter valores positivos!");
        return false;
    }
    
    // Calcular resistência equivalente
    let equivalentResistance;
    if (resistorType === 'series') {
        equivalentResistance = resistorValues.reduce((sum, r) => sum + r, 0);
    } else {
        equivalentResistance = 1 / resistorValues.reduce((sum, r) => sum + 1/r, 0);
    }
    
    // Obter parâmetros conforme modo de entrada
    if (inputMode === 'voltage') {
        const batteryVoltages = Array.from(document.querySelectorAll('.battery-voltage')).map(input => parseFloat(input.value) || 0);
        
        if (batteryVoltages.some(v => v <= 0)) {
            showError("Todas as tensões dos geradores devem ser positivas!");
            return false;
        }
        
        const totalVoltage = batteryVoltages.reduce((sum, v) => sum + v, 0);
        const totalCurrent = totalVoltage / equivalentResistance;
        
        if (totalCurrent > 10) {
            showError(`PERIGO! Corrente total (${totalCurrent.toFixed(2)}A) excede o limite de 10A!`);
            return false;
        }
        
        circuitData = calculateParameters(resistorType, resistorValues, totalVoltage, totalCurrent);
    } else {
        const totalCurrent = parseFloat(document.getElementById('total-current').value) || 0;
        
        if (totalCurrent <= 0) {
            showError("A corrente deve ser positiva!");
            return false;
        }
        
        if (totalCurrent > 10) {
            showError(`PERIGO! Corrente (${totalCurrent.toFixed(2)}A) excede o limite de 10A!`);
            return false;
        }
        
        const totalVoltage = totalCurrent * equivalentResistance;
        circuitData = calculateParameters(resistorType, resistorValues, totalVoltage, totalCurrent);
    }
    
    return true;
}

// Calcular todos os parâmetros do circuito
function calculateParameters(resistorType, resistorValues, totalVoltage, totalCurrent) {
    const resistorResults = [];
    
    if (resistorType === 'series') {
        for (let i = 0; i < resistorValues.length; i++) {
            const voltage = totalCurrent * resistorValues[i];
            const power = totalCurrent * voltage;
            resistorResults.push({
                index: i+1,
                resistance: resistorValues[i],
                voltage: voltage,
                current: totalCurrent,
                power: power
            });
        }
    } else {
        for (let i = 0; i < resistorValues.length; i++) {
            const current = totalVoltage / resistorValues[i];
            const power = current * totalVoltage;
            resistorResults.push({
                index: i+1,
                resistance: resistorValues[i],
                voltage: totalVoltage,
                current: current,
                power: power
            });
        }
    }
    
    return {
        resistorType,
        totalVoltage,
        equivalentResistance: resistorType === 'series' ? 
            resistorValues.reduce((sum, r) => sum + r, 0) : 
            1 / resistorValues.reduce((sum, r) => sum + 1/r, 0),
        totalCurrent,
        totalPower: totalVoltage * totalCurrent,
        resistorResults,
        inputMode: document.getElementById('input-mode').value
    };
}

// Funções de exibição (mantidas similares com adição de informações do modo de entrada)
function showError(message) {
    const display = document.getElementById('display');
    const powerLed = document.getElementById('power-led');
    powerLed.classList.remove('on');
    
    display.innerHTML = `
        <div class="warning">ERRO: ${message}</div>
        <div id="results" class="results"></div>
    `;
}

function calculateCurrent() {
    if (calculateCircuit()) {
        const resultsDiv = document.getElementById('results');
        const modeInfo = circuitData.inputMode === 'voltage' ? 
            "Modo: Tensão → Corrente calculada pela Lei de Ohm (I = V/R)" :
            "Modo: Corrente → Tensão calculada pela Lei de Ohm (V = I×R)";
        
        resultsDiv.innerHTML = `
            <div class="mode-info">${modeInfo}</div>
            <div class="result-title">RESULTADOS DE CORRENTE</div>
            <div class="result-item">
                <strong>Corrente Total:</strong> ${circuitData.totalCurrent.toFixed(2)}A<br>
                <small class="formula">Fórmula: ${circuitData.inputMode === 'voltage' ? 
                    'I = V<sub>total</sub> / R<sub>eq</sub>' : 
                    'Entrada direta (Lei de Ohm: V = I×R)'}</small>
            </div>
        `;
        
        if (circuitData.resistorType === 'parallel') {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Fórmulas para associação em paralelo:</strong><br>
                    <small class="formula">• Corrente em cada resistor: I<sub>n</sub> = V<sub>total</sub> / R<sub>n</sub></small>
                </div>
            `;
            
            circuitData.resistorResults.forEach(res => {
                resultsDiv.innerHTML += `
                    <div class="result-item">
                        <strong>Corrente no Resistor R${res.index}:</strong> ${res.current.toFixed(2)}A
                    </div>
                `;
            });
        } else {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Em série, a corrente é a mesma em todos os resistores.</strong>
                </div>
            `;
        }
    }
}

function calculateVoltage() {
    if (calculateCircuit()) {
        const resultsDiv = document.getElementById('results');
        const modeInfo = circuitData.inputMode === 'voltage' ? 
            "Modo: Tensão → Corrente calculada pela Lei de Ohm (I = V/R)" :
            "Modo: Corrente → Tensão calculada pela Lei de Ohm (V = I×R)";
        
        resultsDiv.innerHTML = `
            <div class="mode-info">${modeInfo}</div>
            <div class="result-title">RESULTADOS DE TENSÃO</div>
            <div class="result-item">
                <strong>Tensão Total:</strong> ${circuitData.totalVoltage.toFixed(2)}V<br>
                <small class="formula">${circuitData.inputMode === 'voltage' ? 
                    'Soma das tensões dos geradores' : 
                    'Calculada pela Lei de Ohm: V = I×R<sub>eq</sub>'}</small>
            </div>
        `;
        
        if (circuitData.resistorType === 'series') {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Fórmulas para associação em série:</strong><br>
                    <small class="formula">• Tensão em cada resistor: V<sub>n</sub> = I<sub>total</sub> × R<sub>n</sub></small><br>
                    <small class="formula">• Divisor de tensão: V<sub>n</sub> = V<sub>total</sub> × (R<sub>n</sub> / R<sub>eq</sub>)</small>
                </div>
            `;
            
            circuitData.resistorResults.forEach(res => {
                resultsDiv.innerHTML += `
                    <div class="result-item">
                        <strong>Tensão no Resistor R${res.index}:</strong> ${res.voltage.toFixed(2)}V
                    </div>
                `;
            });
        } else {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Em paralelo, a tensão é a mesma em todos os resistores.</strong>
                </div>
            `;
        }
    }
}

function calculatePower() {
    if (calculateCircuit()) {
        const resultsDiv = document.getElementById('results');
        const modeInfo = circuitData.inputMode === 'voltage' ? 
            "Modo: Tensão → Corrente calculada pela Lei de Ohm (I = V/R)" :
            "Modo: Corrente → Tensão calculada pela Lei de Ohm (V = I×R)";
        
        resultsDiv.innerHTML = `
            <div class="mode-info">${modeInfo}</div>
            <div class="result-title">RESULTADOS DE POTÊNCIA</div>
            <div class="result-item">
                <strong>Potência Total:</strong> ${circuitData.totalPower.toFixed(2)}W<br>
                <small class="formula">Fórmula: P<sub>total</sub> = V<sub>total</sub> × I<sub>total</sub></small>
            </div>
            <div class="result-item">
                <strong>Fórmulas de potência:</strong><br>
                <small class="formula">• P = V × I (Potência elétrica básica)</small><br>
                <small class="formula">• P = R × I² (Lei de Joule)</small><br>
                <small class="formula">• P = V² / R</small>
            </div>
        `;
        
        circuitData.resistorResults.forEach(res => {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Potência no Resistor R${res.index}:</strong> ${res.power.toFixed(2)}W
                </div>
            `;
        });
    }
}

function calculateAll() {
    if (calculateCircuit()) {
        const resultsDiv = document.getElementById('results');
        const modeInfo = circuitData.inputMode === 'voltage' ? 
            "Modo: Tensão → Corrente calculada pela Lei de Ohm (I = V/R)" :
            "Modo: Corrente → Tensão calculada pela Lei de Ohm (V = I×R)";
        
        resultsDiv.innerHTML = `
            <div class="mode-info">${modeInfo}</div>
            <div class="result-title">RESULTADOS COMPLETOS</div>
            <div class="result-item">
                <strong>Tensão Total:</strong> ${circuitData.totalVoltage.toFixed(2)}V<br>
                <small class="formula">${circuitData.inputMode === 'voltage' ? 
                    'Soma das tensões dos geradores' : 
                    'Calculada pela Lei de Ohm: V = I×R<sub>eq</sub>'}</small>
            </div>
            <div class="result-item">
                <strong>Resistência Equivalente:</strong> ${circuitData.equivalentResistance.toFixed(2)}Ω<br>
                <small class="formula">${circuitData.resistorType === 'series' ? 
                    'Série: R<sub>eq</sub> = R<sub>1</sub> + R<sub>2</sub> + ... + R<sub>n</sub>' : 
                    'Paralelo: 1/R<sub>eq</sub> = 1/R<sub>1</sub> + 1/R<sub>2</sub> + ... + 1/R<sub>n</sub>'}</small>
            </div>
            <div class="result-item">
                <strong>Corrente Total:</strong> ${circuitData.totalCurrent.toFixed(2)}A<br>
                <small class="formula">${circuitData.inputMode === 'voltage' ? 
                    'Lei de Ohm: I = V<sub>total</sub> / R<sub>eq</sub>' : 
                    'Entrada direta'}</small>
            </div>
            <div class="result-item">
                <strong>Potência Total:</strong> ${circuitData.totalPower.toFixed(2)}W<br>
                <small class="formula">P = V × I</small>
            </div>
            <div class="result-title">DETALHES POR RESISTOR</div>
        `;
        
        if (circuitData.resistorType === 'series') {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Fórmulas para série:</strong><br>
                    <small class="formula">• Corrente igual em todos os resistores</small><br>
                    <small class="formula">• Tensão: V<sub>n</sub> = I × R<sub>n</sub></small><br>
                    <small class="formula">• Potência: P<sub>n</sub> = V<sub>n</sub> × I</small>
                </div>
            `;
        } else {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Fórmulas para paralelo:</strong><br>
                    <small class="formula">• Tensão igual em todos os resistores</small><br>
                    <small class="formula">• Corrente: I<sub>n</sub> = V / R<sub>n</sub></small><br>
                    <small class="formula">• Potência: P<sub>n</sub> = V × I<sub>n</sub></small>
                </div>
            `;
        }
        
        circuitData.resistorResults.forEach(res => {
            resultsDiv.innerHTML += `
                <div class="result-item">
                    <strong>Resistor R${res.index} (${res.resistance.toFixed(2)}Ω):</strong><br>
                    Tensão: ${res.voltage.toFixed(2)}V<br>
                    Corrente: ${res.current.toFixed(2)}A<br>
                    Potência: ${res.power.toFixed(2)}W
                </div>
            `;
        });
    }
}