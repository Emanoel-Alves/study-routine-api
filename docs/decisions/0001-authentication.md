# ADR 0001: Autenticação inicial

- Status: aceita para o MVP privado
- Data: 2026-11-09

## Contexto

O produto começa com uso individual. Telefone e data de nascimento não são segredos de autenticação, e OTP por SMS pode ter custo. Antes de armazenar dados pessoais ou de estudo, a API precisa identificar cada conta e restringir seu acesso.

## Decisão

- Usar e-mail e senha, sem coletar data de nascimento.
- Exigir um código de convite configurado fora do repositório para criar contas; não abrir cadastro público no MVP inicial.
- Exigir senhas com pelo menos 12 caracteres e armazená-las com scrypt e sal aleatório.
- Emitir tokens bearer assinados com segredo aleatório, validade de uma hora e limitação de tentativas de autenticação.
- Manter o token somente na memória do frontend; não persistir credenciais no armazenamento local do navegador.
- Persistir contas no MongoDB e obter a identidade exclusivamente da assinatura verificada do token.

## Consequências

- Não há recuperação de senha nesta etapa; perda da senha exige definir um fluxo antes de abrir o cadastro.
- Recarregar a página encerra a sessão no cliente, que deve autenticar novamente.
- O segredo JWT, o convite e a URI do banco devem ser configurados separadamente nos ambientes locais e hospedados.
- Rotas futuras de dados devem aplicar o identificador autenticado em todas as consultas e mutações.
- Antes de permitir contas públicas ou produção, revisar recuperação de conta, revogação de sessões, políticas de privacidade, exclusão/exportação e proteção contra abuso.
