# Política de Privacidade — AVALIA (rascunho)

> Rascunho para revisão jurídica. Não constitui aconselhamento legal. Versão 0.1 — 2026.

## 1. Quem somos e papel no tratamento

A plataforma AVALIA é um serviço de avaliação imobiliária assistida por IA oferecido por [empresa/CNPJ a definir]. No contexto da LGPD (Lei nº 13.709/2018):

- **Controladores:** os corretores e imobiliárias que utilizam a plataforma para tratar dados de proprietários, compradores e terceiros envolvidos na avaliação.
- **Operadora:** a AVALIA, que processa os dados em nome do controlador, sob suas instruções e conforme esta Política e o Contrato de Processamento de Dados (DPA).

## 2. Dados tratados

A plataforma trata, de forma minimizada:

| Dado | Finalidade | Base legal |
|---|---|---|
| Nome, e-mail e registro profissional (CRECI/CNAI) do usuário | Criação de conta, autenticação e identificação do avaliador | Execução de contrato (art. 7º, V) |
| Endereço do imóvel e características (área, tipologia, conservação) | Cálculo da avaliação e pesquisa de comparáveis | Execução de contrato / legítimo interesse (arts. 7º, V e IX) |
| Fotos do imóvel enviadas pelo usuário | Documentação fotográfica do estudo e análise assistida por IA | Execução de contrato, com autorização do titular do imóvel (controlador) |
| Endereço IP e user-agent | Segurança, prevenção de abuso e logs de auditoria | Legítimo interesse (arts. 7º, IX e 10) |
| Metadados de uso (avaliações criadas) | Funcionamento, quotas e relatórios agregados | Legítimo interesse / execução de contrato |

**Não tratamos:** dados sensíveis (saúde, biometria, origem racial/étnica), dados de crianças/adolescentes, CPF ou documentos de proprietários, dados financeiros de terceiros.

## 3. Bases legais e finalidades

- **Execução de contrato** — prestar o serviço de avaliação contratado pelo usuário.
- **Legítimo interesse** — segurança da informação, prevenção de fraude, auditoria e melhoria do serviço, sempre após análise de balanceamento.
- **Obrigações legais/regulatórias** — quando aplicável (ex.: registros exigidos por normas profissionais).

## 4. Fotos: autorização do titular

O imóvel e seus registros fotográficos podem conter dados pessoais do proprietário. **É responsabilidade do controlador (corretor/imobiliária)** obter autorização do titular do imóvel antes do tratamento. A plataforma disponibiliza um modelo de autorização (ver `modelo-autorizacao-titular.md`).

## 5. Compartilhamento

| Destinatário | Finalidade | Localização |
|---|---|---|
| Supabase (infraestrutura de banco e armazenamento) | Hospedagem dos dados | EUA (ver transferência internacional) |
| Google (Gemini Vision) | Análise de fotos para sugestão de estado de conservação | EUA |
| Apify (scraping de anúncios) | Coleta de comparáveis de mercado (dados públicos) | EUA |

Todos os provedores tratam dados sob contratos de processamento; transferências internacionais seguem o Regulamento de Transferência Internacional (Res. CD/ANPD nº 19/2024) mediante cláusulas-padrão contratuais ou mecanismo equivalente.

## 6. Retenção

- Avaliações excluídas: retidas na lixeira por **30 dias** e depois eliminadas definitivamente (incluindo fotos).
- Logs de auditoria e registros de incidentes: **mínimo 5 anos** (Res. CD/ANPD nº 15/2024).
- Dados da conta: mantidos enquanto a conta estiver ativa; eliminados na exclusão da conta.

## 7. Direitos do titular

Nos termos do art. 18 da LGPD, o titular pode solicitar: confirmação e acesso; correção; anonimização, bloqueio ou eliminação; portabilidade; informação sobre compartilhamento; revogação de consentimento (quando aplicável). Pedidos devem ser encaminhados ao **Encarregado (DPO)** pelo canal abaixo e respondidos em até 15 dias.

## 8. Segurança

Criptografia em trânsito (TLS) e em repouso; autenticação por conta com isolamento entre organizações (RLS); armazenamento privado de fotos com URLs de curta duração; remoção de metadados (GPS) das imagens; rate limiting; logs de auditoria; revisão de acessos por papel.

## 9. Incidentes

Eventos que possam acarretar risco ou dano relevante aos titulares serão comunicados à ANPD e aos titulares em até **3 dias úteis** (prazo dobrado para agentes de pequeno porte), conforme Res. CD/ANPD nº 15/2024 (ver `runbook-incidentes.md`).

## 10. Contato

Encarregado de Dados: [nome a definir] · [e-mail] · [telefone]. Canal para pedidos de titulares: [URL].

---

*Documento de rascunho — sujeito a revisão jurídica e publicação oficial.*