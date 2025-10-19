local proximoID = 1000
local connection = nil

function carregarProximoID()
    local query = dbQuery(connection, "SELECT MAX(id_liberacao) as ultimo_id FROM liberacoes")
    local result = dbPoll(query, -1)
    if result and result[1] and result[1].ultimo_id then
        proximoID = tonumber(result[1].ultimo_id) + 1
    end
    outputDebugString("[LIBERACAO] Proximo ID: " .. tostring(proximoID))
end

function verificarSeLiberado(serial)
    if not serial or serial == "" then return false end
    
    local query = dbQuery(connection, "SELECT * FROM liberacoes WHERE serial = ? AND liberado = 1", serial)
    if not query then return false end
    
    local result = dbPoll(query, -1)
    return result and #result > 0
end

function getIDPendente(serial)
    local query = dbQuery(connection, "SELECT id_liberacao FROM liberacoes WHERE serial = ? AND liberado = 0", serial)
    local result = dbPoll(query, -1)
    if result and result[1] then
        return tonumber(result[1].id_liberacao)
    end
    return false
end

function salvarJogadorPendente(serial, id)
    local query = dbExec(connection, "INSERT INTO liberacoes (id_liberacao, serial, liberado, data_criacao) VALUES (?, ?, 0, NOW())", id, serial)
    return query ~= false
end

function onPlayerJoin()
    local serial = getPlayerSerial(source)
    local nome = getPlayerName(source)
    
    outputDebugString("[LIBERACAO] Player entrou: " .. nome .. " | Serial: " .. serial)
    
    if verificarSeLiberado(serial) then
        outputChatBox("#00FF00[BEM-VINDO] #FFFFFFVocê está liberado no servidor!", source, 255, 255, 255, true)
        outputDebugString("[LIBERACAO] Player " .. nome .. " está liberado, permitindo acesso.")
        return
    end
    
    local idPendente = getIDPendente(serial)
    if idPendente then
        outputDebugString("[LIBERACAO] ID pendente encontrado: " .. idPendente .. " para " .. serial)
        kickPlayer(source, "VOCÊ NÃO ESTÁ LIBERADO!\n\n SEU ID DE LIBERAÇÃO: " .. idPendente)
        return
    end
    
    local novoID = proximoID
    proximoID = proximoID + 1
    
    outputDebugString("[LIBERACAO] Gerando novo ID: " .. novoID .. " para " .. serial)
    
    if salvarJogadorPendente(serial, novoID) then
        kickPlayer(source, "VOCÊ NÃO ESTÁ LIBERADO!\n\n SEU ID DE LIBERAÇÃO: " .. novoID)
    else
        kickPlayer(source, "Erro no sistema de liberação. Tente novamente.")
    end
end
addEventHandler("onPlayerJoin", root, onPlayerJoin)

addEventHandler("onResourceStart", resourceRoot, function()
    connection = dbConnect("mysql", 
        "dbname=tavares_liberation;host=127.0.0.1;port=3306", 
        "root",  
        ""       
    )
    
    if not connection then
        outputDebugString("[LIBERACAO] ERRO: Não foi possível conectar ao MySQL!")
        return
    end
    
    outputDebugString("[LIBERACAO] Conectado ao MySQL com sucesso!")
    
    dbExec(connection, [[
        CREATE TABLE IF NOT EXISTS liberacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_liberacao INT UNIQUE NOT NULL,
            serial VARCHAR(255) NOT NULL,
            liberado TINYINT DEFAULT 0,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_liberacao DATETIME NULL,
            INDEX idx_serial (serial),
            INDEX idx_id_liberacao (id_liberacao),
            INDEX idx_liberado (liberado)
        )
    ]])
    
    carregarProximoID()
    
    for i, player in ipairs(getElementsByType("player")) do
        local serial = getPlayerSerial(player)
        if not verificarSeLiberado(serial) then
            kickPlayer(player, "Recarregamento do sistema: Você precisa estar liberado para jogar!")
        end
    end
end)
