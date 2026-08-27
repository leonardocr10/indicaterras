# Terras Alphas Indica

Aplicação web multi-condomínio com:

- `frontend/`: Angular + SCSS + Router + Reactive Forms + PWA
- `backend/`: NestJS + Swagger + JWT + Prisma + Supabase

## Supabase e como rodar

1. Execute `configurar-supabase.bat`.
2. O script abre `backend/.env`. Cole a URI em **Supabase Dashboard > Project Settings > Database > Connect**. Use a senha do banco definida no Supabase e mantenha `sslmode=require` na URI.
3. Confirme com `S`: o script executa o Prisma, cria as tabelas no schema `public` e insere os dados iniciais.
4. Depois, execute `iniciar.bat`. Ele abre API e frontend em duas janelas e acessa `http://localhost:4200`.

O arquivo `backend/.env` fica fora do Git para que as chaves do Supabase não sejam enviadas ao repositório.

### Execução manual

#### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run start:dev
```

Swagger: `http://localhost:3000/docs`

#### Frontend

```bash
cd frontend
npm install
npm start
```

App Angular: `http://localhost:4200`

## Publicação

O frontend e o backend são publicados separadamente: o Angular é estático e vive bem em CDN,
enquanto a API precisa de um processo contínuo (ela mantém sessões e uploads).

### Frontend na Vercel

O `vercel.json` na raiz já configura tudo (build dentro de `frontend/`, pasta de saída e
o redirecionamento das rotas do Angular para o `index.html`). Basta importar o repositório.

Em **Settings > Environment Variables**, defina:

| Variável  | Valor                                            |
| --------- | ------------------------------------------------ |
| `API_URL` | endereço público do backend, ex.: `https://indicaterras-api.onrender.com` |

Sem essa variável o app chama a API na mesma origem do site e nada carrega. O endereço é
gravado no bundle durante o build por `frontend/scripts/set-api-url.mjs`.

### Backend no Render

O `render.yaml` na raiz é um blueprint pronto: **New > Blueprint** e aponte para o repositório.
Ele cria o serviço, gera os segredos de JWT e monta um disco para as fotos enviadas.

Preencha no painel:

| Variável                     | Valor                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `SUPABASE_URL`               | URL do projeto Supabase                                   |
| `SUPABASE_SECRET_KEY`        | chave secreta (somente no backend, nunca no frontend)     |
| `SUPABASE_PUBLISHABLE_KEY`   | chave pública, usada no envio do código de confirmação    |
| `CORS_ORIGIN`                | endereço do site na Vercel, ex.: `https://indicaterras.vercel.app` |

`JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são gerados pelo próprio Render. Em produção a API
recusa subir sem eles, para não usar os segredos de desenvolvimento.

Há também um `backend/Dockerfile` caso prefira Railway, Fly.io ou qualquer host com Docker.

As fotos enviadas (perfis, capas, comentários e trabalhos) vão para o **Supabase Storage**,
no bucket `uploads`, criado automaticamente no primeiro envio. Sem o Supabase configurado,
elas caem no disco local, em `backend/uploads/` — bom para desenvolvimento, mas some a cada
deploy na hospedagem.

> Não publique o backend como função serverless (Vercel Functions, Lambda). Ele mantém sessões,
> avaliações e favoritos em memória e grava as fotos em disco — comportamentos que exigem um
> processo contínuo.

## Confirmação de e-mail (opcional)

Por padrão o cadastro **não** exige confirmação: quem cria a conta entra direto no aplicativo
(o morador ainda passa pela aprovação da administração, se esse parâmetro estiver ligado).

Para exigir o código por e-mail, ligue **Exigir confirmação de e-mail no cadastro** em
Admin > Configurações. Aí o Supabase Auth envia um código de 6 dígitos e a pessoa só acessa
depois de confirmar. O serviço de e-mail embutido do Supabase é limitado a poucos envios por
hora e devolve `over_email_send_rate_limit` quando o limite estoura — nesse caso a conta é
criada mesmo assim e a pessoa pode pedir o código de novo em "Reenviar código".

Para uso real, configure um SMTP próprio em **Supabase Dashboard > Authentication > Emails >
SMTP Settings** (Resend, Brevo, SendGrid, Amazon SES). Depois disso, o limite passa a ser o do
provedor e pode ser ajustado em **Authentication > Rate Limits**.

## Credenciais demo

- Morador: `leonardo@terrasalphas.com.br`
- Admin: `admin@terrasalphas.com.br`
- Senha: `123456`

Troque essas senhas antes de qualquer uso real: elas estão no código, em `backend/src/data/demo-data.ts`.

## Observações

- O backend inclui schema Prisma e seed inicial em `backend/prisma/`. O script de configuração aplica esse schema ao banco Supabase.
- Condomínios, categorias, serviços e profissionais são persistidos no Supabase. Usuários,
  avaliações, indicações e favoritos ainda vivem em memória e voltam ao estado inicial quando a
  API reinicia — a migração deles depende de mover a autenticação para o Supabase Auth.
- A identidade visual do condomínio é aplicada no frontend via CSS variables dinâmicas.
