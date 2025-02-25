document.addEventListener('DOMContentLoaded', function() {
    // Inicialização das variáveis e elementos
    const themeSwitch = document.getElementById('theme-switch');
    const calcularBtn = document.getElementById('calcular');
    const exportarBtn = document.getElementById('exportar');
    const addParcelaBtn = document.getElementById('add-parcela');
    const parcelasContainer = document.getElementById('parcelas-intermediarias');
    const resultado = document.getElementById('resultado');
    const fluxoPagamento = document.getElementById('fluxo-pagamento');
    
    // Controle de tema (claro/escuro)
    initTheme();
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Event listeners para os botões
    addParcelaBtn.addEventListener('click', adicionarParcelaIntermediaria);
    calcularBtn.addEventListener('click', calcularSimulacao);
    exportarBtn.addEventListener('click', exportarRelatorio);
    
    // Event listeners para atualização automática dos resultados
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', verificarFormulario);
    });
    
    /**
     * Inicializa o tema com base na preferência salva
     */
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeSwitch.checked = true;
        }
    }
    
    /**
     * Alterna entre os temas claro e escuro
     */
    function toggleTheme() {
        if (themeSwitch.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    }
    
    /**
     * Adiciona uma nova parcela intermediária ao formulário
     */
    function adicionarParcelaIntermediaria() {
        const index = document.querySelectorAll('.parcela-intermediaria').length + 1;
        
        const parcelaDiv = document.createElement('div');
        parcelaDiv.className = 'parcela-intermediaria';
        parcelaDiv.innerHTML = `
            <div class="input-group">
                <label for="intermediaria-valor-${index}">Valor (R$):</label>
                <input type="number" id="intermediaria-valor-${index}" class="intermediaria-valor" min="0" step="0.01" required>
            </div>
            <div class="input-group">
                <label for="intermediaria-data-${index}">Data:</label>
                <input type="date" id="intermediaria-data-${index}" class="intermediaria-data" required>
            </div>
            <button type="button" class="btn-danger remover-parcela"><i class="fas fa-trash"></i></button>
        `;
        
        parcelasContainer.appendChild(parcelaDiv);
        
        // Adiciona evento para remover a parcela
        parcelaDiv.querySelector('.remover-parcela').addEventListener('click', function() {
            parcelasContainer.removeChild(parcelaDiv);
            verificarFormulario();
        });
        
        // Adiciona eventos de mudança aos novos inputs
        parcelaDiv.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', verificarFormulario);
        });
    }
    
    /**
     * Verifica se todos os campos do formulário estão preenchidos
     */
    function verificarFormulario() {
        const valorTabela = parseFloat(document.getElementById('valor-tabela').value) || 0;
        const valorSinal = parseFloat(document.getElementById('valor-sinal').value) || 0;
        const dataSinal = document.getElementById('data-sinal').value;
        const qtdMensais = parseInt(document.getElementById('qtd-mensais').value) || 0;
        const valorMensais = parseFloat(document.getElementById('valor-mensais').value) || 0;
        
        let formPreenchido = valorTabela > 0 && valorSinal > 0 && dataSinal && qtdMensais > 0 && valorMensais > 0;
        
        // Verifica se todas as parcelas intermediárias estão preenchidas
        const parcelasIntermediarias = document.querySelectorAll('.parcela-intermediaria');
        parcelasIntermediarias.forEach(parcela => {
            const valor = parseFloat(parcela.querySelector('.intermediaria-valor').value) || 0;
            const data = parcela.querySelector('.intermediaria-data').value;
            
            if (valor <= 0 || !data) {
                formPreenchido = false;
            }
        });
        
        // Habilita ou desabilita o botão de exportar
        exportarBtn.disabled = !formPreenchido;
        
        // Atualiza os campos de resumo se todos os valores principais estiverem preenchidos
        if (valorTabela > 0 && valorSinal > 0 && qtdMensais > 0 && valorMensais > 0) {
            atualizarResumo();
        }
    }
    
    /**
     * Atualiza o resumo financeiro
     */
    function atualizarResumo() {
        const valorTabela = parseFloat(document.getElementById('valor-tabela').value) || 0;
        const valorSinal = parseFloat(document.getElementById('valor-sinal').value) || 0;
        const qtdMensais = parseInt(document.getElementById('qtd-mensais').value) || 0;
        const valorMensais = parseFloat(document.getElementById('valor-mensais').value) || 0;
        
        // Calcula o valor total das parcelas intermediárias
        let totalIntermediarias = 0;
        document.querySelectorAll('.parcela-intermediaria').forEach(parcela => {
            const valor = parseFloat(parcela.querySelector('.intermediaria-valor').value) || 0;
            totalIntermediarias += valor;
        });
        
        // Calcula o total "Até as Chaves"
        const totalAteChaves = valorSinal + (qtdMensais * valorMensais) + totalIntermediarias;
        
        // Calcula o saldo para financiamento
        const saldoFinanciamento = valorTabela - totalAteChaves;
        
        // Atualiza os campos de resumo
        document.getElementById('total-ate-chaves').textContent = formatarMoeda(totalAteChaves);
        document.getElementById('saldo-financiamento').textContent = formatarMoeda(saldoFinanciamento);
    }
    
    /**
     * Calcula a simulação completa do VPL
     */
    function calcularSimulacao() {
        const valorTabela = parseFloat(document.getElementById('valor-tabela').value) || 0;
        const valorSinal = parseFloat(document.getElementById('valor-sinal').value) || 0;
        const dataSinal = new Date(document.getElementById('data-sinal').value);
        const qtdMensais = parseInt(document.getElementById('qtd-mensais').value) || 0;
        const valorMensais = parseFloat(document.getElementById('valor-mensais').value) || 0;
        
        // Array para armazenar todas as parcelas
        let parcelas = [];
        
        // Adiciona o sinal (parcela 0)
        parcelas.push({
            numero: 0,
            tipo: 'Sinal',
            data: new Date(dataSinal),
            valor: valorSinal
        });
        
        // Adiciona as parcelas mensais
        for (let i = 1; i <= qtdMensais; i++) {
            const dataParcela = new Date(dataSinal);
            dataParcela.setMonth(dataParcela.getMonth() + i);
            
            parcelas.push({
                numero: i,
                tipo: 'Mensal',
                data: new Date(dataParcela),
                valor: valorMensais
            });
        }
        
        // Adiciona as parcelas intermediárias
        document.querySelectorAll('.parcela-intermediaria').forEach((parcela, index) => {
            const valor = parseFloat(parcela.querySelector('.intermediaria-valor').value) || 0;
            const data = new Date(parcela.querySelector('.intermediaria-data').value);
            
            parcelas.push({
                numero: `I${index + 1}`,
                tipo: 'Intermediária',
                data: new Date(data),
                valor: valor
            });
        });
        
        // Ordena as parcelas por data
        parcelas.sort((a, b) => a.data - b.data);
        
        // Calcula o total "Até as Chaves"
        const totalAteChaves = parcelas.reduce((total, parcela) => total + parcela.valor, 0);
        
        // Calcula o saldo para financiamento
        const saldoFinanciamento = valorTabela - totalAteChaves;
        
        // Adiciona o financiamento como última parcela
        if (saldoFinanciamento > 0) {
            // Assume que o financiamento ocorre após a última parcela
            const ultimaData = new Date(Math.max(...parcelas.map(p => p.data.getTime())));
            
            parcelas.push({
                numero: 'F',
                tipo: 'Financiamento',
                data: new Date(ultimaData.setMonth(ultimaData.getMonth() + 1)),
                valor: saldoFinanciamento
            });
        }
        
        // Renderiza a tabela de fluxo de pagamento
        renderizarFluxoPagamento(parcelas, totalAteChaves, saldoFinanciamento, valorTabela);
        
        // Mostra a seção de resultado
        resultado.classList.remove('hidden');
        
        // Registra o log no servidor
        registrarLog({
            valorTabela,
            parcelas,
            totalAteChaves,
            saldoFinanciamento
        });
    }
    
    /**
     * Renderiza a tabela de fluxo de pagamento
     */
    function renderizarFluxoPagamento(parcelas, totalAteChaves, saldoFinanciamento, valorTabela) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Acumulado</th>
                        <th>% do Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let acumulado = 0;
        
        parcelas.forEach(parcela => {
            acumulado += parcela.valor;
            const percentual = (acumulado / valorTabela) * 100;
            
            html += `
                <tr>
                    <td>${parcela.numero}</td>
                    <td>${parcela.tipo}</td>
                    <td>${formatarData(parcela.data)}</td>
                    <td>${formatarMoeda(parcela.valor)}</td>
                    <td>${formatarMoeda(acumulado)}</td>
                    <td>${percentual.toFixed(2)}%</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Totais:</strong></td>
                        <td><strong>${formatarMoeda(valorTabela)}</strong></td>
                        <td colspan="2"></td>
                    </tr>
                    <tr>
                        <td colspan="3">Total "Até as Chaves":</td>
                        <td>${formatarMoeda(totalAteChaves)}</td>
                        <td colspan="2">${((totalAteChaves / valorTabela) * 100).toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td colspan="3">Saldo para Financiamento:</td>
                        <td>${formatarMoeda(saldoFinanciamento)}</td>
                        <td colspan="2">${((saldoFinanciamento / valorTabela) * 100).toFixed(2)}%</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        fluxoPagamento.innerHTML = html;
    }
    
    /**
     * Exporta o relatório como imagem
     */
    function exportarRelatorio() {
        // Garante que a simulação foi calculada
        calcularSimulacao();
        
        // Registra o log de exportação
        registrarLog({
            acao: 'exportacao',
            timestamp: new Date()
        });
        
        // Usa html2canvas para gerar uma imagem do relatório
        const elementoExportar = document.querySelector('.resultado');
        
        // Adiciona o script html2canvas ao documento se não existir
        if (!window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            script.onload = () => captureAndDownload(elementoExportar);
            document.head.appendChild(script);
        } else {
            captureAndDownload(elementoExportar);
        }
    }
    
    /**
     * Captura e faz o download da imagem do relatório
     */
    function captureAndDownload(element) {
        html2canvas(element).then(canvas => {
            const imageData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'VPL_Simulacao_' + new Date().toISOString().slice(0, 10) + '.png';
            link.href = imageData;
            link.click();
        });
    }
    
    /**
     * Registra logs no servidor usando PHP
     */
    function registrarLog(dados) {
        const formData = new FormData();
        formData.append('dados', JSON.stringify(dados));
        
        fetch('log.php', {
            method: 'POST',
            body: formData
        }).catch(erro => console.error('Erro ao registrar log:', erro));
    }
    
    /**
     * Formata um valor para moeda brasileira
     */
    function formatarMoeda(valor) {
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    /**
     * Formata uma data para o formato brasileiro
     */
    function formatarData(data) {
        return data.toLocaleDateString('pt-BR');
    }
});