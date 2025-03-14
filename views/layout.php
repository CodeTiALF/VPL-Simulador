<!DOCTYPE html>
<!-- 
    Simulador VPL para Imóveis na Planta
    
    Este sistema permite simular um fluxo de pagamento para imóveis na planta,
    calculando os valores das parcelas, totais e saldo para financiamento.
    
    Autor: Andre Filus
    Email: dev@andrefilus.com.br
    GitHub: https://github.com/CodeTiALF
    
    Copyright (c) 2023 Andre Filus
    Licença MIT
-->
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VPL Simulação - Imóveis na Planta</title>
    <link rel="stylesheet" href="/public/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Atualiza as bibliotecas para versões específicas e carrega na ordem correta -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
    <script>
        // Garante que o jsPDF está disponível globalmente
        window.jsPDF = window.jspdf.jsPDF;
    </script>
</head>
<body>
    <div class="container">
        <header>
            <h1>Simulador VPL - Imóveis na Planta</h1>
            <div class="theme-toggle">
                <i class="fas fa-sun"></i>
                <label class="switch">
                    <input type="checkbox" id="theme-switch">
                    <span class="slider round"></span>
                </label>
                <i class="fas fa-moon"></i>
            </div>
        </header>

        <main>
            <form id="vpl-form">
                <div class="form-section">
                    <h2>Informações da Simulação</h2>
                    <div class="grid-2">
                        <div class="input-group">
                            <label for="tabela">Tabela:</label>
                            <select id="tabela" name="tabela" required>
                                <option value="">Selecione a tabela</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="solicitante">Solicitante:</label>
                            <select id="solicitante" name="solicitante" required>
                                <option value="">Selecione o solicitante</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid-2">
                        <div class="input-group unidade-group">
                            <label for="unidade">Unidade:</label>
                            <input type="text" id="unidade" name="unidade" required maxlength="10">
                        </div>
                        <div class="input-group">
                            <label for="comprador">Comprador:</label>
                            <input type="text" id="comprador" name="comprador" required>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h2>Informações do Imóvel</h2>
                    <div class="input-group">
                        <label for="valor-tabela">Valor de Tabela do Imóvel (R$):</label>
                        <input type="number" id="valor-tabela" name="valor-tabela" min="0" step="0.01" required>
                    </div>
                    <div class="grid-2">
                        <div class="input-group">
                            <div class="checkbox-group">
                                <input type="checkbox" id="habilitar-incc" name="habilitar-incc">
                                <label for="habilitar-incc">Habilitar Correção INCC</label>
                            </div>
                        </div>
                        <div class="input-group">
                            <label for="taxa-incc">Taxa INCC Mensal (%):</label>
                            <input type="number" id="taxa-incc" name="taxa-incc" min="0" max="10" step="0.01" value="0.50" disabled>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h2>Sinal (Parcela 0)</h2>
                    <div class="input-group">
                        <label for="valor-sinal">Valor do Sinal (R$):</label>
                        <input type="number" id="valor-sinal" name="valor-sinal" min="0" step="0.01" required>
                    </div>
                    <div class="input-group">
                        <label for="data-sinal">Data do Sinal:</label>
                        <input type="date" id="data-sinal" name="data-sinal" required>
                    </div>
                </div>

                <div class="form-section">
                    <h2>Mensais</h2>
                    <div class="input-group">
                        <label for="qtd-mensais">Quantidade de Parcelas:</label>
                        <input type="number" id="qtd-mensais" name="qtd-mensais" min="1" required>
                    </div>
                    <div class="input-group">
                        <label for="valor-mensais">Valor das Parcelas (R$):</label>
                        <input type="number" id="valor-mensais" name="valor-mensais" min="0" step="0.01" required>
                    </div>
                </div>

                <div class="form-section">
                    <h2>Parcelas Intermediárias</h2>
                    <div id="parcelas-intermediarias">
                        <!-- Parcelas intermediárias serão adicionadas dinamicamente aqui -->
                    </div>
                    <button type="button" id="add-parcela" class="btn-secondary">
                        <i class="fas fa-plus"></i> Adicionar Parcela Intermediária
                    </button>
                </div>

                <div class="form-section">
                    <h2>Resumo do Financiamento</h2>
                    <div class="summary-item">
                        <span>Total "Até as Chaves":</span>
                        <span id="total-ate-chaves">R$ 0,00</span>
                    </div>
                    <div class="summary-item">
                        <span>Saldo para Financiamento:</span>
                        <span id="saldo-financiamento">R$ 0,00</span>
                    </div>
                </div>

                <div class="actions">
                    <button type="button" id="calcular" class="btn-primary">Calcular</button>
                    <button type="button" id="exportar" class="btn-primary" disabled>Exportar Relatório</button>
                </div>
            </form>

            <div id="resultado" class="resultado hidden">
                <h2>Resultado da Simulação</h2>
                <div id="fluxo-pagamento"></div>
            </div>
        </main>

        <footer>
            <p>© 2023 VPL Simulação - Desenvolvido por <a href="https://github.com/CodeTiALF" target="_blank">CodeTiALF</a></p>
        </footer>
    </div>

    <script src="/public/js/script.js"></script>
</body>
</html>