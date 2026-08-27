import type { ValuationRecord } from '../types'

// ─── Enquadramento NBR 14653-2 (método comparativo direto) ────────────────────
// Enquadramento TÉCNICO-INFORMATIVO: aplica uma versão adaptada dos itens da
// Tabela 1 da norma aos dados disponíveis no estudo. A classificação oficial
// e a homologação final permanecem com o responsável técnico (avaliador).

export interface EnquadramentoItem {
  label: string
  met: boolean
  detail: string
}

export interface EnquadramentoResult {
  items: EnquadramentoItem[]
  grau: 1 | 2 | 3 | null
  precisaoPct: number | null
  resumo: string
}

function precisao(record: ValuationRecord): number | null {
  const pct = record.confidence_diagnostics?.confidence_interval_width_pct
  if (pct == null || pct <= 0) return null
  return Math.round(pct * 10) / 10
}

export function enquadrar(record: ValuationRecord): EnquadramentoResult | null {
  const diagnostics = record.confidence_diagnostics
  if (!diagnostics) return null

  const n = diagnostics.effective_sample_size ?? diagnostics.sample_size
  const nDados = n > 0 ? n : record.comparables?.length ?? 0
  const temVenda = (record.comparables ?? []).some((c) => c.status === 'sold')
  const precisaoPct = precisao(record)
  const multiMetodo = (record.method_estimates?.length ?? 0) >= 2
  const icOk = precisaoPct != null && precisaoPct <= 40

  // Pontuação adaptada da Tabela 1 (NBR 14653-2):
  // amostra efetiva, situação dos dados, precisão (IC 80%) e métodos combinados.
  let pontos = 0
  const items: EnquadramentoItem[] = []

  // 1. Amostra efetiva
  let p1 = 0
  if (nDados >= 12) p1 = 2
  else if (nDados >= 7) p1 = 1
  else p1 = 0
  pontos += p1
  items.push({
    label: `Amostra efetiva (${nDados} dados utilizados)`,
    met: p1 >= 1,
    detail: p1 === 2 ? '≥ 12 dados' : p1 === 1 ? '7–11 dados' : 'abaixo de 7 — amostra fraca',
  })

  // 2. Situação dos dados (transações reais vs ofertas)
  const p2 = temVenda ? 1 : 0
  pontos += p2
  items.push({
    label: 'Dados de transação real (venda) na amostra',
    met: p2 === 1,
    detail: temVenda ? 'presença de ao menos 1 dado de venda' : 'somente ofertas (aplicado fator de oferta −10%)',
  })

  // 3. Precisão (intervalo de confiança de 80%)
  let p3 = 0
  if (precisaoPct != null && precisaoPct <= 30) p3 = 2
  else if (precisaoPct != null && precisaoPct <= 40) p3 = 1
  else p3 = 0
  pontos += p3
  items.push({
    label: 'Precisão (IC 80%)',
    met: p3 >= 1,
    detail: precisaoPct != null ? `${precisaoPct.toLocaleString('pt-BR')}% do valor` : 'intervalo não calculado',
  })

  // 4. Robustez do modelo (métodos combinados)
  const p4 = multiMetodo ? 1 : 0
  pontos += p4
  items.push({
    label: 'Modelos estatísticos combinados (ensemble)',
    met: p4 === 1,
    detail: multiMetodo ? '≥ 2 métodos com peso no resultado' : 'um único método predominante',
  })

  let grau: 1 | 2 | 3 | null = null
  if (pontos >= 5 && icOk !== false) grau = 3
  else if (pontos >= 3) grau = 2
  else grau = 1

  const resumo =
    grau === 3
      ? 'Grau III alcançado pelos itens principais da Tabela 1 (amostra robusta, precisão alta e métodos combinados).'
      : grau === 2
        ? 'Grau II nos itens principais — amostra e precisão razoáveis; revisar com o avaliador.'
        : 'Grau I — amostra fraca; recomendado reforçar a pesquisa de mercado antes da conclusão.'

  return { items, grau, precisaoPct, resumo }
}