# Runbook de Incidentes de Segurança (rascunho)

> Baseado na Res. CD/ANPD nº 15/2024 (Regulamento de Comunicação de Incidente de Segurança) e art. 48 da LGPD. Rascunho operacional para revisão jurídica.

## 1. O que é incidente notificável

Incidente que **possa** acarretar risco ou dano relevante aos titulares, quando puder afetar significativamente interesses e direitos fundamentais **e** envolver ao menos um dos critérios:

1. Dados pessoais sensíveis;
2. Dados de crianças, adolescentes ou idosos;
3. Dados financeiros;
4. Dados de autenticação em sistemas;
5. Dados protegidos por sigilo legal, judicial ou profissional;
6. Dados em larga escala.

Em caso de dúvida: **notifique**. A omissão é agravante na dosimetria.

## 2. Passos

### T0 — Contenção (imediatamente)
- Isolar o incidente (revogar credenciais, bloquear acesso, desativar integração).
- Preservar evidências (logs, backups, imagens de instância).
- Registrar data/hora do descobrimento e do conhecimento de que afetou dados pessoais.

### T+ — Avaliação
- Classificar dados afetados e número de titulares.
- Avaliar critérios da Res. 15/2024 (tabela acima).
- Documentar a conclusão (inclusive a decisão de **não** notificar).

### Até 3 dias úteis — Comunicação
- **ANPD:** formulário eletrônico (gov.br/anpd) — comunicação preliminar com as informações disponíveis; não aguardar investigação completa.
- **Titulares:** comunicação direta e individualizada quando identificáveis; senão, divulgação ampla (site, mídias, canais) por no mínimo 3 meses. Declaração de comunicação juntada ao processo em até 3 dias úteis.
- Prazo em **dobro** para agentes de pequeno porte (Res. ANPD nº 2/2022).

### Até 20 dias úteis — Relatório complementar
- Causa raiz, volume final, tipos de dados, linha do tempo, medidas corretivas, impacto.

### Pós-incidente
- Registro interno (mesmo para incidentes não comunicados) por **mínimo 5 anos**.
- Análise de causa raiz e medidas preventivas.
- Revisão do plano de resposta e treinamento.

## 3. O que a comunicação deve conter (mínimo)

- Data e hora do descobrimento;
- Descrição da natureza do incidente;
- Causa provável;
- Sistemas e ambientes afetados;
- Medidas de contenção imediatas;
- Medidas preventivas adotadas;
- Situação da comunicação aos titulares (ou motivo para não fazê-la).

## 4. Contatos

- Encarregado (DPO): [nome/e-mail/telefone]
- ANPD: formulário em gov.br/anpd
- Suporte técnico: [e-mail 24x7]

## 5. Documentos relacionados

- ROPA (registro das operações de tratamento) — `ropa.md`
- Política de Privacidade — `politica-de-privacidade.md`
- DPA com clientes — `dpa-modelo.md`