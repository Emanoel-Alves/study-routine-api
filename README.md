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

O cadastro não é público: exige um `INVITE_CODE` de pelo menos 24 caracteres. As contas usam e-mail e senha com pelo menos 12 caracteres; senhas são armazenadas com scrypt e sal aleatório. A API limita tentativas e emite tokens bearer com validade de uma hora, mantendo a sessão por até 30 dias em um cookie JWT `HttpOnly`. Em uma origem HTTPS, o cookie usa `Secure`, `SameSite=None` e `Partitioned` para o frontend em domínio diferente; localmente, usa `SameSite=Lax`. Configure `WEB_ORIGIN` com a origem exata do frontend: CORS aceita credenciais somente dessa origem. O navegador ainda pode bloquear cookies entre sites conforme suas políticas de privacidade.

`POST /api/auth/session` valida o cookie e emite um novo token bearer após recarregar a página. `POST /api/auth/logout` encerra o cookie; `GET /api/auth/me` exige um token bearer válido. Todas as rotas de conteúdo usam o identificador derivado do token em consultas e alterações; nunca confie em um identificador de usuário enviado pelo cliente.

## Conteúdo de estudo

As rotas autenticadas de conteúdo permitem:

- Consultar o conjunto do usuário em `GET /api/content`.
- Criar, editar, arquivar, reativar e remover disciplinas em `/api/subjects`.
- Criar, editar, reordenar, atualizar o estado e remover tópicos em `/api/subjects/:subjectId/topics` e `/api/topics/:topicId`.
- Criar, editar e remover materiais em `/api/subjects/:subjectId/materials` e `/api/materials/:materialId`.
- Salvar anotações gerais na disciplina e anotações específicas no tópico.

Os estados de tópico são `not_started`, `in_progress`, `studied` e `review_pending`. Materiais aceitam os tipos `video`, `book`, `article`, `questions`, `document` e `other`, com URL HTTP(S), texto ou ambos. Remover uma disciplina também remove seus tópicos e materiais; remover um tópico remove os materiais associados. Todas as consultas e exclusões verificam o proprietário autenticado.

As sessões cronometradas podem enviar `durationSeconds`, preservando a duração medida; sessões manuais usam `durationMinutes`. O resumo semanal soma segundos e exibe apenas minutos completos, sem arredondar cada sessão curta para cima. Sessões antigas, sem `durationSeconds`, continuam sendo lidas como minutos inteiros.

## Banco de questões

`GET /api/questions`, `POST /api/questions`, `PATCH /api/questions/:questionId` e `DELETE /api/questions/:questionId` mantêm questões vinculadas a tópicos da conta autenticada. Cada registro guarda enunciado, alternativas, índice do gabarito, explicação, banca, concurso, cargo, ano, número, link da fonte e situação (`active`, `annulled` ou `outdated`). O endpoint exige uma URL HTTP(S) de fonte e valida a quantidade de alternativas e o gabarito. Remover uma disciplina ou tópico remove também as questões associadas.

O armazenamento não importa conteúdo de plataformas externas. Cadastre questões cujo uso seja autorizado ou resumos próprios e preserve o link para a fonte original; não automatize extração nem redistribua conteúdo protegido.

## Publicação no Render

O arquivo `render.yaml` descreve o serviço web Node no plano gratuito, os comandos de instalação/build/start e o health check. Para publicar:

1. Crie o repositório GitHub `study-routine-api`, envie a branch `main` e conecte sua conta GitHub ao Render.
2. No Render, escolha **New → Blueprint**, selecione o repositório e confirme o Blueprint.
3. Crie o cluster/usuário no MongoDB Atlas; configure a URI de conexão (`MONGODB_URI`) e permita o tráfego de rede do Render conforme as opções oferecidas pelo Atlas.
4. No serviço Render, defina `MONGODB_URI`, `JWT_SECRET`, `INVITE_CODE` e `WEB_ORIGIN` como variáveis privadas. Gere valores distintos para o segredo e o convite; `WEB_ORIGIN` é a origem HTTPS do Pages (por exemplo, `https://<usuario>.github.io`, sem o caminho do projeto).
5. Confirme `TRUST_PROXY=true` somente para o serviço implantado atrás do proxy gerenciado pelo Render. Em ambiente local, use `false`.
6. Copie a URL pública `https://...onrender.com` para a variável Actions `VITE_API_URL` do repositório web.

O plano gratuito do Render pode suspender serviços inativos e ter limites que mudam; verifique os termos atuais antes de depender dele. MongoDB Atlas e Render precisam estar acessíveis pela internet; restrinja credenciais e tráfego conforme a configuração da conta. O primeiro boot falha explicitamente até que todas as variáveis e a conectividade do banco estejam configuradas.

## Operação de produção

### Smoke test após o deploy

1. Confirme que `GET https://study-routine-api.onrender.com/api/health` retorna HTTP 200 e somente `{"status":"ok"}`. O Render também usa esse caminho como health check.
2. No site publicado, confirme que login, conteúdo e planejamento carregam. Verifique a origem do GitHub Pages em `WEB_ORIGIN` sem acrescentar o caminho `/study-routine-web`.
3. Com uma conta de teste autorizada, crie uma disciplina e um tópico, salve a disponibilidade, consulte o plano e recarregue a página para confirmar a persistência. Não use dados pessoais reais como dados de teste.
4. No navegador, verifique se o cache offline contém apenas os arquivos estáticos do frontend; respostas da API e credenciais não devem ser armazenadas.
5. Remova os dados de teste ao terminar.

A API requer conta e token para conteúdo e planejamento. Não coloque `INVITE_CODE`, `JWT_SECRET`, senhas ou tokens em comandos compartilhados, issues, logs ou variáveis públicas do frontend. O health check não testa leitura ou gravação no banco; a inicialização só aceita tráfego depois de conectar e verificar o MongoDB.

### Backup e restauração

O repositório não configura backups do MongoDB. Confirme no painel do Atlas se o cluster e o plano contratado oferecem backups automáticos/PITR, qual a retenção e como restaurar. Se não houver cobertura adequada, estabeleça uma exportação periódica com MongoDB Database Tools e armazene os arquivos criptografados fora do repositório e do serviço Render, com acesso restrito.

Faça um teste de restauração em um banco separado antes de depender de um backup. Valide contagens e acesso à aplicação antes de qualquer troca de configuração. Não restaure sobre o banco de produção sem uma janela planejada, backup atual e confirmação da operação; não inclua URI, credenciais ou arquivos de backup no GitHub.

### Rollback e limites

- **API:** em **Render → serviço → Events/Deploys**, reverta para o último deploy saudável. Para reverter código de forma auditável, use `git revert <commit>` e publique o novo commit em `main`; não reescreva o histórico compartilhado.
- **Frontend:** reverta o commit defeituoso com `git revert <commit>` em `main`. O CI e o workflow do GitHub Pages executarão novamente antes de publicar a versão corrigida.
- **Banco:** rollback do código não desfaz nem deve apagar dados. Se uma mudança de dados precisar ser revertida, restaure primeiro uma cópia em ambiente separado e planeje a recuperação explicitamente.
- **Hospedagem:** o plano gratuito do Render pode suspender serviços inativos e introduzir demora no primeiro acesso. Limites, preços, retenção de backups e disponibilidade do MongoDB Atlas dependem dos planos vigentes; confirme-os nos painéis dos provedores. Este projeto não promete SLA nem mantém backup próprio.

O workflow **CI** executa `npm ci`, lint, formatação, testes e build em push, pull request ou execução manual pela aba **Actions**. O health check do Render e o CI não substituem o smoke test autenticado.

## Verificações

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

## Configuração

`PORT`, `HOST`, `WEB_ORIGIN`, `TRUST_PROXY`, `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET` e `INVITE_CODE` são carregados de variáveis de ambiente. O arquivo `.env` local é ignorado pelo Git; nunca inclua nele valores reais em arquivos versionados. Use segredos e banco separados entre desenvolvimento e produção.
