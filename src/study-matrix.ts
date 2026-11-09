export interface MatrixSource {
  title: string;
  type: "document" | "article";
  url: string;
  text: string;
}

export interface MatrixTopic {
  name: string;
  description: string;
  estimatedMinutes: number;
}

export interface MatrixSubject {
  name: string;
  description: string;
  sources: MatrixSource[];
  topics: MatrixTopic[];
}

const decreeSource: MatrixSource = {
  title: "Decreto nº 13.141/2026 — Anexo, item 2.1",
  type: "document",
  url: "https://www2.camara.leg.br/legin/fed/decret/2026/decreto-13141-21-outubro-2026-800075-anexo-pe.pdf",
  text: "Define a especialidade Governança de Dados e Tecnologia da Informação e atribuições amplas. É referência de aderência profissional, não um programa oficial de prova.",
};

const noticeSource: MatrixSource = {
  title: "Edital UFC nº 1/2024 — conteúdo programático",
  type: "document",
  url: "https://www.quixada.ufc.br/wp-content/uploads/2024/10/EDITAL-No-1-UFC-DE-30-DE-SETEMBRO-DE-2024-EDITAL-No-1-UFC-DE-30-DE-SETEMBRO-.pdf",
  text: "Referência histórica de conteúdos de Governança de TI, Ciência de Dados, Infraestrutura e Redes, e Segurança da Informação. O próximo edital pode ser diferente.",
};

const decreeTag =
  "[DECRETO 13.141/2026, Anexo, item 2.1 — aderência às atribuições; não é tópico literal de edital]";
const noticeTag =
  "[UFC 2024 — reaproveitado como referência do edital anterior, sem garantia de repetição]";
const complementaryTag =
  "[COMPLEMENTAR — aprofundamento recomendado; não confirmado no edital UFC 2024 nem especificado como prova pelo Decreto]";

export const STUDY_MATRIX: MatrixSubject[] = [
  {
    name: "Governança de TI e de Dados",
    description:
      "Governança, gestão pública digital, planejamento e administração de dados. Matriz de estudo sugerida; aguardar o próximo edital para confirmar a cobrança.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência às atribuições de governança e proteção de dados institucionais; o Decreto não lista COBIT, ITIL ou um conteúdo de prova.",
      },
      {
        ...noticeSource,
        text: "Conteúdo anterior de Governança de TI: governança, COBIT 2019, Portaria 778/2019, ITIL 4, projetos, contratações de TI, LAI, governo digital e PDTIC.",
      },
    ],
    topics: [
      {
        name: "Governança de TI: conceitos, alinhamento e avaliação",
        description: `${noticeTag} Governança versus gestão; alinhamento estratégico, implantação, avaliação e relação com objetivos institucionais.`,
        estimatedMinutes: 60,
      },
      {
        name: "COBIT 2019, SISP e governança de TIC",
        description: `${noticeTag} COBIT 2019, Guia de Governança de TIC do SISP v. 2.0 e Portaria SGD/ME nº 778/2019. ${decreeTag}`,
        estimatedMinutes: 75,
      },
      {
        name: "Gestão de serviços e ITIL 4",
        description: `${noticeTag} Fundamentos, práticas e melhoria contínua de serviços de TI. ${decreeTag} Suporte ao usuário também consta nas atribuições.`,
        estimatedMinutes: 60,
      },
      {
        name: "Projetos, métodos ágeis e gestão de riscos",
        description: `${noticeTag} PMBOK 7ª edição, PMO, portfólio, Scrum, Lean, Kanban, indicadores, matriz SWOT e BPMN.`,
        estimatedMinutes: 75,
      },
      {
        name: "Contratações de TI e sistema SISP",
        description: `${noticeTag} IN SGD/ME nº 94/2022, termo de referência, projeto básico, gestão contratual e Decreto nº 7.579/2011.`,
        estimatedMinutes: 75,
      },
      {
        name: "LAI, governo digital e dados abertos",
        description: `${noticeTag} Lei nº 12.527/2011, Estratégia de Governo Digital 2024–2027, Decreto nº 12.069/2024, Portaria SGD/MGI nº 4.248/2024, Comitê de Governança Digital e Política de Dados Abertos.`,
        estimatedMinutes: 75,
      },
      {
        name: "PDTIC e planejamento institucional de TIC",
        description: `${noticeTag} Ciclo de vida do PDTIC, Guia SISP, BSC, SWOT, BPMN, indicadores, gestão de riscos e iESGo.`,
        estimatedMinutes: 60,
      },
      {
        name: "Governança e ciclo de vida de dados institucionais",
        description: `${decreeTag} Conteúdo inferido das atribuições gerais de governança e proteção de dados: papéis, políticas, qualidade, classificação, catálogo, metadados, linhagem e dados mestres. São detalhamentos sugeridos, não enumeração literal do Decreto.`,
        estimatedMinutes: 75,
      },
      {
        name: "Proteção, compartilhamento e retenção de dados",
        description: `${decreeTag} Conteúdo inferido das atribuições de proteção de dados institucionais: acesso legítimo, compartilhamento, retenção, descarte e responsabilização. Complementar com LGPD.`,
        estimatedMinutes: 60,
      },
      {
        name: "Arquitetura e interoperabilidade de dados",
        description: `${complementaryTag} Arquitetura corporativa, interoperabilidade, dados de referência, MDM, catálogo e linhagem em profundidade.`,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    name: "Bancos de Dados e Engenharia de Dados",
    description:
      "Modelagem, bancos de dados, SQL, integração e processamento de dados, com fundamentos do edital anterior e complementos identificados.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência às atribuições de administrar sistemas informatizados e bancos de dados e proteger dados institucionais. O Decreto não especifica SQL ou tecnologias.",
      },
      {
        ...noticeSource,
        text: "Conteúdo anterior de Ciência de Dados: coleta, tratamento, armazenamento, integração e recuperação de dados, ETL, bancos relacionais, SQL, modelagem dimensional e Big Data.",
      },
    ],
    topics: [
      {
        name: "Modelagem conceitual, lógica e relacional",
        description: `${decreeTag} Entidades, atributos, relacionamentos, chaves e cardinalidade são detalhamentos técnicos sugeridos para o tema.`,
        estimatedMinutes: 75,
      },
      {
        name: "SQL: consultas e manipulação de dados",
        description: `${decreeTag} SELECT, JOIN, GROUP BY, subconsultas, CTE, funções e operações DDL, DML, DCL e TCL; detalhamento recomendado para bancos de dados.`,
        estimatedMinutes: 90,
      },
      {
        name: "Projeto e administração de bancos relacionais",
        description: `${noticeTag} Otimização SQL e indexação. ${decreeTag} Normalização, integridade, ACID, concorrência, backup, recuperação e controle de acesso como aprofundamento coerente com administração de bancos.`,
        estimatedMinutes: 90,
      },
      {
        name: "ETL, ELT e pipelines de dados",
        description: `${noticeTag} Coleta, tratamento, armazenamento, integração, recuperação de dados e pipelines.`,
        estimatedMinutes: 75,
      },
      {
        name: "Modelagem dimensional, Big Data e processamento distribuído",
        description: `${noticeTag} Modelagem dimensional, Big Data, processamento distribuído e escalabilidade.`,
        estimatedMinutes: 75,
      },
      {
        name: "NoSQL, data warehouse, data lake e lakehouse",
        description: `${complementaryTag} Bancos de documentos, chave-valor, coluna e grafos; DW, lake, lakehouse, OLAP e ELT.`,
        estimatedMinutes: 75,
      },
      {
        name: "SGBDs: monitoramento, tuning e alta disponibilidade",
        description: `${complementaryTag} Administração prática de PostgreSQL, SQL Server ou Oracle, replicação e continuidade. O edital futuro deve indicar tecnologias e profundidade.`,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    name: "Desenvolvimento e Engenharia de Software",
    description:
      "Desenvolvimento, integração, implantação e manutenção de sistemas, combinando atribuições do Decreto com referências técnicas anteriores.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência às atribuições de desenvolver, implementar e manter sistemas informatizados e bancos de dados, e administrar serviços.",
      },
      {
        ...noticeSource,
        text: "O documento do usuário identifica Git/GitLab e CI/CD no conteúdo de Ciência de Dados; o edital futuro poderá selecionar outros tópicos.",
      },
    ],
    topics: [
      {
        name: "Lógica, algoritmos e estruturas de dados",
        description: `${decreeTag} Fundamentos técnicos coerentes com desenvolvimento de sistemas.`,
        estimatedMinutes: 75,
      },
      {
        name: "Programação orientada a objetos e engenharia de software",
        description: `${decreeTag} Orientação a objetos e princípios de engenharia de software.`,
        estimatedMinutes: 75,
      },
      {
        name: "Requisitos, análise, arquitetura e ciclo de vida",
        description: `${decreeTag} Levantamento de requisitos, análise, modelagem, arquitetura, implementação, manutenção e documentação.`,
        estimatedMinutes: 75,
      },
      {
        name: "Testes, implantação e integração contínua",
        description: `${decreeTag} Testes e implantação. ${noticeTag} Git/GitLab e CI/CD são referência em conteúdo anterior de Ciência de Dados.`,
        estimatedMinutes: 75,
      },
      {
        name: "APIs, integração, autenticação e observabilidade",
        description: `${decreeTag} APIs, integração, autenticação, autorização, tratamento de erros, logs e observabilidade.`,
        estimatedMinutes: 75,
      },
      {
        name: "Arquitetura moderna, DevOps e desenvolvimento seguro",
        description: `${complementaryTag} SOLID, padrões, microsserviços, mensageria, Docker, OWASP, dependências e gestão de segredos.`,
        estimatedMinutes: 75,
      },
    ],
  },
  {
    name: "Redes, Sistemas Operacionais e Infraestrutura",
    description:
      "Administração de ambientes e serviços de rede, sistemas operacionais e infraestrutura. A especialidade anterior do edital é distinta da nova área.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência às atribuições de administrar ambientes de rede e serviços.",
      },
      {
        ...noticeSource,
        text: "Conteúdo de Infraestrutura e Redes do edital anterior da UFC usado como referência histórica; não presume a mesma especialidade no próximo concurso.",
      },
    ],
    topics: [
      {
        name: "Redes TCP/IP, endereçamento e roteamento",
        description: `${decreeTag} IPv4/IPv6, TCP/IP, VLAN, VPN e roteamento.`,
        estimatedMinutes: 75,
      },
      {
        name: "DNS, DHCP, HTTP/HTTPS e serviços de rede",
        description: `${decreeTag} DNS, DHCP e protocolos Web. ${noticeTag} Relacionar a LDAP, FTP, CIFS/NFS e correio eletrônico como conteúdos de infraestrutura do edital anterior.`,
        estimatedMinutes: 75,
      },
      {
        name: "Administração de Linux e Windows",
        description: `${decreeTag} Administração de sistemas, usuários, grupos, permissões e serviços. ${noticeTag} Windows Server e Unix/Linux.`,
        estimatedMinutes: 75,
      },
      {
        name: "Servidores, segurança de rede e alta disponibilidade",
        description: `${noticeTag} Samba, LDAP, firewall, Apache/Nginx, TLS, proxy reverso, balanceamento e datacenter.`,
        estimatedMinutes: 75,
      },
      {
        name: "Virtualização, cloud e continuidade de serviços",
        description: `${complementaryTag} Virtualização, containers, armazenamento, monitoramento, gestão de configuração e continuidade.`,
        estimatedMinutes: 60,
      },
      {
        name: "Automação de infraestrutura e scripts",
        description: `${noticeTag} Scripts Bash/Python. ${complementaryTag} Automação e práticas de configuração.`,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    name: "Segurança da Informação e Privacidade",
    description:
      "Políticas, controles, identidade, segurança, privacidade e proteção de dados. A especialidade Segurança da Informação do edital anterior é referência, não garantia.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência às atribuições de implementar políticas de segurança da informação e governança/proteção dos dados institucionais.",
      },
      {
        ...noticeSource,
        text: "Conteúdo anterior de Segurança da Informação: ISO/IEC 27001:2022, 27002:2022, 27005:2023, LAI, Marco Civil, LGPD e normas nacionais.",
      },
    ],
    topics: [
      {
        name: "Fundamentos, políticas e controles de segurança",
        description: `${decreeTag} Confidencialidade, integridade, disponibilidade, políticas, gestão de riscos e controles.`,
        estimatedMinutes: 60,
      },
      {
        name: "Identidade, autenticação e controle de acesso",
        description: `${decreeTag} Perfis de acesso, identidade, autenticação, autorização, menor privilégio, segregação de funções e revisão periódica.`,
        estimatedMinutes: 60,
      },
      {
        name: "Normas ISO/IEC 27001, 27002 e 27005",
        description: `${noticeTag} Versões indicadas na matriz de referência: 27001:2022, 27002:2022 e 27005:2023. Confirmar versões no novo edital.`,
        estimatedMinutes: 75,
      },
      {
        name: "LGPD e proteção de dados pessoais",
        description: `${decreeTag} A matriz do documento relaciona as atribuições de proteção a dados à LGPD: princípios, bases legais, direitos, agentes, segurança e incidentes. O Decreto remete à proteção de dados institucionais, sem listar esses subtópicos.`,
        estimatedMinutes: 90,
      },
      {
        name: "LAI, Marco Civil e segurança no setor público",
        description: `${noticeTag} LAI, Marco Civil da Internet e normas/estratégias nacionais de segurança indicadas no conteúdo anterior.`,
        estimatedMinutes: 75,
      },
      {
        name: "Criptografia, hardening e resposta a incidentes",
        description: `${complementaryTag} Criptografia, gestão de vulnerabilidades, hardening, logs, resposta, continuidade e recuperação de desastres.`,
        estimatedMinutes: 75,
      },
    ],
  },
  {
    name: "Suporte Técnico e Gestão de Serviços de TI",
    description:
      "Atendimento a usuários e processos de gestão de serviços, contemplando atribuições do Decreto e tópicos de ITIL do edital anterior.",
    sources: [
      {
        ...decreeSource,
        text: "Aderência à atribuição de prestar suporte técnico aos usuários.",
      },
      {
        ...noticeSource,
        text: "Conteúdo anterior de Governança de TI: ITIL 4, fundamentos, práticas e gerenciamento de serviços.",
      },
    ],
    topics: [
      {
        name: "Atendimento, diagnóstico e escalonamento de chamados",
        description: `${decreeTag} Atendimento e suporte técnico, diagnóstico, registro, priorização, resolução e escalonamento.`,
        estimatedMinutes: 60,
      },
      {
        name: "ITIL 4 e gerenciamento de serviços",
        description: `${noticeTag} Fundamentos, práticas, incidentes, problemas, mudanças, níveis de serviço e melhoria contínua.`,
        estimatedMinutes: 75,
      },
      {
        name: "Catálogo de serviços, SLA e base de conhecimento",
        description: `${complementaryTag} Catálogo, SLA/ANS, base de conhecimento, inventário, gestão de configuração e indicadores.`,
        estimatedMinutes: 60,
      },
      {
        name: "Suporte a estações, aplicações e conectividade",
        description: `${complementaryTag} Suporte a estações, sistemas, aplicações, contas, conectividade, impressão e ferramentas institucionais.`,
        estimatedMinutes: 60,
      },
    ],
  },
];
