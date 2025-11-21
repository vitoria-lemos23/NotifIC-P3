**NotifIC**

Projeto desenvolvido para a disciplina Programação 3 (orientador: Prof. Ranilson Paiva). O objetivo do NotifIC é centralizar e divulgar eventos, notícias e oportunidades para os alunos do IC na Universidade Federal de Alagoas.

**Integrantes**

| Discente | Função no Projeto |
| --- | --- |
| [Alan Diogo da Rocha](https://github.com/alan-diogo) | Front-End |
| [Cleversson Lucas](https://github.com/byClev) | Full Stack |
| [Rayssa Rodrigues](https://github.com/rayssar9i) | Graphic Design / Front End |
| [Rian Antônio da Silva](https://github.com/ryanthecomic) | Graphic Design / Fullstack |
| [Vitória Lemos](https://github.com/vitoria-lemos23/NotifIC-P3) | Fullstack |



**Sumário**

- **Descrição:** O que é o projeto.
- **Pré-requisitos:** O que precisa estar instalado.
- **Instalação & Setup:** Como preparar o ambiente (venv, dependências, .env).
- **Banco de Dados:** Como criar/sincronizar o banco PostgreSQL.
- **Execução:** Como rodar a aplicação localmente.

***Branch Correta: "fullstack"***

**Pré-requisitos**

- Python 3.10+ (ou versão compatível do projeto).
- PostgreSQL instalado e em execução.
- Git (opcional, para clonar o repositório).

**Instalação e Setup (local)**

Abra um terminal (recomenda-se Git Bash ou PowerShell no Windows) e execute:

```bash
# clone apenas a branch `fullstack` e entre na pasta do backend
git clone --branch fullstack --single-branch https://github.com/vitoria-lemos23/NotifIC-P3.git
cd NotifIC-P3/src/backend
```

Alternativamente, no Windows você pode usar o script de setup que automatiza a criação do venv,
instalação de dependências, criação do arquivo `.env` de exemplo e (opcionalmente) recria o banco.

Execute este comando a partir do root do repositório (PowerShell):

```powershell
& .\src\backend\setup_dev.ps1
```

O script `setup_dev.ps1` faz o seguinte por você:
- Cria um virtualenv (local ao repositório em `\.venv`).
- Ativa o virtualenv na sessão atual.
- Gera um `.env` de desenvolvimento em `src/backend/.env` (contendo placeholders — revise antes de usar).
- Instala as dependências de `src/backend/requirements.txt`.
- (Opcional) Executa `create_db.py` para recriar o banco e aplicar migrations.

Se preferir executar os passos manualmente (Linux/macOS ou preferir controle total), siga as instruções abaixo.

Crie e ative um ambiente virtual:

```bash
# Criar o venv
python -m venv venv

# Ativar (Git Bash / bash)
source venv/Scripts/activate

# Ativar (PowerShell)
.\venv\Scripts\Activate.ps1

# Ativar (CMD)
venv\Scripts\activate.bat
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Crie o arquivo de variáveis de ambiente (se necessário):

```bash
# No Git Bash/WSL
touch .env

# Ou no PowerShell
New-Item .env -ItemType File -Force
```

Edite o `.env` para incluir as configurações de banco de dados e e-mail conforme o projeto (host, usuário, senha, PORT, etc.).

**Banco de Dados (PostgreSQL)**

1. Garanta que o serviço do PostgreSQL está em execução (Windows: `services.msc`).

2. Execute o script que cria o banco e aplica as tabelas:

```bash
python create_db.py
```

Observação: se o script falhar após criar o banco (por exemplo, erros de migração), você pode sincronizar as migrações manualmente:

```bash
flask db stamp head
```

**Executando a aplicação**

```bash
# Ative o venv, depois
python app.py
```

A aplicação deverá ficar disponível no endereço configurado (por padrão `http://127.0.0.1:5000` se não alterado).

**Scripts úteis**

- `create_db.py` : cria o banco e aplica as tabelas iniciais.

**Contribuindo**

- Abra uma issue descrevendo o problema ou feature.
- Crie uma branch baseada em `fullstack` para seus commits.

**Observações**

- Leia `src/backend/README.md` para documentação interna específica do backend.

---
