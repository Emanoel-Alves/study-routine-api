import type { StudyQuestionInput } from "./questions.ts";

export const UFC_GOVERNANCE_QUESTION_SOURCE =
  "Questões autorais — temas da prova UFC/FCPC 2025";

interface UfcGovernanceQuestionSeed extends Omit<
  StudyQuestionInput,
  "topicId"
> {
  topicName: string;
}

const proofPage =
  "https://www.qconcursos.com/questoes-de-concursos/provas/fcpc-2025-ufc-analista-de-tecnologia-da-informacao-area-governanca-de-ti/questoes?page=2";
const proofPdf =
  "https://arquivos.qconcursos.com/prova/arquivo_prova/126198/fcpc-2025-ufc-analista-de-tecnologia-da-informacao-area-governanca-de-ti-prova.pdf";
const exam = "UFC — Analista de Tecnologia da Informação — Governança de TI";
const board = "FCPC";
const role = "Analista de Tecnologia da Informação — Governança de TI";

function source(number: string, url = proofPage) {
  return {
    name: UFC_GOVERNANCE_QUESTION_SOURCE,
    url,
    exam,
    board,
    role,
    year: 2025,
    number: `${number} — adaptação autoral, não transcrição`,
  };
}

export const UFC_GOVERNANCE_QUESTIONS: UfcGovernanceQuestionSeed[] = [
  {
    topicName: "Governança de TI: conceitos, alinhamento e avaliação",
    statement:
      "Uma universidade revisa seus objetivos institucionais e precisa decidir como priorizar investimentos em tecnologia. Qual atividade caracteriza principalmente a governança de TI, em vez da gestão operacional?",
    options: [
      "Avaliar necessidades, definir direção e prioridades de TI e monitorar os resultados.",
      "Distribuir chamados diários entre os técnicos do suporte.",
      "Executar a atualização de cada estação de trabalho.",
      "Acompanhar individualmente a fila de incidentes e realizar os reparos.",
      "Escrever o código de uma funcionalidade já aprovada.",
    ],
    correctOption: 0,
    explanation:
      "Governança avalia necessidades, direciona prioridades e acompanha resultados. Planejar e executar atividades para cumprir essa direção são responsabilidades de gestão.",
    source: source("Q3162160"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Ao estruturar a governança de TIC em uma organização pública, qual conjunto reúne princípios associados à Portaria SGD/ME nº 778/2019?",
    options: [
      "Foco nas partes interessadas, TIC como ativo estratégico, gestão por resultados, transparência, prestação de contas e conformidade.",
      "Sigilo de todas as decisões, prioridade exclusiva à redução de custos e ausência de avaliação de resultados.",
      "Centralização das decisões técnicas, eliminação de controles e autonomia sem prestação de contas.",
      "Foco exclusivo em aquisição de equipamentos, expansão do quadro e substituição de serviços digitais.",
      "Execução de projetos, atendimento de chamados, desenvolvimento de sistemas e operação de redes.",
    ],
    correctOption: 0,
    explanation:
      "A alternativa correta reúne os princípios indicados no caderno: foco nas partes interessadas, TIC estratégica, resultados, transparência, responsabilização e conformidade.",
    source: source("Q3162161"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "PDTIC e planejamento institucional de TIC",
    statement:
      "No Balanced Scorecard, uma universidade define o objetivo de reduzir o tempo de tramitação dos processos acadêmicos por meio da automação. A qual perspectiva esse objetivo pertence principalmente?",
    options: [
      "Financeira.",
      "Clientes e usuários.",
      "Processos internos.",
      "Aprendizado e crescimento.",
      "Conformidade externa.",
    ],
    correctOption: 2,
    explanation:
      "A perspectiva de processos internos acompanha a eficiência e a qualidade dos processos que a organização precisa executar. A automação para reduzir o tempo de tramitação se enquadra nela.",
    source: source("Q3162162"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Em uma análise SWOT, uma nova política governamental que amplia a demanda por serviços digitais é identificada. Como esse fator deve ser classificado?",
    options: [
      "Força, pois é uma capacidade interna já dominada pela organização.",
      "Oportunidade, pois é uma condição externa potencialmente favorável.",
      "Fraqueza, pois representa uma limitação interna da equipe.",
      "Ameaça, pois todo fator externo é necessariamente desfavorável.",
      "Indicador, pois expressa diretamente um resultado mensurável.",
    ],
    correctOption: 1,
    explanation:
      "Na SWOT, oportunidades são fatores externos favoráveis. Forças e fraquezas são internas; ameaças são externas desfavoráveis.",
    source: source(
      "Q3162163",
      "https://www.qconcursos.com/questoes-de-concursos/questoes/fb8482d6-d9",
    ),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Uma equipe de planejamento está preenchendo a matriz SWOT de uma organização. Qual par contém somente fatores internos?",
    options: [
      "Oportunidades e ameaças.",
      "Oportunidades e forças.",
      "Ameaças e fraquezas.",
      "Forças e fraquezas.",
      "Ameaças e oportunidades.",
    ],
    correctOption: 3,
    explanation:
      "Forças e fraquezas descrevem características internas da organização. Oportunidades e ameaças correspondem ao ambiente externo.",
    source: source(
      "Q3162164",
      "https://www.qconcursos.com/questoes-de-concursos/questoes/fb872c7b-d9",
    ),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Uma equipe precisa escolher referências para governança de TI, gerenciamento de serviços e gerenciamento de projetos, respectivamente. Qual associação está correta?",
    options: [
      "ITIL — governança de TI; COBIT — gerenciamento de projetos; PMBOK — serviços de TI.",
      "COBIT — governança e gestão de informação e tecnologia; ITIL — gerenciamento de serviços de TI; PMBOK — gerenciamento de projetos.",
      "PMBOK — governança de TI; ITIL — gerenciamento de projetos; COBIT — gerenciamento de serviços.",
      "COBIT — gerenciamento de projetos; PMBOK — governança de TI; ITIL — arquitetura corporativa.",
      "ITIL — auditoria financeira; COBIT — desenvolvimento de software; PMBOK — gestão de incidentes.",
    ],
    correctOption: 1,
    explanation:
      "COBIT trata de governança e gestão de informação e tecnologia; ITIL orienta o gerenciamento de serviços; PMBOK reúne práticas e conceitos de gerenciamento de projetos.",
    source: source("Q3162165"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Qual afirmação expressa corretamente a distinção entre governança e gestão no COBIT 2019?",
    options: [
      "Governança avalia necessidades, direciona e monitora; gestão planeja, constrói, executa e monitora atividades alinhadas à direção.",
      "Governança executa todas as operações; gestão limita-se a aprovar o orçamento anual.",
      "Governança e gestão são sinônimos e podem ser tratadas como uma única função.",
      "Gestão define a direção estratégica sem considerar as necessidades das partes interessadas.",
      "Governança atua apenas na auditoria financeira e não se relaciona à tecnologia.",
    ],
    correctOption: 0,
    explanation:
      "O COBIT separa governança, que avalia, direciona e monitora, da gestão, responsável por planejar, construir, executar e monitorar as atividades necessárias.",
    source: source("Q3162166"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Qual alternativa apresenta um componente do sistema de governança do COBIT 2019?",
    options: [
      "Somente o organograma formal, sem considerar pessoas ou processos.",
      "Apenas os indicadores financeiros anuais.",
      "Estruturas organizacionais, processos, informação, cultura e competências, entre outros componentes.",
      "Exclusivamente contratos de fornecedores e licenças de software.",
      "Somente políticas e procedimentos, sem infraestrutura ou aplicações.",
    ],
    correctOption: 2,
    explanation:
      "O COBIT 2019 contempla componentes que atuam em conjunto, incluindo processos, estruturas organizacionais, informação, cultura, pessoas e competências, além de serviços, infraestrutura e aplicações.",
    source: source("Q3162167"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "No COBIT 2019, a sigla APO identifica qual domínio e orientação geral?",
    options: [
      "Assess, Protect and Operate — avaliar, proteger e operar.",
      "Align, Plan and Organize — alinhar, planejar e organizar.",
      "Acquire, Program and Outsource — adquirir, programar e terceirizar.",
      "Audit, Perform and Optimize — auditar, executar e otimizar.",
      "Analyze, Process and Observe — analisar, processar e observar.",
    ],
    correctOption: 1,
    explanation:
      "APO significa Align, Plan and Organize. O domínio trata, entre outros aspectos, do alinhamento entre estratégia de TI e objetivos organizacionais.",
    source: source("Q3162168"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Uma auditoria avalia indicadores de desempenho de TI, controles internos e conformidade com requisitos externos. Qual domínio do COBIT 2019 está mais diretamente relacionado a esse conjunto?",
    options: [
      "MEA — Monitor, Evaluate and Assess.",
      "APO — Align, Plan and Organize.",
      "BAI — Build, Acquire and Implement.",
      "DSS — Deliver, Service and Support.",
      "EDM — Evaluate, Direct and Monitor.",
    ],
    correctOption: 0,
    explanation:
      "MEA reúne objetivos de monitoramento, avaliação e análise, incluindo desempenho, controles internos e conformidade.",
    source: source("Q3162169"),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Gestão de serviços e ITIL 4",
    statement:
      "Uma equipe está organizando os elementos que permitem transformar oportunidades e demanda em valor por meio de serviços. Qual conjunto corresponde aos componentes do Sistema de Valor de Serviço do ITIL 4?",
    options: [
      "Princípios orientadores, governança, cadeia de valor de serviço, práticas e melhoria contínua.",
      "Catálogo, incidentes, problemas, mudanças e acordos de nível de serviço.",
      "Estratégia, desenho, transição, operação e melhoria de serviço.",
      "Pessoas, processos, parceiros, tecnologia e indicadores financeiros.",
      "Planejamento, aquisição, desenvolvimento, entrega e auditoria.",
    ],
    correctOption: 0,
    explanation:
      "O SVS do ITIL 4 é formado por princípios orientadores, governança, cadeia de valor de serviço, práticas e melhoria contínua. Referência de estudo: ITIL 4, PeopleCert. A resposta A foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 11", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Gestão de serviços e ITIL 4",
    statement:
      "Ao avaliar o gerenciamento de serviços de uma organização, uma consultoria deve considerar as quatro dimensões do ITIL 4. Qual alternativa as apresenta corretamente?",
    options: [
      "Estratégia e governança; orçamento e contratos; operação e suporte; auditoria e conformidade.",
      "Organizações e pessoas; informação e tecnologia; parceiros e fornecedores; fluxos de valor e processos.",
      "Pessoas e produtos; projetos e portfólios; custos e benefícios; riscos e controles.",
      "Serviços e aplicações; infraestrutura; segurança; continuidade.",
      "Clientes e usuários; processos internos; resultados financeiros; aprendizado.",
    ],
    correctOption: 1,
    explanation:
      "As quatro dimensões são organizações e pessoas, informação e tecnologia, parceiros e fornecedores, e fluxos de valor e processos. A resposta B foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 12", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Gestão de serviços e ITIL 4",
    statement:
      "Uma organização quer classificar três práticas do ITIL 4: implantação de versões, administração de plataformas e construção de software. A qual categoria elas pertencem?",
    options: [
      "Práticas gerais de gerenciamento.",
      "Práticas de gerenciamento de serviços.",
      "Práticas de governança corporativa.",
      "Práticas de gerenciamento técnico.",
      "Práticas de melhoria organizacional.",
    ],
    correctOption: 3,
    explanation:
      "Gerenciamento de implantação, gerenciamento de infraestrutura e plataforma e desenvolvimento e gerenciamento de software são práticas de gerenciamento técnico do ITIL 4. A resposta D foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 13", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "PDTIC e planejamento institucional de TIC",
    statement:
      "Uma universidade vai iniciar a elaboração do seu PDTIC. Qual conjunto contém atividades próprias da fase de preparação?",
    options: [
      "Delimitar abrangência e período, definir a metodologia e elaborar o plano de trabalho.",
      "Priorizar necessidades, definir metas e aprovar ações de execução.",
      "Identificar riscos, acompanhar indicadores e revisar resultados do plano.",
      "Selecionar soluções, produzir termo de referência e iniciar a contratação.",
      "Avaliar benefícios, encerrar projetos e elaborar relatório de auditoria.",
    ],
    correctOption: 0,
    explanation:
      "Na preparação são definidos o escopo e o período de vigência, a metodologia de elaboração e o plano de trabalho. O diagnóstico e o planejamento detalhado ocorrem em fases posteriores. A resposta A foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 14", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Em um modelo BPMN, uma equipe precisa deixar claro quais atividades cabem a cada participante ou papel envolvido no processo. Qual recurso atende melhor a esse objetivo?",
    options: [
      "Eventos intermediários, que registram as variáveis do processo.",
      "Gateways, que indicam a pessoa responsável por cada tarefa.",
      "Fluxos de sequência, que agrupam participantes por unidade organizacional.",
      "Pools e lanes, que organizam graficamente participantes, áreas ou responsabilidades.",
      "Anotações, que dividem o processo em raias funcionais.",
    ],
    correctOption: 3,
    explanation:
      "Pools e lanes organizam o diagrama por participante, papel ou área responsável; as atividades são posicionadas na seção correspondente. Referência: especificação BPMN 2.0.2 da OMG. A resposta D foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 15", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Contratações de TI e sistema SISP",
    statement:
      "Na preparação de uma contratação pública de TIC, qual conjunto é compatível com o conteúdo esperado de um Termo de Referência elaborado a partir do estudo técnico preliminar?",
    options: [
      "Objeto e justificativa da contratação, além dos modelos de execução e de gestão do contrato.",
      "Somente a estimativa de preço e a indicação da modalidade licitatória.",
      "Relatório de fiscalização já executada, sanções aplicadas e termo de recebimento definitivo.",
      "Plano de trabalho do PDTIC, inventário de ativos e avaliação anual de desempenho.",
      "Apenas a descrição dos perfis da equipe de planejamento e o cronograma de reuniões.",
    ],
    correctOption: 0,
    explanation:
      "O Termo de Referência deve especificar, entre outros elementos, o objeto, a justificativa e os modelos de execução e de gestão contratual. Referência: IN SGD/ME nº 94/2022, art. 12. A resposta A foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 16", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Contratações de TI e sistema SISP",
    statement:
      "No fluxo de contratação de soluções de TIC regido pela IN SGD/ME nº 94/2022, qual atividade não integra a fase de planejamento da contratação?",
    options: [
      "Elaborar o estudo técnico preliminar.",
      "Encaminhar formalmente a demanda.",
      "Elaborar o termo de referência.",
      "Constituir a equipe de planejamento da contratação.",
      "Analisar alternativas e requisitos da solução.",
    ],
    correctOption: 1,
    explanation:
      "O encaminhamento formal da demanda ocorre antes do planejamento da contratação; estudo técnico preliminar e termo de referência são produtos do planejamento. Referência: IN SGD/ME nº 94/2022. A resposta B foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 17", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Contratações de TI e sistema SISP",
    statement:
      "Durante a execução de um contrato de TIC, qual atribuição corresponde ao gestor do contrato?",
    options: [
      "Atestar sozinho a qualidade técnica de cada entrega, sem participação dos fiscais.",
      "Executar diretamente os serviços previstos no contrato em nome da Administração.",
      "Coordenar a atuação dos fiscais e formalizar o encaminhamento das demandas à contratada.",
      "Alterar unilateralmente o objeto contratado para atender novas necessidades.",
      "Substituir a autoridade competente na aplicação automática de sanções.",
    ],
    correctOption: 2,
    explanation:
      "Cabe ao gestor coordenar as atividades de fiscalização e conduzir formalmente a comunicação de demandas, articulando a fiscalização técnica, administrativa e setorial. Referência: IN SGD/ME nº 94/2022. A resposta C foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 18", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Uma política institucional de riscos da UFC define seu escopo considerando objetivos estratégicos, processos organizacionais e integridade. Qual documento estratégico está associado a esses objetivos institucionais?",
    options: [
      "Plano Diretor de Tecnologia da Informação e Comunicação (PDTIC).",
      "Plano de Desenvolvimento Institucional (PDI).",
      "Plano Anual de Contratações (PAC).",
      "Plano de Gestão de Contratos (PGC).",
      "Plano de Dados Abertos (PDA).",
    ],
    correctOption: 1,
    explanation:
      "O escopo descrito relaciona os objetivos estratégicos do PDI aos processos organizacionais e à integridade. Referência: Plano de Gestão de Riscos da UFC 2023–2027. A resposta B foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 19", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Ao mapear riscos institucionais, uma unidade da UFC precisa selecionar categorias que cubram dimensões estratégicas, financeiras, operacionais e de integridade. Qual conjunto é o mais completo?",
    options: [
      "Táticos, orçamentários, de monitoramento e de reputação.",
      "Estratégicos, internos, avaliativos e de desempenho.",
      "Operacionais, de projeto, de tecnologia e de fornecedores.",
      "Estratégicos; financeiros ou orçamentários; operacionais; legais ou de conformidade; de imagem ou reputação; e de integridade.",
      "Financeiros, de pessoal, de infraestrutura e de continuidade.",
    ],
    correctOption: 3,
    explanation:
      "A política enumera riscos estratégicos, financeiros/orçamentários, operacionais, legais/de conformidade, de imagem/reputação e de integridade. Referência: Política de Gestão de Riscos da UFC, Resolução nº 15/CONSUNI/2019. A resposta D foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 20", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Uma equipe deseja utilizar a notação padronizada pela OMG especificamente para representar processos de negócio em diagramas. Qual notação deve escolher?",
    options: [
      "BPMN.",
      "BPM.",
      "VPN.",
      "BPS.",
      "UML Activity, obrigatoriamente.",
    ],
    correctOption: 0,
    explanation:
      "BPMN significa Business Process Model and Notation e é a notação da OMG voltada à modelagem de processos de negócio. Referência: especificação BPMN 2.0.2 da OMG. A resposta A foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 21", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Na análise de um processo, a equipe documenta como ele deverá funcionar depois das melhorias propostas. Como esse modelo futuro é normalmente identificado em BPM?",
    options: ["AS-IS.", "TO-BE.", "WILL-BE.", "HOW-FUTURE.", "BASELINE."],
    correctOption: 1,
    explanation:
      "AS-IS representa o estado atual do processo; TO-BE descreve o estado futuro desejado após as mudanças. A resposta B foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 22", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Uma organização quer um Escritório de Gerenciamento de Projetos que ofereça orientação, modelos e repositório, mantendo baixo nível de controle direto sobre os projetos. Qual tipo de EGP se ajusta?",
    options: [
      "Diretivo, pois assume o gerenciamento dos projetos.",
      "Controlador, pois exige conformidade obrigatória e supervisão intensa.",
      "Executivo, pois substitui os gerentes de projeto das áreas.",
      "Consultivo ou de suporte, pois orienta e disponibiliza recursos sem comandar a execução.",
      "Estratégico, pois aprova diretamente todas as entregas técnicas.",
    ],
    correctOption: 3,
    explanation:
      "O EGP de suporte exerce papel consultivo, oferece modelos e informações e mantém baixo controle direto. A resposta D foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 23", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Para tornar o escopo de um projeto mais gerenciável, a equipe decompõe entregas e trabalho em componentes menores. Qual ferramenta representa essa decomposição hierárquica?",
    options: [
      "Diagrama de caminho crítico.",
      "Método do diagrama de precedência.",
      "Estrutura Analítica do Projeto (EAP/WBS).",
      "Gráfico de burndown.",
      "Matriz de probabilidade e impacto.",
    ],
    correctOption: 2,
    explanation:
      "A EAP/WBS decompõe hierarquicamente o escopo total do projeto em entregas e pacotes de trabalho gerenciáveis. Referência: PMI, PMBOK. A resposta C foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 24", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Qual alternativa reúne os oito domínios de desempenho do PMBOK, 7ª edição?",
    options: [
      "Escopo, custo, cronograma, qualidade, recursos, comunicação, riscos e aquisições.",
      "Iniciação, planejamento, execução, monitoramento, controle, encerramento, operação e suporte.",
      "Partes interessadas, equipe, abordagem de desenvolvimento e ciclo de vida, planejamento, trabalho do projeto, entrega, medição e incerteza.",
      "Estratégia, orçamento, pessoas, arquitetura, contratos, desempenho, auditoria e conformidade.",
      "Produtos, processos, ferramentas, fornecedores, serviços, resultados, riscos e mudanças.",
    ],
    correctOption: 2,
    explanation:
      "A 7ª edição organiza o gerenciamento em oito domínios de desempenho: partes interessadas, equipe, abordagem de desenvolvimento e ciclo de vida, planejamento, trabalho do projeto, entrega, medição e incerteza. Referência: PMI, PMBOK Guide, 7ª edição. A resposta C foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 25", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Uma equipe Scrum está bloqueada por dependências externas. Qual atuação está mais alinhada à responsabilidade do Scrum Master?",
    options: [
      "Definir unilateralmente os requisitos e a ordem do Product Backlog.",
      "Assumir a implementação técnica de todas as funcionalidades.",
      "Facilitar o trabalho da equipe e ajudar a remover impedimentos.",
      "Controlar o orçamento e atribuir tarefas individuais como gerente tradicional.",
      "Aprovar o incremento em lugar do Product Owner.",
    ],
    correctOption: 2,
    explanation:
      "O Scrum Master apoia a efetividade do Scrum, facilita o trabalho e ajuda a remover impedimentos; não substitui o Product Owner nem a equipe no gerenciamento do produto ou na construção do incremento. Referência: Scrum Guide 2020. A resposta C foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 26", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "Projetos, métodos ágeis e gestão de riscos",
    statement:
      "Em um produto desenvolvido com Scrum, quem responde por maximizar o valor e por gerenciar eficazmente o Product Backlog?",
    options: [
      "Scrum Master.",
      "Product Owner.",
      "Equipe de desenvolvimento, individualmente.",
      "Patrocinador do projeto, em todos os casos.",
      "Gerente funcional da organização.",
    ],
    correctOption: 1,
    explanation:
      "O Product Owner é responsável por maximizar o valor do produto e por gerenciar eficazmente o Product Backlog, incluindo sua ordenação e transparência. Referência: Scrum Guide 2020. A resposta B foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 27", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "COBIT 2019, SISP e governança de TIC",
    statement:
      "Qual finalidade expressa adequadamente o papel do SISP no Poder Executivo Federal?",
    options: [
      "Assegurar ao Governo Federal suporte de informação adequado, dinâmico, confiável e eficaz.",
      "Definir a política de tecnologia da informação do Poder Legislativo.",
      "Substituir as áreas de TIC dos órgãos por uma única equipe central.",
      "Regular exclusivamente a formação de professores de tecnologia.",
      "Restringir o compartilhamento de soluções entre órgãos federais.",
    ],
    correctOption: 0,
    explanation:
      "O Decreto nº 7.579/2011 institui o SISP e prevê, entre suas finalidades, assegurar suporte de informação adequado, dinâmico, confiável e eficaz ao Governo Federal. A resposta A foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 28", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "LAI, governo digital e dados abertos",
    statement:
      "Qual iniciativa está alinhada aos objetivos da Estratégia Nacional de Governo Digital 2024–2027?",
    options: [
      "Reduzir a colaboração entre entes federativos e concentrar serviços sem considerar as necessidades dos usuários.",
      "Priorizar somente a compra de equipamentos, sem desenvolver competências digitais.",
      "Manter processos manuais para evitar integração entre órgãos públicos.",
      "Qualificar a governança das políticas digitais, promover colaboração federativa e estimular inovação e tecnologias emergentes com participação social.",
      "Restringir a oferta de serviços digitais a usuários já familiarizados com tecnologia.",
    ],
    correctOption: 3,
    explanation:
      "A estratégia prevê qualificar a gestão e a governança digital, ampliar a colaboração federativa e estimular ecossistemas de inovação e tecnologias emergentes com participação dos entes e da sociedade. Referência: Estratégia Nacional de Governo Digital 2024–2027. A resposta D foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 29", proofPdf),
    status: "active",
    statusNote: "",
  },
  {
    topicName: "LAI, governo digital e dados abertos",
    statement:
      "Uma equipe está selecionando prioridades para a transformação digital federal no período de 2024 a 2027. Qual alternativa combina duas prioridades previstas?",
    options: [
      "Reduzir a capacitação continuada e limitar a transformação digital a serviços de turismo.",
      "Substituir a autenticação gov.br por cadastros independentes e interromper serviços ambientais.",
      "Expandir soluções públicas de processo administrativo eletrônico baseadas no PEN e transformar digitalmente políticas e serviços de saúde e educação.",
      "Restringir sistemas de processo eletrônico à administração federal direta e excluir serviços de saúde.",
      "Suspender a integração de serviços públicos e priorizar exclusivamente a digitalização de arquivos.",
    ],
    correctOption: 2,
    explanation:
      "Entre as prioridades estão expandir soluções públicas de processo administrativo eletrônico baseadas no Processo Eletrônico Nacional e digitalizar políticas e serviços de saúde e educação. Referência: Decreto nº 12.069/2024. A resposta C foi conferida no gabarito definitivo da FCPC, quadro Governança de TI.",
    source: source("Questão 30", proofPdf),
    status: "active",
    statusNote: "",
  },
];
