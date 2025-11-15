# setup_dev.ps1 - script de facilitação para desenvolvimento (Windows PowerShell)
# Uso: abra PowerShell como administrador/usuário, no root do repositório e execute:
# & .\src\backend\setup_dev.ps1

param(
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "[..] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[!!] $msg" -ForegroundColor Yellow }

Write-Info "Iniciando setup de desenvolvimento para NotifIC (Windows PowerShell)"

# 1) Criar virtualenv se não existir
$venvPath = ".\.venv"
if (-not (Test-Path $venvPath)) {
    Write-Info "Criando virtualenv em $venvPath..."
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar venv" }
    Write-Ok "Virtualenv criado"
} else {
    Write-Info "Virtualenv já existe em $venvPath"
}

# 2) Ativar venv nesta sessão
Write-Info "Ativando virtualenv"
& "$venvPath\Scripts\Activate.ps1"

# 3) Criar .env se não existir
$envPath = "src/backend/.env"
if (-not (Test-Path $envPath)) {
    Write-Info "Arquivo .env não encontrado. Vou criar um .env de desenvolvimento padrão (você poderá editar depois)."
    $default = @"
# Flask settings
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=uma_chave_secreta_segura_aqui

# Database settings (PostgreSQL)
DB_USER=postgres
DB_PASSWORD=admin
DB_HOST=localhost
DB_PORT=5432
DB_NAME=NotificDB

# URL de conexão completa (opcional)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Email settings (ajuste se necessário)
MAIL_SERVER=ssmtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=NotificUFAL@gmail.com
MAIL_PASSWORD=senha_teste
"@
    $default | Out-File -FilePath $envPath -Encoding UTF8
    Write-Ok "Arquivo .env criado em $envPath (revise os valores sensíveis)."
} else {
    Write-Info ".env já existe em $envPath"
}

# 4) Instalar dependências
Write-Info "Instalando dependências (requirements.txt)... Isso pode demorar"
& "$venvPath\Scripts\pip.exe" install -r src/backend/requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar requirements" }
Write-Ok "Dependências instaladas"

# 5) Criar banco e rodar migrations (o script create_db.py é destrutivo: confirma)
Write-Info "O próximo passo vai recriar o banco (DROP/CREATE) usando src/backend/create_db.py"
if ($NonInteractive -or (Read-Host 'Deseja continuar e recriar o banco? (yes/no) [no]') -eq 'yes') {
    Write-Info "Executando create_db.py (drop/create + migrations + criação de admin)..."
    & "$venvPath\Scripts\python.exe" src/backend/create_db.py
    if ($LASTEXITCODE -ne 0) { throw "create_db.py retornou um erro" }
    Write-Ok "Banco criado e migrations aplicadas"
} else {
    Write-Warn "Pulei a recriação do banco. Você pode executar manualmente: python src/backend/create_db.py"
}

Write-Ok "Setup concluído. Para iniciar o servidor de desenvolvimento:"
Write-Host "& $venvPath\Scripts\Activate.ps1; python src/backend/app.py" -ForegroundColor Magenta

Write-Info "Observação: esse script foi criado para ambientes Windows/PowerShell. Em Linux/macOS você pode replicar esses passos em bash."