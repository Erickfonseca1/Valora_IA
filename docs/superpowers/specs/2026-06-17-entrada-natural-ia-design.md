# Design — Entrada natural por IA (áudio/texto → ValuationFlow)

**Data:** 2026-06-17
**Status:** Aprovado (design)
**Escopo:** Primeira iteração de interação natural por IA no ValoraIA.

## Objetivo

Tornar o preenchimento de uma avaliação mais human-friendly: o corretor descreve o
imóvel por **áudio** ou **texto corrido**; a IA extrai os campos do formulário e
pré-preenche o wizard `ValuationFlow` existente. Após a extração, um **card gerado
por IA** mostra um resumo narrativo, os campos preenchidos (com confiança) e as
lacunas — transmitindo a sensação de "interação autônoma".

A entrada natural é **opcional**: nunca bloqueia o fluxo manual atual.

## Decisões de produto

- **Foco:** entrada natural (áudio/texto → form). Saída visual gerada por IA fica para iterações futuras.
- **Integração:** pré-preenche o wizard existente (novo passo 0). Reaproveita UI e validações atuais; menor risco.
- **Áudio:** Gemini multimodal direto (transcreve + extrai numa só chamada). Reaproveita `GEMINI_API_KEY` já configurada.
- **Card:** resumo narrativo + campos extraídos (badge de confiança) + lacunas obrigatórias.
- **Precedência de conflito:** **áudio vence**. Quando a análise de fotos (passo 2) sugere `conservation_state`/amenidades, não sobrescreve o que o áudio/texto já afirmou. Foto só preenche campo vazio. Edição manual vence tudo.

## Arquitetura

```
[IntakeStep (passo 0)]  --audio blob | text-->  POST /api/extract-property
        |                                              |
        |                                     [property-extractor.ts]
        |                                       Gemini multimodal
        |                                       (responseSchema)
        |                                              |
        v                                              v
[ExtractionCard] <----- ExtractionResult { summary, fields, amenities, gaps }
        |
   "Usar e revisar" -> mergeExtraction(form, result) -> ValuationForm state
        |
   avança pro passo 1 (wizard pré-preenchido)
```

Princípios: módulos isolados, uma responsabilidade, testáveis em separado. Espelha o
padrão existente `analyze-photos` / `photo-analyzer.ts`.

---

## Seção 1 — Backend: rota de extração

**Novo arquivo:** `ValoraIA_back/src/app/api/extract-property/route.ts`

`POST` aceita dois modos via `Content-Type`:
- `multipart/form-data` com campo `audio` (blob webm/opus do navegador)
- `application/json` com `{ text: string }`

Comportamento:
- Áudio: lê bytes, passa **inline** pro Gemini (`inlineData`, base64). **Não persiste** em Storage (efêmero, privacidade).
- Texto: passa direto.
- Resposta envelopada padrão: `{ success, data: ExtractionResult }` ou `{ success:false, error }`.

**Novo módulo:** `ValoraIA_back/src/lib/ai/property-extractor.ts` — isola a lógica
Gemini (espelha `photo-analyzer.ts`). A rota só faz parse/validação/envelope.

**Tipos** (em `src/types/index.ts`, espelhados em `front/src/types/index.ts`):

```ts
interface ExtractedField<T> { value: T | null; confidence: number } // 0..1

interface ExtractionResult {
  summary: string                    // resumo narrativo PT-BR
  fields: {
    address?: ExtractedField<string>
    property_type?: ExtractedField<PropertyType>
    area_m2?: ExtractedField<number>
    bedrooms?: ExtractedField<number>
    bathrooms?: ExtractedField<number>
    parking_spaces?: ExtractedField<number>
    construction_age?: ExtractedField<number>
    conservation_state?: ExtractedField<ConservationState>
    terrain_slope?: ExtractedField<TerrainSlope>
    street_level?: ExtractedField<StreetLevel>
    is_corner?: ExtractedField<boolean>
    in_gated_community?: ExtractedField<boolean>
  }
  amenities: { item: string; scope: AmenityScope; confidence: number }[]
  gaps: string[]                     // keys de campos obrigatórios faltantes
}
```

Enums (`PropertyType`, `ConservationState`, `TerrainSlope`, `StreetLevel`) reusados —
devem casar com `newschema.sql`. O schema do Gemini os restringe aos valores válidos.

---

## Seção 2 — Schema/prompt Gemini

Em `property-extractor.ts`:

- **Modelo:** `gemini-2.0-flash` (multimodal áudio + texto; rápido/barato). Confirmar
  disponibilidade com a chave atual antes de fechar a implementação.
- **responseSchema:** JSON Schema do Gemini força saída estruturada = `ExtractionResult`.
  Enums declarados como `enum:[...]` com os valores exatos do `newschema.sql` — o modelo
  não pode inventar estado inválido.
- **System prompt (PT-BR, domínio imobiliário):**
  - Papel: assistente que extrai dados de imóvel da fala/texto de um corretor brasileiro.
  - Só preencher campo com evidência explícita; senão `value: null`.
  - `confidence`: menção direta = alta; inferência = baixa.
  - `amenities`: mapear menções ("piscina", "academia", "portaria 24h") aos `item` do
    catálogo. A lista de itens válidos do catálogo é injetada no prompt para ancorar.
  - `gaps`: listar campos **obrigatórios** ausentes (`address`, `property_type`, `area_m2`).
  - `summary`: 1-2 frases naturais do que o corretor descreveu.
- **Amenidades:** reusar `src/lib/amenities/catalog.ts` para montar a lista do prompt
  (fonte única de verdade). O **escopo** (`interno`/`condo`/`proximo`) é resolvido depois
  por `inferScope()` existente — não pelo modelo (evita erro). O modelo só identifica o `item`.
- `confidence` **não** vai pro DB — é só sinal de UI no card.

---

## Seção 3 — Frontend: passo 0 + card

`ValuationFlow` ganha passo 0 antes de "Detalhes do Imóvel". `STEPS` passa a ter 4
itens. Lógica isolada em novos componentes (o `ValuationFlow` já é grande).

**`IntakeStep.tsx` — captura:**
- Botão gravar áudio via `MediaRecorder` (webm/opus). Estados: idle → gravando
  (timer + waveform simples) → processando.
- Alternativa texto: textarea "ou descreva por escrito".
- Botão **"Pular"** → vai direto pro wizard manual (passo 1). Entrada natural é opcional.
- Ao enviar: chama `extractProperty(audioBlob | text)` em `api.ts`; mostra skeleton
  (reusa padrão `SkeletonStep` existente).

**`ExtractionCard.tsx` — resultado:**
- **Resumo:** parágrafo narrativo (`summary`) no topo.
- **Campos extraídos:** lista com label PT-BR, valor e badge de confiança
  (alta=verde / média=âmbar / baixa=cinza). Cores do tema (`PRIMARY #1E3A8A`, `ACCENT #10B981`).
- **Lacunas** (`gaps`): bloco âmbar destacado ("Faltou informar: Endereço, Área").
- Amenidades detectadas: chips.
- Ações: **"Usar e revisar"** (merge no form, avança pro passo 1 já preenchido) e **"Regravar"**.

---

## Seção 4 — Merge/precedência no form state

`ValuationForm` (estado em `ValuationFlow`) é a fonte única. Merge centralizado em
helper puro `mergeExtraction(form, result)` — testável isolado.

Regras:
- Extração escreve em campo vazio; sobrescreve conforme precedência.
- Áudio/texto roda no passo 0 (antes das fotos no passo 2) → é o primeiro a preencher.
- **Áudio vence:** quando fotos analisam depois, `conservation_state` e amenidades vindos
  do áudio **não** são sobrescritos. Foto só preenche o que está vazio.
- Origem por campo: `fieldSource: Partial<Record<keyof ValuationForm, 'audio'|'photo'|'manual'>>`
  no estado. O merge de `analyzePhotos` (já existente) passa a checar `fieldSource`: se
  campo já é `'audio'` ou `'manual'`, não toca.
- Edição manual sempre vence → marca `'manual'`.
- `confidence` **não** entra no form (só alimentou o card).
- Numéricos: form usa strings nos inputs; helper converte.
- Amenidades: `item` do extractor + `inferScope(item, propertyType, in_gated_community)`
  → `AmenitySelection`. Dedup contra existentes.

---

## Seção 5 — Erros + testes

**Backend:**
- Sem `GEMINI_API_KEY` → 500 envelopado, mensagem clara.
- Áudio > limite (~15 MB / ~10 min) → 413 antes de chamar Gemini.
- JSON/multipart inválido → 400. Schema Gemini falha/parse → 422 "não consegui extrair".
- Gemini timeout/erro upstream → 502.

**Frontend:**
- Permissão de microfone negada → fallback pro textarea, aviso amigável.
- Falha de rede → card de erro com retry; botão "Pular" sempre disponível.

**Testes:**
- Back `property-extractor.ts` (vitest, `__tests__`): mock Gemini → parse, enums
  restritos, gaps calculados, amenidade mapeada ao catálogo.
- Back rota: modo texto e modo áudio (multipart), envelopes de erro.
- Front `mergeExtraction` (puro): precedência áudio>foto, manual>tudo, conversão
  numérica, dedup de amenidades.
- Front `IntakeStep`/`ExtractionCard` (testing-library): render do card, botão Pular,
  fallback de microfone.

## Fora de escopo (YAGNI)

Persistir áudio, histórico de transcrições, multi-idioma, streaming de transcrição ao
vivo, modo conversacional, saída visual gerada por IA (cards de insight no laudo).
Ficam para iterações futuras.
