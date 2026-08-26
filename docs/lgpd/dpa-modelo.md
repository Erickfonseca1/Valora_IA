# Contrato de Processamento de Dados (DPA) — Modelo (rascunho)

> Modelo de DPA entre a AVALIA (**Operadora**) e o corretor/imobiliária (**Controlador**), nos termos do art. 39 da LGPD. Rascunho para revisão jurídica.

## 1. Partes

**Controlador:** [nome da imobiliária/corretor, CNPJ/CPF, endereço] — doravante "Controlador".

**Operadora:** [empresa AVALIA, CNPJ, endereço] — doravante "Operadora".

## 2. Objeto e finalidade

A Operadora processará, em nome do Controlador, os dados pessoais necessários à prestação do serviço de avaliação imobiliária assistida por IA contratado pelo Controlador, conforme Termos de Uso e Política de Privacidade.

## 3. Dados e operações

| Dados | Operações |
|---|---|
| Endereço e características do imóvel | Coleta, armazenamento, cálculo, exibição |
| Fotos do imóvel | Upload, armazenamento, processamento com IA, exibição no estudo |
| Dados da conta do usuário (nome, e-mail, CRECI/CNAI) | Cadastro, autenticação, identificação |
| Logs de acesso e auditoria | Registro, retenção (mín. 5 anos) |

## 4. Obrigações do Controlador

- Garantir base legal para o tratamento, inclusive autorização do titular do imóvel para fotos e dados.
- Informar os titulares sobre o tratamento (aviso de privacidade).
- Responder a solicitações de titulares, com apoio técnico da Operadora.
- Instruir a Operadora por escrito sobre o tratamento.

## 5. Obrigações da Operadora

- Tratar os dados apenas para as finalidades contratadas, sob instruções documentadas.
- Adotar medidas de segurança técnicas e organizacionais (criptografia, controle de acesso, RLS, logs de auditoria, storage privado).
- Notificar o Controlador sobre incidentes de segurança com dados pessoais, sem atraso injustificado.
- Não transferir dados a terceiros fora dos subprocessadores listados na Política de Privacidade (Supabase, Google, Apify), com contratos próprios.
- Permitir auditorias razoáveis do Controlador quanto ao tratamento contratado.

## 6. Subprocessadores

Supabase (hospedagem de banco/storage), Google Gemini (análise de fotos), Apify (comparáveis de mercado). Todos com cláusulas de proteção de dados; transferências internacionais via cláusulas-padrão ANPD.

## 7. Duração e eliminação

- Vigência enquanto durar a relação contratual.
- Na exclusão da conta ou término do contrato, os dados pessoais serão eliminados ou anonimizados, salvo obrigações legais de retenção (ex.: registros de incidentes/auditoria por 5 anos).

## 8. Incidentes

Comunicação ao Controlador e à ANPD/titulares conforme o runbook de incidentes (3 dias úteis; prazo dobrado para pequeno porte).

## 9. Responsabilidade

- O Controlador responde pelo tratamento realizado sob sua direção.
- A Operadora responde quando descumprir obrigações de proteção de dados ou instruções lícitas do Controlador (art. 42, § 1º, da LGPD).

## 10. Foro

Foro [cidade a definir].

---

*Documento de rascunho — sujeito a revisão jurídica e assinatura.*