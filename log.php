<?php
/**
 * Log handler for VPL Simulation
 * 
 * Este arquivo é responsável por registrar logs no servidor
 * conforme solicitado nas instruções do projeto.
 */

// Define o diretório para armazenar os logs
$logDir = __DIR__ . '/logs';

// Cria o diretório de logs se não existir
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Define o caminho do arquivo de log
$logFile = $logDir . '/vpl_simulation_' . date('Y-m-d') . '.log';

// Obtém os dados enviados
$postData = isset($_POST['dados']) ? $_POST['dados'] : '';

if (!empty($postData)) {
    // Adiciona timestamp ao log
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'],
        'dados' => json_decode($postData, true)
    ];
    
    // Escreve no arquivo de log
    $logEntry = json_encode($logData, JSON_PRETTY_PRINT) . "\n---\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Retorna sucesso
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
} else {
    // Retorna erro se não houver dados
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nenhum dado recebido']);
}