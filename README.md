# Terras Alphas Indica

Aplicação web multi-condomínio com:

- `frontend/`: Angular + SCSS + Router + Reactive Forms + PWA
- `backend/`: NestJS + Swagger + JWT + Prisma + PostgreSQL

## Supabase e como rodar

1. Execute [configurar-supabase.bat](C:/Users/geniv/OneDrive/Documentos/ChatGPT/indicaterras/configurar-supabase.bat).
2. O script abre `backend/.env`. Cole a URI em **Supabase Dashboard > Project Settings > Database > Connect**. Use a senha do banco definida no Supabase e mantenha `sslmode=require` na URI.
3. Confirme com `S`: o script executa o Prisma, cria as tabelas no schema `public` e insere os dados iniciais.
4. Depois, execute [iniciar.bat](C:/Users/geniv/OneDrive/Documentos/ChatGPT/indicaterras/iniciar.bat). Ele abre API e frontend em duas janelas e acessa `http://localhost:4200`.

O arquivo `backend/.env` fica fora do Git para que a senha do Supabase nao seja enviada ao repositorio.

### Execucao manual

### Backend

1. Copie `backend/.env.example` para `backend/.env`
2. Instale dependências:

```bash
cd backend
npm install
```

3. Gere o client Prisma:

```bash
npm run prisma:generate
```

4. Suba a API:

```bash
npm run start:dev
```

Swagger:

- `http://localhost:3000/docs`

### Frontend

```bash
cd frontend
npm install
npm start
```

App Angular:

- `http://localhost:4200`

## Credenciais demo

- Morador: `leonardo@terrasalphas.com.br`
- Admin: `admin@terrasalphas.com.br`
- Senha: `123456`

## Observações

- O backend inclui schema Prisma e seed inicial em `backend/prisma/`. O script de configuracao aplica esse schema ao banco Supabase.
- Os endpoints atuais ainda usam dados de demonstracao em memoria para a primeira execucao visual. As tabelas passam a existir no Supabase, mas a troca integral dos endpoints para consultas Prisma e a proxima etapa de integracao.
- A identidade visual do condomínio é aplicada no frontend via CSS variables dinâmicas.
