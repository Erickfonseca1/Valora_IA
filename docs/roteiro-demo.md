# Roteiro de Demonstração — AVALIA

> Script de 10 minutos para apresentar a plataforma a um sócio/parceiro.
> Pré-requisito: `npx tsx scripts/seed-demo.ts` (no `ValoraIA_back`) e migrações 018–024 aplicadas.

## 1. Entrar e apresentar (2 min)

- **Login:** `demo@avalia.demo` / `Demo1234!` (vai para o Painel como DONO da "Demo Imobiliária")
- Mostre: **Painel** (estudos no mês, confiança média, temperatura do mercado) e o seletor de organização no rodapé

## 2. Nova Avaliação (3 min)

- **Nova Avaliação →** preencha um endereço real de bairro com prior (ex.: Manaíra, João Pessoa)
- Mostre: entrada assistida (IA), tipo de imóvel (apartamento/casa/comercial — **terreno marcado "breve"**), conservação e a etapa de fotos com **"Pular etapa (fotos opcionais)"** e o aviso de privacidade
- Gere a avaliação → **resultado em segundos** com valor indicativo, faixa e confiança

## 3. Laudo/Estudo (3 min — o coração)

- **Valor Central de Referência** + **"Como o valor foi formado (A → B → resultado)"** com a régua visual
- **02b/02c**: toque para abrir "Base Comparável Homogeneizada" e "Referência do Bairro" (colapsáveis)
- **02d — Enquadramento NBR 14653-2**: grau alcançado (I/II/III) + precisão do IC 80%
- **Avaliador identificado na ficha** (nome + CRECI/CNAI) e **logo da organização** no cabeçalho
- **Baixar PDF** → mesmo layout, com mapa, fotos (se houver) e rodapé auditável

## 4. Multi-usuário (2 min)

- **Configurações → Membros**: papéis (Dono/Admin/Avaliador), convite por token (e-mail em breve)
- **Troque de conta** → `bruno.demo@avalia.demo` / `Demo1234!`: o avaliador vê **apenas as próprias** avaliações; o dono/admin veem todas
- **Relatórios**: busca por endereço, paginação, **lixeira** (excluir → restaurar)

## 5. Segurança e produto (1 min)

- Fotos em **bucket privado** (URLs de curta duração), GPS/EXIF removidos no upload, logs de auditoria, RLS por organização
- Landing: seção **Planos e Preços** (Free 2/mês · Solo Pro R$ 129 · Imobiliária R$ 279 · Imobiliária+ R$ 549 · créditos R$ 29,90/10) — cobrança Asaas entra na próxima fase

---

### Contas demo

| Papel | E-mail | Senha |
|---|---|---|
| Dono (imobiliária) | demo@avalia.demo | Demo1234! |
| Administrador | ana.demo@avalia.demo | Demo1234! |
| Avaliador | bruno.demo@avalia.demo | Demo1234! |

> O seed é idempotente: rodar de novo não duplica organizações/avaliações.
