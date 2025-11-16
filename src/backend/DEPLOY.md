## Migração de dados para Render Managed Postgres

Este documento descreve os passos para exportar seu banco local Postgres e restaurar os dados em um banco Managed Postgres no Render.
Inclui o uso do script `migrate_to_render.sh` que está neste diretório.

Pré-requisitos
- Git Bash (Windows) ou terminal POSIX
- `psql`, `pg_dump`, `pg_restore` instalados (o script detecta instalações em `C:\Program Files\PostgreSQL\*`).
- Alternativa: Docker (o script usa `postgres:15` se não encontrar os binários locais).

Arquivos relevantes
- `migrate_to_render.sh` : script interativo que cria um dump local (`notific.dump`) e restaura no banco do Render.

1) Tornar o script executável (opcional)
```bash
chmod +x src/backend/migrate_to_render.sh
```

2) Execução interativa (recomendada)
- Rode a partir da raiz do repositório:
```bash
bash src/backend/migrate_to_render.sh
```
- O script irá:
  - detectar `pg_dump/pg_restore/psql` locais ou usar Docker como fallback;
  - pedir a `RENDER_DATABASE_URL` (se não estiver exportada no shell);
  - pedir as credenciais do seu banco local (host, port, user, dbname e senha — a senha é digitada oculta);
  - pedir confirmação `YES` antes de restaurar no banco do Render.

3) Execução não interativa (exemplo)
- Use com cuidado — o bloco abaixo insere a senha na entrada padrão:
```bash
export RENDER_DATABASE_URL='postgres://user:senha@host:5432/dbname?sslmode=require'

cat <<EOF | bash src/backend/migrate_to_render.sh
localhost
5432
postgres
NotificDB
SUA_SENHA_LOCAL
YES
y
EOF
```

4) Verificações pós-restore
- Listar tabelas no banco do Render:
```bash
"/c/Program Files/PostgreSQL/18/bin/psql.exe" "$RENDER_DATABASE_URL" -c '\dt'
```
- Conferir contagem de notícias (exemplo):
```bash
"/c/Program Files/PostgreSQL/18/bin/psql.exe" "$RENDER_DATABASE_URL" -c "SELECT COUNT(*) FROM news;"
```

5) Configurar variáveis no Render (Web Service)
- No painel do Render → seu Web Service → Environment → Environment Secrets, adicione:
  - `DATABASE_URL` = a connection string do Render (Internal ou External conforme sua arquitetura);
  - `SECRET_KEY` = sua chave secreta Flask;
  - `MAIL_USERNAME` e `MAIL_PASSWORD` = credenciais de e-mail (se necessário).
- Salvar as variáveis fará o serviço redeployar automaticamente.

6) Segurança e limpeza
- Se a connection string foi exposta publicamente, rotacione a senha do usuário do banco no painel do Render imediatamente.
- Não comite `.env` com segredos no repositório. Use `Environment Secrets` do Render.
- Remova o arquivo `notific.dump` quando não precisar mais.

7) Problemas comuns
- Erro SSL: confirme se a connection string contém `?sslmode=require`.
- Erros de owner/roles: o script usa `--no-owner --no-acl` no `pg_restore` para evitar problemas; se precisar recriar roles, exporte/importe roles separadamente com `pg_dumpall --roles-only`.
- Extensões faltando: crie com `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` no banco do Render via `psql`.

Se preferir, posso também adicionar um pequeno `make` target ou workflow para automatizar este processo. Abra um issue ou me peça para criar o que preferir.
