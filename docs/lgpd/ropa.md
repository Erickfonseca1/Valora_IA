# ROPA — Registro das Operações de Tratamento (rascunho)

> Registro das atividades de tratamento (art. 37 da LGPD) da plataforma AVALIA. Rascunho para revisão jurídica; manter atualizado.

## 1. Operações de tratamento

| # | Operação | Dados | Finalidade | Base legal | Controlador | Operador | Retenção | Compartilhamento |
|---|---|---|---|---|---|---|---|---|
| 1 | Conta e autenticação | nome, e-mail, CRECI/CNAI | Identificação do usuário | Execução de contrato (art. 7º, V) | Corretor/imobiliária | AVALIA | Enquanto a conta estiver ativa | Supabase Auth |
| 2 | Cadastro de avaliação | endereço, características do imóvel | Cálculo do estudo | Execução de contrato / legítimo interesse (arts. 7º, V e IX) | Corretor/imobiliária | AVALIA | 30 dias na lixeira após exclusão; depois eliminação | — |
| 3 | Fotos do imóvel | imagens (sem metadados) | Documentação fotográfica e análise IA | Execução de contrato + autorização do titular | Corretor/imobiliária | AVALIA | 30 dias na lixeira; depois eliminação | Google Gemini (análise) |
| 4 | Comparáveis de mercado | anúncios públicos (VivaReal etc.) | Base estatística de mercado | Legítimo interesse (art. 7º, IX) | AVALIA | AVALIA | Enquanto úteis ao mercado | Apify, portais públicos |
| 5 | Segurança e auditoria | IP, user-agent, ações | Prevenção de abuso e accountability | Legítimo interesse (arts. 7º, IX e 10) | AVALIA | AVALIA | Mín. 5 anos | — |
| 6 | Suporte | mensagens e registros de atendimento | Atendimento ao usuário | Execução de contrato | Corretor/imobiliária | AVALIA | Conforme política interna | — |

## 2. Fluxos

- **Entrada:** cadastro do usuário → org solo automática; imobiliária convida membros.
- **Tratamento:** estudo → geocodificação → comparáveis → ensemble → persistência → laudo/PDF.
- **Compartilhamento:** apenas subprocessadores contratados (Supabase, Google, Apify).
- **Eliminação:** exclusão de conta (perfil, memberships, avaliações, fotos); lixeira 30 dias; hard delete com remoção de objetos do storage.

## 3. Encarregado (DPO)

[nome] · [e-mail] · [telefone] · nomeado em [data].

## 4. RIPD (avaliação de impacto)

Recomendada para: tratamento em larga escala de avaliações e dados de proprietários; uso de IA (Gemini). Documentar: fluxos de dados, riscos aos titulares, medidas de mitigação. A ser formalizada antes de operações enterprise/bancárias.

## 5. Transferências internacionais

- Supabase (EUA), Google Gemini (EUA), Apify (EUA).
- Mecanismo: cláusulas-padrão contratuais ANPD (Res. CD/ANPD nº 19/2024) — **prazo de incorporação expirado em 23/08/2025; regularizar contratos imediatamente** (Google disponibiliza SCCs em cloud.google.com/sccs/br-c2p).
- Checklist de regularização: anexar SCCs aos contratos; publicar informação sobre transferências na Política de Privacidade; disponibilizar íntegra das cláusulas ao titular sob pedido (15 dias).

## 6. Mitigações técnicas aplicadas

RLS multi-tenant · storage privado + URLs de curta duração · stripping de EXIF · rate limiting · logs de auditoria (5 anos) · headers de segurança · segredos apenas server-side.