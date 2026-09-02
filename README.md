# PointMedia — Sistema de Recrutamento & Seleção 🚀

Sistema completo para centralização e automação dos processos seletivos e banco de talentos da **Point Media**. A aplicação oferece suporte de ponta a ponta na esteira de recrutamento do RH: desde abertura de vagas, triagem, ranking com pontuação de compatibilidade (match), gestão de processos seletivos por etapas até métricas e relatórios em dashboards analíticos.

---

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- **React 19** + **TypeScript**
- **Vite** (Build tool rápida)
- **React Router Dom v7** (Navegação SPA)
- **Chart.js** & **react-chartjs-2** (Dashboards e gráficos)
- **Design System Customizado** (Tokens CSS, tema dark/glassmorphism, responsivo e sem dependências pesadas de UI)

### **Backend**
- **NestJS 12** + **TypeScript**
- **Prisma ORM** (Modelagem e migrações do banco de dados)
- **MySQL 8.0**
- **JWT & Bcrypt** (Autenticação e segurança)
- **Class-Validator & Class-Transformer** (Validação de DTOs)
- **Vitest** (Testes unitários e E2E)

### **Infraestrutura & Ferramentas**
- **Docker & Docker Compose** (Containerização do banco de dados)
- **NPM Workspaces** (Monorepo gerenciando Frontend e Backend)
- **Oxlint** & **Prettier** (Linting ultrarrápido e padronização de código)

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 20 ou superior)
- [Docker & Docker Compose](https://www.docker.com/) (para rodar o banco de dados MySQL facilmente)
- [Git](https://git-scm.com/)

---

## 🚀 Como Rodar o Projeto Passo a Passo

### 1. Clonar o repositório

```bash
git clone https://github.com/gabriel03SM/PointMedia.git
cd PointMedia
```

### 2. Instalar as dependências

Como o projeto usa *NPM Workspaces*, você pode instalar todas as dependências de uma só vez na raiz:

```bash
npm install
```

*(Opcional: se preferir instalar separadamente, basta rodar `npm install` dentro das pastas `backend/` e `frontend/`)*.

---

### 3. Configurar o Banco de Dados e Variáveis de Ambiente

1. **Suba o banco MySQL com Docker:**
   ```bash
   docker compose up -d
   ```
   > O MySQL estará rodando na porta `3306` com as credenciais padrão do `docker-compose.yml` (`root:root` e database `point_media`).

2. **Configure o `.env` do Backend:**
   Copie o arquivo de exemplo dentro de `backend/`:
   ```bash
   # No Windows PowerShell:
   cp backend/.env.example backend/.env

   # No Linux/macOS ou Git Bash:
   cp backend/.env.example backend/.env
   ```

   Verifique se o arquivo `backend/.env` está configurado corretamente:
   ```env
   DATABASE_URL="mysql://root:root@localhost:3306/point_media"
   PORT=3000
   FRONTEND_URL="http://localhost:5173"
   JWT_SECRET="sua-chave-secreta-super-segura-aqui"
   ```

3. **Executar as migrações do Prisma:**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   cd ..
   ```

---

### 4. Iniciar a Aplicação

Você pode rodar os serviços a partir da raiz do projeto:

#### **Opção A — Executar via scripts da raiz:**
- **Terminal 1 (Backend):**
  ```bash
  npm run dev:backend
  ```
  *(Backend rodará em `http://localhost:3000`)*

- **Terminal 2 (Frontend):**
  ```bash
  npm run dev:frontend
  ```
  *(Frontend rodará em `http://localhost:5173`)*

#### **Opção B — Executar diretamente nas pastas:**
- Backend:
  ```bash
  cd backend && npm run start:dev
  ```
- Frontend:
  ```bash
  cd frontend && npm run dev
  ```

Acesse **`http://localhost:5173`** no seu navegador para utilizar o sistema!

---

## 📂 Estrutura do Projeto

```text
PointMedia/
├── backend/                  # API NestJS
│   ├── prisma/               # Schema e migrações do banco de dados
│   ├── src/
│   │   ├── auth/             # Autenticação e controle de acesso (JWT)
│   │   ├── candidates/       # Módulo e esteira de candidatos
│   │   ├── jobs/             # Módulo de vagas e requisitos
│   │   ├── scoring/          # Motor de pontuação/matching de candidatos
│   │   ├── prisma/           # Serviço de conexão Prisma
│   │   └── ...
│   └── test/                 # Testes E2E e unitários
│
├── frontend/                 # Interface do Usuário (React + Vite)
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis de UI
│   │   ├── pages/            # Telas da aplicação (Dashboard, Vagas, Candidatos, etc.)
│   │   ├── services/         # Clientes de API e requisições HTTP
│   │   ├── styles/           # Sistema de design, variáveis e tokens CSS
│   │   └── ...
│
├── docker-compose.yml        # Configuração do container MySQL
├── package.json              # Configurações de Workspaces Monorepo
└── README.md                 # Este documento
```

---

## 🧪 Testes e Qualidade de Código

### Backend
```bash
# Executar testes unitários
npm run test:backend

# Executar testes com cobertura
cd backend && npm run test:cov

# Linter
cd backend && npm run lint
```

### Frontend
```bash
# Executar linter
cd frontend && npm run lint

# Build de produção do Frontend
cd frontend && npm run build
```

---

## 👥 Contribuição e Boas Práticas

1. Crie uma branch para sua funcionalidade (`git checkout -b feature/nome-da-feature`).
2. Realize o commit das suas alterações (`git commit -m 'feat: adiciona nova funcionalidade'`).
3. Envie para o repositório remoto (`git push origin feature/nome-da-feature`).
4. Abra um **Pull Request**.

---

## 📄 Licença

Projeto desenvolvido para fins internos e acadêmicos na gestão de processos seletivos da **Point Media**.
