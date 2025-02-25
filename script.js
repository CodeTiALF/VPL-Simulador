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
        input.addEventListener('change', () => {
            verificarFormulario();
            salvarFormulario();
        });
    });

    // Carrega os dados salvos ao iniciar
    carregarFormulario();
    
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
        
        // Adiciona eventos de mudança aos novos inputs
        parcelaDiv.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                verificarFormulario();
                salvarFormulario();
            });
        });

        // Adiciona evento para remover a parcela
        parcelaDiv.querySelector('.remover-parcela').addEventListener('click', function() {
            parcelasContainer.removeChild(parcelaDiv);
            verificarFormulario();
            salvarFormulario();
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
            `.trim();
        });
        
        html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3"><strong>Total do Imóvel:</strong></td>
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
        `.trim();
        
        fluxoPagamento.innerHTML = html;
    }
    
    /**
     * Exporta o relatório como PDF
     */
    function exportarRelatorio() {
        // Garante que a simulação foi calculada
        calcularSimulacao();
        
        // Registra o log de exportação
        registrarLog({
            acao: 'exportacao',
            timestamp: new Date()
        });

        // Adiciona o script jsPDF ao documento se não existir
        if (!window.jsPDF) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => generateAndDownloadPDF();
            document.head.appendChild(script);
        } else {
            generateAndDownloadPDF();
        }
    }
    
    function generateAndDownloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const elementoExportar = document.querySelector('.resultado');
        
        // Configurações de estilo
        const styles = {
            header: { fontSize: 14, fontStyle: 'bold', textColor: [66, 133, 244] },
            title: { fontSize: 12, fontStyle: 'bold', textColor: [51, 51, 51] },
            tableHeader: { fontSize: 9, fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [66, 133, 244] },
            tableRow: { fontSize: 8, fontStyle: 'normal', textColor: [51, 51, 51] },
            tableFooter: { fontSize: 9, fontStyle: 'bold', textColor: [51, 51, 51] },
            rowHeight: 5, // Altura reduzida das linhas
            stripedRow: [240, 240, 240] // Cor para linhas alternadas
        };

        // Adiciona título
        doc.setFontSize(styles.header.fontSize);
        doc.setTextColor(...styles.header.textColor);
        doc.text('Simulação VPL', 105, 15, { align: 'center' });

        // Dados do imóvel
        const valorTabela = document.getElementById('valor-tabela').value;
        doc.setFontSize(styles.title.fontSize);
        doc.setTextColor(...styles.title.textColor);
        doc.text(`Valor do Imóvel: ${formatarMoeda(parseFloat(valorTabela))}`, 10, 22);

        // Configuração da tabela
        const startY = 28;
        const margin = 10;
        const pageWidth = doc.internal.pageSize.width;
        const tableWidth = pageWidth - (margin * 2);
        const columns = [
            { header: 'N°', width: 15, align: 'left' },
            { header: 'Tipo', width: 30, align: 'left' },
            { header: 'Data', width: 25, align: 'center' },
            { header: 'Valor', width: 35, align: 'right' },
            { header: 'Acumulado', width: 35, align: 'right' },
            { header: '% Total', width: 25, align: 'right' }
        ];

        // Desenha cabeçalho da tabela
        let currentY = startY;
        
        // Desenha borda superior da tabela
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.line(margin, currentY, margin + tableWidth, currentY);

        // Fundo do cabeçalho
        doc.setFillColor(...styles.tableHeader.fillColor);
        doc.rect(margin, currentY, tableWidth, styles.rowHeight + 1, 'F');
        
        // Texto do cabeçalho
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(styles.tableHeader.fontSize);
        let currentX = margin;
        columns.forEach(col => {
            doc.text(col.header, currentX + (col.align === 'right' ? col.width : 2), currentY + 4);
            currentX += col.width;
            // Linha vertical divisória
            doc.line(currentX, currentY, currentX, currentY + styles.rowHeight + 1);
        });

        // Obtem dados da tabela
        const rows = Array.from(elementoExportar.querySelectorAll('tbody tr'));
        const footerRows = Array.from(elementoExportar.querySelectorAll('tfoot tr'));

        // Desenha linhas da tabela
        currentY += styles.rowHeight + 1;
        doc.setTextColor(...styles.tableRow.textColor);
        doc.setFontSize(styles.tableRow.fontSize);

        rows.forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            
            // Adiciona nova página se necessário
            if (currentY > 280) {
                doc.addPage();
                currentY = 20;
            }

            // Fundo alternado para linhas
            if (index % 2 === 1) {
                doc.setFillColor(...styles.stripedRow);
                doc.rect(margin, currentY, tableWidth, styles.rowHeight, 'F');
            }

            // Desenha células
            currentX = margin;
            cells.forEach((cell, i) => {
                const text = cell.textContent.trim();
                doc.text(text, currentX + (columns[i].align === 'right' ? columns[i].width - 2 : 2), 
                    currentY + 3.5, { align: columns[i].align });
                currentX += columns[i].width;
                // Linha vertical divisória
                doc.line(currentX, currentY, currentX, currentY + styles.rowHeight);
            });

            // Linha horizontal inferior
            doc.line(margin, currentY + styles.rowHeight, margin + tableWidth, currentY + styles.rowHeight);
            currentY += styles.rowHeight;
        });

        // Desenha rodapé da tabela
        doc.setFillColor(245, 245, 245);
        const footerHeight = styles.rowHeight + 1;
        doc.rect(margin, currentY, tableWidth, footerHeight * footerRows.length, 'F');
        doc.setFontSize(styles.tableFooter.fontSize);
        doc.setTextColor(...styles.tableFooter.textColor);

        footerRows.forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll('td'));
            currentX = margin;
            
            cells.forEach((cell, i) => {
                if (cell.colSpan) {
                    const text = cell.textContent.trim();
                    const totalWidth = columns.slice(0, cell.colSpan).reduce((sum, col) => sum + col.width, 0);
                    doc.text(text, currentX + 2, currentY + 4, { align: 'left' });
                    currentX += totalWidth;
                } else {
                    const text = cell.textContent.trim();
                    doc.text(text, currentX + columns[i].width - 2, currentY + 4, { align: 'right' });
                    currentX += columns[i].width;
                }
                // Linha vertical divisória
                doc.line(currentX, currentY, currentX, currentY + footerHeight);
            });

            // Linha horizontal inferior
            doc.line(margin, currentY + footerHeight, margin + tableWidth, currentY + footerHeight);
            currentY += footerHeight;
        });

        // Adiciona data de geração
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 
            doc.internal.pageSize.height - 10, { align: 'right' });
        
        // Download do PDF
        doc.save('VPL_Simulacao_' + new Date().toISOString().slice(0, 10) + '.pdf');
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

    /**
     * Salva os dados do formulário no localStorage
     */
    function salvarFormulario() {
        const dados = {
            valorTabela: document.getElementById('valor-tabela').value,
            valorSinal: document.getElementById('valor-sinal').value,
            dataSinal: document.getElementById('data-sinal').value,
            qtdMensais: document.getElementById('qtd-mensais').value,
            valorMensais: document.getElementById('valor-mensais').value,
            parcelasIntermediarias: []
        };

        // Salva dados das parcelas intermediárias
        document.querySelectorAll('.parcela-intermediaria').forEach(parcela => {
            dados.parcelasIntermediarias.push({
                valor: parcela.querySelector('.intermediaria-valor').value,
                data: parcela.querySelector('.intermediaria-data').value
            });
        });

        localStorage.setItem('vplFormData', JSON.stringify(dados));
    }

    /**
     * Carrega os dados salvos do localStorage
     */
    function carregarFormulario() {
        const dadosSalvos = localStorage.getItem('vplFormData');
        if (!dadosSalvos) return;

        const dados = JSON.parse(dadosSalvos);

        // Preenche os campos principais
        document.getElementById('valor-tabela').value = dados.valorTabela || '';
        document.getElementById('valor-sinal').value = dados.valorSinal || '';
        document.getElementById('data-sinal').value = dados.dataSinal || '';
        document.getElementById('qtd-mensais').value = dados.qtdMensais || '';
        document.getElementById('valor-mensais').value = dados.valorMensais || '';

        // Adiciona as parcelas intermediárias salvas
        if (dados.parcelasIntermediarias && dados.parcelasIntermediarias.length > 0) {
            dados.parcelasIntermediarias.forEach(parcela => {
                const index = document.querySelectorAll('.parcela-intermediaria').length + 1;
                
                const parcelaDiv = document.createElement('div');
                parcelaDiv.className = 'parcela-intermediaria';
                parcelaDiv.innerHTML = `
                    <div class="input-group">
                        <label for="intermediaria-valor-${index}">Valor (R$):</label>
                        <input type="number" id="intermediaria-valor-${index}" class="intermediaria-valor" min="0" step="0.01" required value="${parcela.valor}">
                    </div>
                    <div class="input-group">
                        <label for="intermediaria-data-${index}">Data:</label>
                        <input type="date" id="intermediaria-data-${index}" class="intermediaria-data" required value="${parcela.data}">
                    </div>
                    <button type="button" class="btn-danger remover-parcela"><i class="fas fa-trash"></i></button>
                `;
                
                parcelasContainer.appendChild(parcelaDiv);
                
                // Adiciona evento para remover a parcela
                parcelaDiv.querySelector('.remover-parcela').addEventListener('click', function() {
                    parcelasContainer.removeChild(parcelaDiv);
                    verificarFormulario();
                    salvarFormulario();
                });
                
                // Adiciona eventos de mudança aos inputs
                parcelaDiv.querySelectorAll('input').forEach(input => {
                    input.addEventListener('change', () => {
                        verificarFormulario();
                        salvarFormulario();
                    });
                });
            });
        }

        // Atualiza o formulário
        verificarFormulario();
    }
});