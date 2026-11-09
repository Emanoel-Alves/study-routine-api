# Study Routine API

API REST do Study Routine, feita com Node.js, TypeScript, Fastify e MongoDB.

## Requisitos

- Node.js 24 ou superior
- npm
- MongoDB local ou cluster no Atlas

## Desenvolvimento local

```powershell
npm install
Copy-Item .env.example .env
```

Edite `.env` com a URI do banco, um segredo JWT e um código de convite. Gere valores aleatórios diferentes para `JWT_SECRET` e `INVITE_CODE`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Depois execute:

```powershell
npm run dev
```

O serviço inicia em `http://localhost:3000`. O endpoint `GET /api/health` confirma que a API está disponível. O CORS aceita somente a origem definida em `WEB_ORIGIN`. A API verifica a conexão com MongoDB e cria um índice único para e-mails ao iniciar.

`TRUST_PROXY=false` é o padrão local. Em produção, configure os endereços/CIDRs dos proxies confiáveis; use `true` somente quando o provedor de hospedagem controlar e sobrescrever os cabeçalhos encaminhados. Isso mantém o limitador de tentativas associado ao IP real sem confiar em cabeçalhos enviados diretamente por clientes.

## Autenticação

O cadastro não é público: exige um `INVITE_CODE` de pelo menos 24 caracteres. As contas usam e-mail e senha com pelo menos 12 caracteres; senhas são armazenadas com scrypt e sal aleatório. A API limita tentativas e emite tokens bearer com validade de uma hora. `JWT_SECRET` deve ter pelo menos 32 bytes aleatórios.

O endpoint `GET /api/auth/me` exige um token válido. Todas as rotas de conteúdo usam o identificador derivado do token em consultas e alterações; nunca confie em um identificador de usuário enviado pelo cliente.

## Conteúdo de estudo

As rotas autenticadas de conteúdo permitem:

- Consultar o conjunto do usuário em `GET /api/content`.
- Criar, editar, arquivar, reativar e remover disciplinas em `/api/subjects`.
- Criar, editar, reordenar, atualizar o estado e remover tópicos em `/api/subjects/:subjectId/topics` e `/api/topics/:topicId`.
- Criar, editar e remover materiais em `/api/subjects/:subjectId/materials` e `/api/materials/:materialId`.
- Salvar anotações gerais na disciplina e anotações específicas no tópico.

Os estados de tópico são `not_started`, `in_progress`, `studied` e `review_pending`. Materiais aceitam os tipos `video`, `book`, `article`, `questions`, `document` e `other`, com URL HTTP(S), texto ou ambos. Remover uma disciplina também remove seus tópicos e materiais; remover um tópico remove os materiais associados. Todas as consultas e exclusões verificam o proprietário autenticado.

## Publicação no Render

O arquivo `render.yaml` descreve o serviço web Node no plano gratuito, os comandos de instalação/build/start e o health check. Para publicar:

1. Crie o repositório GitHub `study-routine-api`, envie a branch `main` e conecte sua conta GitHub ao Render.
2. No Render, escolha **New → Blueprint**, selecione o repositório e confirme o Blueprint.
3. Crie o cluster/usuário no MongoDB Atlas; configure a URI de conexão (`MONGODB_URI`) e permita o tráfego de rede do Render conforme as opções oferecidas pelo Atlas.
4. No serviço Render, defina `MONGODB_URI`, `JWT_SECRET`, `INVITE_CODE` e `WEB_ORIGIN` como variáveis privadas. Gere valores distintos para o segredo e o convite; `WEB_ORIGIN` é a origem HTTPS do Pages (por exemplo, `https://<usuario>.github.io`, sem o caminho do projeto).
5. Confirme `TRUST_PROXY=true` somente para o serviço implantado atrás do proxy gerenciado pelo Render. Em ambiente local, use `false`.
6. Copie a URL pública `https://...onrender.com` para a variável Actions `VITE_API_URL` do repositório web.

O plano gratuito do Render pode suspender serviços inativos e ter limites que mudam; verifique os termos atuais antes de depender dele. MongoDB Atlas e Render precisam estar acessíveis pela internet; restrinja credenciais e tráfego conforme a configuração da conta. O primeiro boot falha explicitamente até que todas as variáveis e a conectividade do banco estejam configuradas.

## Verificações

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

## Configuração

`PORT`, `HOST`, `WEB_ORIGIN`, `TRUST_PROXY`, `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET` e `INVITE_CODE` são carregados de variáveis de ambiente. O arquivo `.env` local é ignorado pelo Git; nunca inclua nele valores reais em arquivos versionados. Use segredos e banco separados entre desenvolvimento e produção.
