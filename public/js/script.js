document.addEventListener('DOMContentLoaded', function() {
    // Inicialização das variáveis e elementos
    const themeSwitch = document.getElementById('theme-switch');
    const calcularBtn = document.getElementById('calcular');
    const exportarBtn = document.getElementById('exportar');
    const addParcelaBtn = document.getElementById('add-parcela');
    const parcelasContainer = document.getElementById('parcelas-intermediarias');
    const resultado = document.getElementById('resultado');
    const fluxoPagamento = document.getElementById('fluxo-pagamento');
    
    // Carrega as opções dos selects
    carregarOpcoesSelects();
    
    // Controle de tema (claro/escuro)
    initTheme();
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Event listeners para os botões
    addParcelaBtn.addEventListener('click', adicionarParcelaIntermediaria);
    calcularBtn.addEventListener('click', calcularSimulacao);
    exportarBtn.addEventListener('click', exportarRelatorio);
    
    // Event listeners para atualização automática dos resultados
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', () => {
            verificarFormulario();
            salvarFormulario();
        });
    });

    // Adiciona event listener para o checkbox do INCC
    const habilitarINCCCheckbox = document.getElementById('habilitar-incc');
    const taxaINCCInput = document.getElementById('taxa-incc');
    
    habilitarINCCCheckbox.addEventListener('change', function() {
        taxaINCCInput.disabled = !this.checked;
        if (this.checked) {
            taxaINCCInput.focus();
        }
        // Recalcula se houver dados suficientes
        verificarFormulario();
    });
    
    taxaINCCInput.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value > 10) this.value = 10;
        verificarFormulario();
    });

    // Carrega os dados salvos ao iniciar
    carregarFormulario();

    /**
     * Carrega as opções dos selects a partir dos arquivos TXT
     */
    async function carregarOpcoesSelects() {
        try {
            // Carrega opções da tabela
            const respostaTabela = await fetch('tabela_nomes.txt');
            const textoTabela = await respostaTabela.text();
            const opcoesTabela = textoTabela.split('\n').filter(linha => linha.trim());
            
            const selectTabela = document.getElementById('tabela');
            opcoesTabela.forEach(opcao => {
                if (opcao.trim() && !opcao.startsWith('//')) {
                    const option = document.createElement('option');
                    option.value = opcao.trim();
                    option.textContent = opcao.trim();
                    selectTabela.appendChild(option);
                }
            });

            // Carrega opções de solicitante
            const respostaSolicitante = await fetch('solicitante_nomes.txt');
            const textoSolicitante = await respostaSolicitante.text();
            const opcoesSolicitante = textoSolicitante.split('\n').filter(linha => linha.trim());
            
            const selectSolicitante = document.getElementById('solicitante');
            opcoesSolicitante.forEach(opcao => {
                if (opcao.trim() && !opcao.startsWith('//')) {
                    const option = document.createElement('option');
                    option.value = opcao.trim();
                    option.textContent = opcao.trim();
                    selectSolicitante.appendChild(option);
                }
            });

            // Recupera valores salvos após carregar as opções
            const dadosSalvos = localStorage.getItem('vplFormData');
            if (dadosSalvos) {
                const dados = JSON.parse(dadosSalvos);
                selectTabela.value = dados.tabela || '';
                selectSolicitante.value = dados.solicitante || '';
            }
        } catch (erro) {
            console.error('Erro ao carregar opções dos selects:', erro);
        }
    }
    
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
        const tabela = document.getElementById('tabela').value;
        const solicitante = document.getElementById('solicitante').value;
        const unidade = document.getElementById('unidade').value;
        const comprador = document.getElementById('comprador').value;
        const valorTabela = parseFloat(document.getElementById('valor-tabela').value) || 0;
        const valorSinal = parseFloat(document.getElementById('valor-sinal').value) || 0;
        const dataSinal = document.getElementById('data-sinal').value;
        const qtdMensais = parseInt(document.getElementById('qtd-mensais').value) || 0;
        const valorMensais = parseFloat(document.getElementById('valor-mensais').value) || 0;
        
        let formPreenchido = tabela && solicitante && unidade && comprador && 
                            valorTabela > 0 && valorSinal > 0 && dataSinal && 
                            qtdMensais > 0 && valorMensais > 0;
        
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
        const habilitarINCC = document.getElementById('habilitar-incc').checked;
        const taxaINCC = habilitarINCC ? parseFloat(document.getElementById('taxa-incc').value) / 100 : 0;
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Valor</th>
                        ${habilitarINCC ? `
                        <th>Correção INCC</th>
                        <th>Valor Corrigido</th>
                        ` : ''}
                        <th>Acumulado</th>
                        <th>% do Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let acumulado = 0;
        let totalCorrecao = 0;
        const dataBase = parcelas[0].data; // Data do sinal como base
        
        parcelas.forEach(parcela => {
            // Calcula meses entre a data base e a data da parcela
            const mesesDecorridos = (parcela.data.getFullYear() - dataBase.getFullYear()) * 12 + 
                                   (parcela.data.getMonth() - dataBase.getMonth());
            
            // Calcula correção INCC com a taxa personalizada
            const correcaoINCC = habilitarINCC && mesesDecorridos > 0 ? 
                               parcela.valor * (Math.pow(1 + taxaINCC, mesesDecorridos) - 1) : 0;
            const valorCorrigido = parcela.valor + correcaoINCC;
            
            totalCorrecao += correcaoINCC;
            acumulado += valorCorrigido;
            const percentual = (acumulado / valorTabela) * 100;
            
            html += `
                <tr>
                    <td>${parcela.numero}</td>
                    <td>${parcela.tipo}</td>
                    <td>${formatarData(parcela.data)}</td>
                    <td>${formatarMoeda(parcela.valor)}</td>
                    ${habilitarINCC ? `
                    <td>${formatarMoeda(correcaoINCC)}</td>
                    <td>${formatarMoeda(valorCorrigido)}</td>
                    ` : ''}
                    <td>${formatarMoeda(acumulado)}</td>
                    <td>${percentual.toFixed(2)}%</td>
                </tr>
            `.trim();
        });
        
        html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="${habilitarINCC ? '3' : '3'}"><strong>Total do Imóvel:</strong></td>
                    <td><strong>${formatarMoeda(valorTabela)}</strong></td>
                    <td colspan="${habilitarINCC ? '4' : '2'}"></td>
                </tr>
                <tr>
                    <td colspan="${habilitarINCC ? '3' : '3'}">Total "Até as Chaves":</td>
                    <td>${formatarMoeda(totalAteChaves)}</td>
                    ${habilitarINCC ? `
                    <td>${formatarMoeda(totalCorrecao)}</td>
                    <td>${formatarMoeda(totalAteChaves + totalCorrecao)}</td>
                    ` : ''}
                    <td>${((totalAteChaves / valorTabela) * 100).toFixed(2)}%</td>
                    <td></td>
                </tr>
                <tr>
                    <td colspan="${habilitarINCC ? '3' : '3'}">Saldo para Financiamento:</td>
                    <td>${formatarMoeda(saldoFinanciamento)}</td>
                    <td colspan="${habilitarINCC ? '4' : '2'}"></td>
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

        generateAndDownloadPDF();
    }
    
    function generateAndDownloadPDF() {
        try {
            const doc = new jsPDF();
            const habilitarINCC = document.getElementById('habilitar-incc').checked;
            const taxaINCC = habilitarINCC ? parseFloat(document.getElementById('taxa-incc').value) : 0;

            // Configurações de estilo
            const styles = {
                header: { fontSize: 14, fontStyle: 'bold', textColor: [66, 133, 244] },
                title: { fontSize: 11, fontStyle: 'bold', textColor: [51, 51, 51] },
                info: { fontSize: 10, fontStyle: 'normal', textColor: [51, 51, 51] }
            };

            // Obtém os dados do formulário
            const unidade = document.getElementById('unidade').value;
            const comprador = document.getElementById('comprador').value;
            const solicitante = document.getElementById('solicitante').value;
            const tabela = document.getElementById('tabela').value;
            const valorTabela = parseFloat(document.getElementById('valor-tabela').value);
            
            // Obtém valores para os cálculos
            const totalAteChaves = parseFloat(document.getElementById('total-ate-chaves').textContent.replace(/[^0-9,-]/g, '').replace(',', '.'));
            const saldoFinanciamento = parseFloat(document.getElementById('saldo-financiamento').textContent.replace(/[^0-9,-]/g, '').replace(',', '.'));

            // Configurações da página
            const pageWidth = doc.internal.pageSize.width;
            const margin = 10;

            // Título e cabeçalho
            doc.setFontSize(styles.header.fontSize);
            doc.setTextColor(...styles.header.textColor);
            doc.text(`Simulação VPL - Unidade ${unidade} - ${comprador}`, pageWidth / 2, 12, { align: 'center' });

            // Informações do imóvel
            doc.setFontSize(styles.info.fontSize);
            doc.setTextColor(...styles.info.textColor);
            doc.text(`Tabela: ${tabela}`, margin, 20);
            doc.text(`Valor do Imóvel: ${formatarMoeda(valorTabela)}`, margin, 26);
            doc.text(`Solicitante: ${solicitante}`, pageWidth - margin, 26, { align: 'right' });

            if (habilitarINCC) {
                doc.text(`Taxa INCC: ${taxaINCC.toFixed(2)}% a.m.`, margin, 32);
            }

            // Obtém os dados da tabela HTML
            const tabelaHTML = document.querySelector('#fluxo-pagamento table');
            if (!tabelaHTML) {
                throw new Error('Tabela não encontrada. Execute a simulação primeiro.');
            }

            // Prepara os dados para a tabela
            let head;
            if (habilitarINCC) {
                head = [['N°', 'Tipo', 'Data', 'Valor', 'Correção INCC', 'Valor Corrigido', 'Acumulado', '% do Total']];
            } else {
                head = [['N°', 'Tipo', 'Data', 'Valor', 'Acumulado', '% do Total']];
            }

            // Extrai apenas as linhas do corpo da tabela (não inclui os totais)
            const body = Array.from(tabelaHTML.querySelectorAll('tbody tr')).map(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
                return cells;
            });

            // Calcula o total de correção INCC (se habilitado)
            let totalCorrecao = 0;
            if (habilitarINCC) {
                const correcoesElements = Array.from(tabelaHTML.querySelectorAll('tbody tr')).map(tr => 
                    parseFloat(tr.querySelectorAll('td')[4].textContent.replace(/[^0-9,-]/g, '').replace(',', '.'))
                );
                totalCorrecao = correcoesElements.reduce((a, b) => a + b, 0);
            }

            // Configura e gera a tabela principal
            doc.autoTable({
                startY: habilitarINCC ? 38 : 32,
                head: head,
                body: body,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 1,
                    lineColor: [220, 220, 220],
                    textColor: [50, 50, 50],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [66, 133, 244],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: habilitarINCC ? {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 20, halign: 'left' },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 22, halign: 'right' },
                    4: { cellWidth: 22, halign: 'right' },
                    5: { cellWidth: 22, halign: 'right' },
                    6: { cellWidth: 22, halign: 'right' },
                    7: { cellWidth: 18, halign: 'right' }
                } : {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 22, halign: 'left' },
                    2: { cellWidth: 22, halign: 'center' },
                    3: { cellWidth: 25, halign: 'right' },
                    4: { cellWidth: 25, halign: 'right' },
                    5: { cellWidth: 20, halign: 'right' }
                },
                margin: { left: 10, right: 10 }
            });

            // Posição para a tabela de resumo
            const finalY = doc.lastAutoTable.finalY + 15;

            // Adiciona a tabela de resumo financeiro (estilo mais profissional)
            // Define os dados para a tabela de resumo
            let resumoData = [];
            let resumoHead = [['RESUMO FINANCEIRO', '']];
            
            if (habilitarINCC) {
                resumoData = [
                    ['Total do Imóvel', formatarMoeda(valorTabela)],
                    ['Pagamentos "Até as Chaves"', formatarMoeda(totalAteChaves)],
                    ['Correção INCC', formatarMoeda(totalCorrecao)],
                    ['Total com Correção', formatarMoeda(totalAteChaves + totalCorrecao)],
                    ['Percentual Pago', `${((totalAteChaves / valorTabela) * 100).toFixed(2)}%`],
                    ['Saldo para Financiamento', formatarMoeda(saldoFinanciamento)],
                    ['Percentual a Financiar', `${((saldoFinanciamento / valorTabela) * 100).toFixed(2)}%`]
                ];
            } else {
                resumoData = [
                    ['Total do Imóvel', formatarMoeda(valorTabela)],
                    ['Pagamentos "Até as Chaves"', formatarMoeda(totalAteChaves)],
                    ['Percentual Pago', `${((totalAteChaves / valorTabela) * 100).toFixed(2)}%`],
                    ['Saldo para Financiamento', formatarMoeda(saldoFinanciamento)],
                    ['Percentual a Financiar', `${((saldoFinanciamento / valorTabela) * 100).toFixed(2)}%`]
                ];
            }

            // Cria a tabela de resumo financeiro
            doc.autoTable({
                startY: finalY,
                head: resumoHead,
                body: resumoData,
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 5,
                    lineColor: [180, 180, 180],
                    textColor: [50, 50, 50],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [80, 80, 80],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 100, fontStyle: 'bold' },
                    1: { cellWidth: 80, halign: 'right' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                tableWidth: 180,
                margin: { left: (pageWidth - 180) / 2 } // Centraliza a tabela
            });

            // Adiciona informações de rodapé
            const dataGeracao = new Date().toLocaleString('pt-BR');
            doc.setFontSize(7);
            doc.setTextColor(128, 128, 128);
            doc.text(`Gerado em: ${dataGeracao}`, pageWidth - margin, doc.internal.pageSize.height - 10, { align: 'right' });
            doc.text('Sistema VPL - Simulador de Pagamentos', margin, doc.internal.pageSize.height - 10);

            // Download do PDF
            doc.save(`VPL_Simulacao_${unidade}_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
        }
    }

    /**
     * Registra logs no servidor usando PHP
     */
    function registrarLog(dados) {
        // Adiciona informações da simulação aos dados
        const dadosCompletos = {
            ...dados,
            tabela: document.getElementById('tabela').value,
            solicitante: document.getElementById('solicitante').value,
            unidade: document.getElementById('unidade').value,
            comprador: document.getElementById('comprador').value
        };

        const formData = new FormData();
        formData.append('dados', JSON.stringify(dadosCompletos));
        
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
            tabela: document.getElementById('tabela').value,
            solicitante: document.getElementById('solicitante').value,
            unidade: document.getElementById('unidade').value,
            comprador: document.getElementById('comprador').value,
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
        document.getElementById('tabela').value = dados.tabela || '';
        document.getElementById('solicitante').value = dados.solicitante || '';
        document.getElementById('unidade').value = dados.unidade || '';
        document.getElementById('comprador').value = dados.comprador || '';
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