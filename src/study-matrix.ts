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
  text: "Referência histórica para os conteúdos de Analista de Tecnologia da Informação, incluindo disciplinas gerais e específicas. O próximo edital pode ser diferente.",
};

const decreeTag =
  "[DECRETO 13.141/2026, Anexo, item 2.1 — aderência às atribuições; não é tópico literal de edital]";
const noticeTag =
  "[UFC 2024 — reaproveitado como referência do edital anterior, sem garantia de repetição]";
const generalNoticeTag =
  "[EDITAL UFC 01/2024 — conteúdo programático de Analista de Tecnologia da Informação; referência histórica, sem garantia de repetição]";
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
        description: `${noticeTag} Estratégia de Governo Digital 2024–2027, Decreto nº 12.069/2024, Portaria SGD/MGI nº 4.248/2024, Comitê de Governança Digital e Política de Dados Abertos. A Lei de Acesso à Informação é estudada em Legislação.`,
        estimatedMinutes: 75,
      },
      {
        name: "PDTIC e planejamento institucional de TIC",
        description: `${noticeTag} Ciclo de vida do PDTIC, Guia SISP, BSC, SWOT, BPMN, indicadores, gestão de riscos e iESGo.`,
        estimatedMinutes: 60,
      },
      {
        name: "Plano de Transformação Digital e dados abertos",
        description: `${generalNoticeTag} Plano de Transformação Digital; Política de Dados Abertos do Poder Executivo Federal e Decreto nº 9.903/2019; princípios, objetivos e iniciativas da Estratégia de Governo Digital 2024–2027; composição, funções e atribuições do Comitê de Governança Digital.`,
        estimatedMinutes: 75,
      },
      {
        name: "Riscos institucionais e perfil iESGo da UFC",
        description: `${generalNoticeTag} Plano de Gestão de Riscos da UFC 2023–2027; Política de Gestão de Riscos da UFC (Resolução nº 15/CONSUNI/2019); ameaça, vulnerabilidade e impacto; iESGo 2024 e avaliação de práticas ESG no setor público.`,
        estimatedMinutes: 75,
      },
      {
        name: "Gerenciamento de projetos: abordagens e processos",
        description: `${generalNoticeTag} Abordagens tradicional, híbrida e ágil; projetos, programas e portfólio; PMBOK 7ª edição, processos, grupos de processos e áreas de conhecimento; PMO; Scrum Guide 2020, Lean, Kanban e gestão de riscos.`,
        estimatedMinutes: 90,
      },
      {
        name: "Processos de negócio, BPMN e indicadores",
        description: `${generalNoticeTag} Gestão de processos de negócio; modelagem BPMN; análise, desenho e automação de processos; técnicas de análise e melhoria; construção e mensuração de indicadores.`,
        estimatedMinutes: 75,
      },
      {
        name: "SISP: finalidade, organização e competências",
        description: `${generalNoticeTag} Finalidade, organização e competências do Sistema de Administração dos Recursos de Tecnologia da Informação (SISP); relação com a governança e gestão de TIC nos órgãos federais.`,
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
    name: "Ciência de Dados e Estatística",
    description:
      "Análise e mineração de dados, aprendizado de máquina, linguagem natural, IA generativa, visualização e estatística conforme o conteúdo específico de Ciência de Dados do Edital UFC nº 1/2024.",
    sources: [
      {
        ...noticeSource,
        text: "Conteúdo específico de Ciência de Dados do Anexo I do Edital UFC nº 1/2024. ETL, SQL, modelagem dimensional e Big Data ficam organizados em Bancos de Dados e Engenharia de Dados, sem duplicação.",
      },
    ],
    topics: [
      {
        name: "Mineração de dados e pré-processamento",
        description: `${generalNoticeTag} Tarefas e técnicas de mineração de dados; escalonamento, balanceamento e estratificação; regras de associação e detecção de anomalias.`,
        estimatedMinutes: 75,
      },
      {
        name: "Aprendizado de máquina e clusterização",
        description: `${generalNoticeTag} Aprendizado supervisionado, não supervisionado, por reforço e profundo; agrupamentos com K-Means, DBScan e clusterização hierárquica.`,
        estimatedMinutes: 90,
      },
      {
        name: "Mineração de texto e processamento de linguagem natural",
        description: `${generalNoticeTag} Análise de sentimentos, classificação de textos e análise de tópicos; modelos recorrentes RNN/LSTM e transformers BERT/GPT.`,
        estimatedMinutes: 90,
      },
      {
        name: "LLMs, fine-tuning e geração aumentada por recuperação",
        description: `${generalNoticeTag} Modelos de linguagem de grande escala (LLM), fine-tuning, RAG e ferramentas para aplicações com LLM, como LangChain.`,
        estimatedMinutes: 75,
      },
      {
        name: "Tipos de análise, exploração e storytelling de dados",
        description: `${generalNoticeTag} Análises descritiva, preditiva e prescritiva; análise exploratória, visualizações interativas e storytelling.`,
        estimatedMinutes: 75,
      },
      {
        name: "Ferramentas de análise e bibliotecas Python",
        description: `${generalNoticeTag} Planilhas, Jupyter Notebook e bibliotecas pandas, numpy, matplotlib, seaborn, plotly e scikit-learn. Consultas SQL e pipelines estão em Bancos de Dados e Engenharia de Dados.`,
        estimatedMinutes: 75,
      },
      {
        name: "AutoML e ferramentas para aplicações de dados e IA",
        description: `${generalNoticeTag} AutoGluon e PyCaret; protótipos e dashboards com Streamlit, Voilà, Plotly, Gradio e Mesop; Power BI e Tableau.`,
        estimatedMinutes: 75,
      },
      {
        name: "MLOps e rastreamento de experimentos",
        description: `${generalNoticeTag} Fundamentos de MLOps e rastreamento de experimentos de aprendizado de máquina. Versionamento e CI/CD são estudados uma única vez em Desenvolvimento e Engenharia de Software.`,
        estimatedMinutes: 60,
      },
      {
        name: "Estatística: variáveis, séries e distribuições",
        description: `${generalNoticeTag} Metodologia e utilização da estatística; variáveis quantitativas e qualitativas; séries estatísticas; organização e apresentação; distribuições de frequências absoluta, relativa e acumulada.`,
        estimatedMinutes: 75,
      },
      {
        name: "Estatística descritiva e inferencial",
        description: `${generalNoticeTag} Média, moda, mediana, separatrizes, desvio-padrão, variância, coeficiente de variação e correlação; histogramas, curvas de frequência, boxplot e outliers; dados categorizados, intervalos de confiança e testes de hipóteses paramétricos e não paramétricos.`,
        estimatedMinutes: 90,
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
      {
        name: "Linguagens, plataformas móveis e tipos de solução",
        description: `${generalNoticeTag} Java versão 6 ou superior, Python e JavaScript; desenvolvimento para Android e iOS; codificação de sistemas transacionais, analíticos, mobile e APIs.`,
        estimatedMinutes: 75,
      },
      {
        name: "Análise estática, Clean Code e qualidade de código",
        description: `${generalNoticeTag} Análise estática de código-fonte, práticas de Clean Code e uso do SonarQube. Padrões e reuso de software integram o ciclo de engenharia.`,
        estimatedMinutes: 75,
      },
      {
        name: "Testes de software, TDD, usabilidade e RPA",
        description: `${generalNoticeTag} Conceitos, tipos e testes automatizados; testes ágeis; usabilidade; TDD; gestão do ciclo de vida de testes; automação robótica de processos (RPA).`,
        estimatedMinutes: 75,
      },
      {
        name: "Agilidade, Design Thinking e metodologia de ponto de função",
        description: `${generalNoticeTag} Scrum, Kanban, XP, Design Thinking, padrões de desenvolvimento e reuso; estimativa de software pela metodologia de ponto de função. Gestão de projetos e BPMN ficam em Governança de TI.`,
        estimatedMinutes: 75,
      },
      {
        name: "Engenharia de requisitos: classificação e elicitação",
        description: `${generalNoticeTag} Classificação de requisitos; processo de Engenharia de Requisitos e técnicas de elicitação.`,
        estimatedMinutes: 75,
      },
      {
        name: "Gestão de configuração, Git e pipelines CI/CD",
        description: `${generalNoticeTag} Versionamento com Git e GitLab; pipelines CI/CD com GitLab CI e Jenkins.`,
        estimatedMinutes: 75,
      },
      {
        name: "Inteligência artificial aplicada ao desenvolvimento",
        description: `${generalNoticeTag} Conceitos e modelos de Inteligência Artificial e aplicações no desenvolvimento de software. Técnicas de aprendizado de máquina e LLMs estão detalhadas em Ciência de Dados e Estatística.`,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    name: "Desenvolvimento Back-End",
    description:
      "Tecnologias e arquiteturas específicas de Back-End previstas para Analista de TI no Anexo I do Edital UFC nº 1/2024. Fundamentos compartilhados de engenharia, testes, métodos ágeis, segurança, dados e governança são organizados nas disciplinas correspondentes.",
    sources: [
      {
        ...noticeSource,
        text: "Conteúdo específico de Arquitetura e Desenvolvimento de Sistemas — Back-End, no Anexo I do Edital UFC nº 1/2024.",
      },
    ],
    topics: [
      {
        name: "Arquitetura Web, interoperabilidade e serviços",
        description: `${generalNoticeTag} Arquitetura de software e de aplicações Web; interoperabilidade, arquitetura orientada a serviços, web services e APIs; arquitetura e linguagens orientadas a objetos.`,
        estimatedMinutes: 75,
      },
      {
        name: "Frameworks Back-End, JVM e especificações JEE",
        description: `${generalNoticeTag} Hibernate, Spring Boot, Django, Flask, Node.js e JQuery; JVM e especificações JEE: JPA, EJB, JSF, JMS e JTA.`,
        estimatedMinutes: 90,
      },
      {
        name: "Arquiteturas de serviços, hexagonal e distribuída",
        description: `${generalNoticeTag} Arquitetura orientada a serviços e hexagonal; microsserviços, orquestração de serviços, API Gateway, containers e transações distribuídas.`,
        estimatedMinutes: 90,
      },
      {
        name: "Servidores Web e de aplicação",
        description: `${generalNoticeTag} Conceitos e uso de servidores de aplicação e Web; JBoss, WildFly, Apache e Nginx.`,
        estimatedMinutes: 75,
      },
      {
        name: "Protocolos e formatos para integração Back-End",
        description: `${generalNoticeTag} XML, XSLT, UDDI, REST e JSON; HTTPS, HTTP/2, gRPC e WebSockets. SSL/TLS e criptografia são estudados uma única vez em Segurança da Informação.`,
        estimatedMinutes: 75,
      },
      {
        name: "Portais, CMS e workflow",
        description: `${generalNoticeTag} Sistemas de gestão de conteúdo e portais corporativos: conceitos, aplicações e workflow. Arquitetura da informação, acessibilidade, usabilidade e planejamento da interação Web são aprofundados em Desenvolvimento Front-End.`,
        estimatedMinutes: 60,
      },
    ],
  },
  {
    name: "Desenvolvimento Front-End e UX",
    description:
      "Tecnologias de interface, prototipação e experiência do usuário previstas para Arquitetura e Desenvolvimento de Sistemas — Front-End no Anexo I do Edital UFC nº 1/2024.",
    sources: [
      {
        ...noticeSource,
        text: "Conteúdo específico de Arquitetura e Desenvolvimento de Sistemas — Front-End, no Anexo I do Edital UFC nº 1/2024.",
      },
    ],
    topics: [
      {
        name: "Tecnologias Web, frameworks e aplicações SPA/PWA",
        description: `${generalNoticeTag} HTML, CSS, Ajax, Bootstrap, VueJS, React e Angular; padrões de Front-End, aplicações de página única (SPA) e aplicações Web progressivas (PWA).`,
        estimatedMinutes: 90,
      },
      {
        name: "Design e prototipação de interfaces",
        description: `${generalNoticeTag} Técnicas, tecnologias e ferramentas para design e prototipação de interfaces gráficas; design responsivo e adaptativo.`,
        estimatedMinutes: 75,
      },
      {
        name: "UX e arquitetura da informação",
        description: `${generalNoticeTag} Conceitos e aplicações de User Experience (UX), arquitetura da informação e desenho e planejamento da interação em aplicações Web.`,
        estimatedMinutes: 75,
      },
      {
        name: "Acessibilidade, usabilidade e avaliação de interfaces",
        description: `${generalNoticeTag} Conceitos de acessibilidade e usabilidade; técnicas de teste de usabilidade de software.`,
        estimatedMinutes: 60,
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
      {
        name: "Armazenamento, datacenter e tecnologias de backup",
        description: `${generalNoticeTag} Arquitetura de datacenter; armazenamento, padrões de discos e interfaces, RAID, DAS, NAS, SAN, Fibre Channel e iSCSI; conceitos de backup, deduplicação, Information Lifecycle Management (ILM) e Bacula.`,
        estimatedMinutes: 90,
      },
      {
        name: "Serviços de rede, firewall e servidores",
        description: `${generalNoticeTag} Compartilhamento SAMBA, LDAP/OpenLDAP, DNS, DHCP, FTP, CIFS e NFS; firewalls iptables, ufw e pfSense; Apache, Nginx, Traefik e HAProxy, balanceamento, proxy reverso e API Gateway; servidores PHP, Tomcat e JBoss; SMTP, POP3 e IMAP. Captive portal e controle de acesso são estudados em Segurança da Informação.`,
        estimatedMinutes: 90,
      },
      {
        name: "Redes corporativas, protocolos e conectividade",
        description: `${generalNoticeTag} Modelo OSI; Ethernet, Fibre Channel, iSCSI, Wi-Fi IEEE 802.11 a/b/g/n/ac/ax, MPLS, SD-WAN e VLAN 802.1Q; VoIP, H.323 e SIP; VPN OpenVPN/WireGuard; RIP, OSPF e STP/RSTP/MSTP; DNS, FTP, NFS, Telnet, SMTP, HTTP, LDAP, DHCP, IPsec, SSH, SNMP e NAT; endereçamento IPv4/IPv6.`,
        estimatedMinutes: 90,
      },
      {
        name: "Computação em nuvem e virtualização",
        description: `${generalNoticeTag} Benefícios de nuvem, alta disponibilidade, escalabilidade, elasticidade, agilidade e recuperação de desastres; nuvens públicas/privadas, IaaS/PaaS/SaaS e workloads; regiões, zonas de disponibilidade, subscrições, grupos de gestão e recursos; hipervisores tipo 1/2 e modos HVM, PV, PVHVM e PVH; Xen/XenServer, XCP-ng, VMware e Xen Orchestra; clustering, failover, balanceamento e replicação de estado.`,
        estimatedMinutes: 90,
      },
      {
        name: "Containers, orquestração e infraestrutura como código",
        description: `${generalNoticeTag} Docker, Docker Swarm e Kubernetes; conceitos e orquestração de containers; provisionamento e gestão de configuração com Ansible e Terraform. Conceitos de microsserviços e arquitetura ficam em Desenvolvimento Back-End.`,
        estimatedMinutes: 90,
      },
      {
        name: "Monitoramento e gerenciamento de ativos de TI",
        description: `${generalNoticeTag} Monitoramento de redes, servidores e serviços; detecção de problemas e otimização de desempenho; SNMP, MIB, RMON e NetFlow; ferramentas Zabbix e Cacti.`,
        estimatedMinutes: 75,
      },
      {
        name: "Operação de bancos de dados em infraestrutura",
        description: `${generalNoticeTag} Gestão e operação de SGBDs: MySQL, MariaDB, Oracle 11g, Microsoft SQL Server e PostgreSQL. Modelagem, SQL e bancos NoSQL permanecem em Bancos de Dados e Engenharia de Dados.`,
        estimatedMinutes: 75,
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
        text: "Conteúdo anterior de Segurança da Informação: ISO/IEC 27001:2022, 27002:2022, 27005:2023 e normas nacionais de segurança cibernética. LAI, Marco Civil e LGPD são estudados em Legislação.",
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
        name: "Criptografia, hardening e resposta a incidentes",
        description: `${complementaryTag} Criptografia, gestão de vulnerabilidades, hardening, logs, resposta, continuidade e recuperação de desastres.`,
        estimatedMinutes: 75,
      },
      {
        name: "Criptografia, protocolos e infraestrutura de chaves públicas",
        description: `${generalNoticeTag} Cifras simétricas e assimétricas, hash, cifras de bloco e fluxo e modos de operação citados no edital (ECB, CBC, CBF, OBF e CTR); AES, 3DES, Blowfish, IDEA, RC4, RC6, Diffie-Hellman, RSA, ECC, MD4, MD5, SHA-1, SHA-2 e WHIRLPOOL; ataques de força bruta, dicionário, frequência, criptoanálise, colisão e aniversário; SSL/TLS, PKI, certificados autoassinados ou emitidos por autoridade certificadora, assinatura digital e esteganografia.`,
        estimatedMinutes: 90,
      },
      {
        name: "Segurança de redes, perímetro e comunicações",
        description: `${generalNoticeTag} Segmentação, DMZ, VLAN, ameaças de spoofing, firewalls stateless, SPI (Stateful Packet Inspection), DPI (Deep Packet Inspection) e UTM (Unified Threat Management), netfilter, iptables e fwbuilder; IDS/IPS (detecção e prevenção de intrusão) e Snort; análise de tráfego nas camadas de enlace, rede e aplicação com iptraf, tcpdump e Wireshark; VPN, encapsulamento, autenticação, criptografia e topologias com PPTP/L2TP/IPsec/OpenVPN; ataques a redes Wi-Fi, WEP/WPA/WPA2/WPA3 e IEEE 802.1X.`,
        estimatedMinutes: 90,
      },
      {
        name: "Autenticação e modelos de controle de acesso",
        description: `${generalNoticeTag} Identificação, autenticação e autorização; menor privilégio, necessidade de conhecer e segregação de funções; modelos MAC, DAC e RBAC; métodos administrativos, físicos, técnicos e em camadas; controles centralizados/descentralizados, baseados em regras, interface, matriz, conteúdo ou contexto; PAP, CHAP, EAP, NTLM, Kerberos, RADIUS e TACACS.`,
        estimatedMinutes: 75,
      },
      {
        name: "Autenticação multifator e federação de identidade",
        description: `${generalNoticeTag} Autenticação de dois fatores/MFA; OAuth 2, JWT, SSO, OpenID Connect e SAML.`,
        estimatedMinutes: 60,
      },
      {
        name: "Normas e legislação de segurança cibernética no setor público",
        description: `${generalNoticeTag} Decreto nº 10.222/2020 (e-Ciber), Decreto nº 10.748/2021 (Rede Federal de Gestão de Incidentes Cibernéticos), Decreto nº 11.856/2023 (Política Nacional de Cibersegurança); IN GSI/PR nº 01/2020 e IN nº 03, 05 e 06/2021. LAI, Marco Civil e LGPD ficam consolidados na disciplina Legislação.`,
        estimatedMinutes: 75,
      },
      {
        name: "Procedimentos e gestão da segurança da informação",
        description: `${generalNoticeTag} Políticas e procedimentos de segurança; conceitos gerais de gerenciamento e implementação de controles de segurança da informação.`,
        estimatedMinutes: 60,
      },
      {
        name: "Segurança de aplicações, OWASP e desenvolvimento seguro",
        description: `${generalNoticeTag} Programação segura e revisão de código; controles e testes de segurança Web; injeções Command/SQL/LDAP, XSS, sequestro de sessão, referência insegura a objetos, CSRF e armazenamento inseguro de dados criptografados; segurança em aplicações Java, Python e PHP; SDL, SAST (Static Application Security Testing), DAST (Dynamic Application Security Testing), OWASP Top 10:2021, CIS Controls v8 e NIST CSF 2.0.`,
        estimatedMinutes: 90,
      },
      {
        name: "Incidentes, malware, testes de invasão e forense",
        description: `${generalNoticeTag} Tratamento e resposta a incidentes (CERT); vírus, cavalos de Troia, spyware, backdoors, keyloggers e worms; testes de invasão e forense computacional; hardening de servidores Linux/Windows (Windows Server 2016, 2019 e 2022) e estações Linux/Windows 7, 10 e 11; auditoria de logs com Syslog e Microsoft Event Viewer; segurança de SSH, LDAP, Apache, JBoss, Tomcat, Postfix, Squid, BIND, MySQL e PostgreSQL.`,
        estimatedMinutes: 90,
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
  {
    name: "Língua Portuguesa",
    description:
      "Conteúdo programático de Língua Portuguesa para Analista de Tecnologia da Informação no Edital UFC nº 01/2024. São 10 questões indicadas no edital; confira eventuais retificações na fonte.",
    sources: [
      {
        ...noticeSource,
        text: "Fonte do conteúdo programático de Língua Portuguesa para Analista de Tecnologia da Informação no Edital UFC nº 01/2024. O edital futuro poderá alterar a cobrança.",
      },
    ],
    topics: [
      {
        name: "Textualidade",
        description: `${generalNoticeTag} Coerência textual; coesão referencial e sequencial; situacionalidade; intertextualidade.`,
        estimatedMinutes: 60,
      },
      {
        name: "Semântica",
        description: `${generalNoticeTag} Sinonímia e antonímia; hiponímia e hiperonímia; homonímia e paronímia; polissemia; ambiguidade; denotação e conotação; sentido próprio e figurado; implícitos.`,
        estimatedMinutes: 75,
      },
      {
        name: "Tipologia e gêneros textuais",
        description: `${generalNoticeTag} Tipos e gêneros textuais; constituição e organização dos textos; funções e características linguísticas; documentos oficiais.`,
        estimatedMinutes: 60,
      },
      {
        name: "Redação oficial",
        description: `${generalNoticeTag} Padrão ofício; ata; atestado; certidão; convocação; edital; parecer; portaria; requerimento; relatório.`,
        estimatedMinutes: 75,
      },
      {
        name: "Interpretação e reescrita",
        description: `${generalNoticeTag} Propósito comunicativo; reescrita de frases e parágrafos; adequação aos gêneros textuais; níveis de formalidade.`,
        estimatedMinutes: 75,
      },
      {
        name: "Convenções gráficas",
        description: `${generalNoticeTag} Ortografia oficial; abreviações, siglas e símbolos; acentuação gráfica; crase; pontuação.`,
        estimatedMinutes: 75,
      },
      {
        name: "Morfologia",
        description: `${generalNoticeTag} Elementos mórficos; formação de palavras; classes de palavras; caracterização morfossintática; emprego das classes gramaticais.`,
        estimatedMinutes: 75,
      },
      {
        name: "Flexão nominal e verbal",
        description: `${generalNoticeTag} Gênero e número; tempos e modos verbais; voz verbal; aspecto verbal; pronomes e expressões de tratamento.`,
        estimatedMinutes: 60,
      },
      {
        name: "Sintaxe",
        description: `${generalNoticeTag} Concordância verbal e nominal; regência verbal e nominal; termos da oração; relações sintático-semânticas entre orações; relações entre períodos e parágrafos; colocação dos termos e das orações.`,
        estimatedMinutes: 90,
      },
    ],
  },
  {
    name: "Legislação",
    description:
      "Conteúdo programático de Legislação para Analista de Tecnologia da Informação no Edital UFC nº 01/2024. São 10 questões indicadas no edital; confira eventuais retificações na fonte.",
    sources: [
      {
        ...noticeSource,
        text: "Fonte do conteúdo programático de Legislação para Analista de Tecnologia da Informação no Edital UFC nº 01/2024. Consulte o edital e eventuais retificações; normas legais podem ser alteradas.",
      },
    ],
    topics: [
      {
        name: "Constituição Federal de 1988",
        description: `${generalNoticeTag} Princípios fundamentais; direitos e garantias fundamentais; organização do Estado.`,
        estimatedMinutes: 90,
      },
      {
        name: "Decreto nº 1.171/1994 — Código de Ética",
        description: `${generalNoticeTag} Código de Ética Profissional do Servidor Público Civil do Poder Executivo Federal.`,
        estimatedMinutes: 60,
      },
      {
        name: "Lei nº 8.112/1990 — Regime jurídico dos servidores",
        description: `${generalNoticeTag} Regime jurídico dos servidores públicos civis da União; direitos e vantagens; deveres e proibições; responsabilidades; penalidades; processo administrativo disciplinar.`,
        estimatedMinutes: 120,
      },
      {
        name: "Lei nº 11.091/2005 — PCCTAE",
        description: `${generalNoticeTag} Plano de Carreira dos Cargos Técnico-Administrativos em Educação; estruturação da carreira; desenvolvimento profissional.`,
        estimatedMinutes: 75,
      },
      {
        name: "Lei nº 12.527/2011 — Lei de Acesso à Informação",
        description: `${generalNoticeTag} Transparência pública; acesso e restrições à informação.`,
        estimatedMinutes: 60,
      },
      {
        name: "LAI: transparência, prazos e recursos",
        description: `${generalNoticeTag} Princípios da Lei de Acesso à Informação; transparência ativa e passiva; prazos de resposta e instâncias recursais.`,
        estimatedMinutes: 60,
      },
      {
        name: "Lei nº 12.965/2014 — Marco Civil da Internet",
        description: `${generalNoticeTag} Princípios, garantias, direitos e deveres para o uso da Internet no Brasil.`,
        estimatedMinutes: 75,
      },
      {
        name: "Lei nº 13.709/2018 — LGPD",
        description: `${generalNoticeTag} Princípios e fundamentos; tratamento de dados pessoais; direitos dos titulares; agentes de tratamento; segurança e proteção de dados.`,
        estimatedMinutes: 90,
      },
      {
        name: "Lei nº 9.784/1999 — Processo administrativo federal",
        description: `${generalNoticeTag} Princípios; direitos dos administrados; competência; impedimentos e suspeição; recursos administrativos.`,
        estimatedMinutes: 90,
      },
      {
        name: "Lei nº 8.429/1992 — Improbidade administrativa",
        description: `${generalNoticeTag} Atos de improbidade; sanções aplicáveis; alterações da Lei nº 14.230/2021.`,
        estimatedMinutes: 75,
      },
      {
        name: "Lei nº 13.726/2018 — Desburocratização",
        description: `${generalNoticeTag} Desburocratização e simplificação administrativa.`,
        estimatedMinutes: 45,
      },
      {
        name: "Lei nº 14.133/2021 — Licitações e contratos",
        description: `${generalNoticeTag} Princípios; modalidades; fases da licitação; contratação direta; contratos administrativos.`,
        estimatedMinutes: 120,
      },
      {
        name: "Decreto nº 11.072/2022 — PGD",
        description: `${generalNoticeTag} Programa de Gestão e Desempenho (PGD).`,
        estimatedMinutes: 60,
      },
      {
        name: "Lei nº 14.681/2023 — Bem-estar e qualidade de vida",
        description: `${generalNoticeTag} Política de Bem-Estar, Saúde e Qualidade de Vida no Trabalho e Valorização dos Profissionais da Educação.`,
        estimatedMinutes: 60,
      },
      {
        name: "Estatuto da UFC",
        description: `${generalNoticeTag} Organização institucional; estrutura administrativa; órgãos e competências.`,
        estimatedMinutes: 75,
      },
      {
        name: "Regimento Geral da UFC",
        description: `${generalNoticeTag} Organização e funcionamento da universidade; administração universitária; competências dos órgãos institucionais.`,
        estimatedMinutes: 75,
      },
    ],
  },
];
