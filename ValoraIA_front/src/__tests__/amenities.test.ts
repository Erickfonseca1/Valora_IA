import { describe, it, expect } from 'vitest'
import { FRONT_CATALOG, itemsForScope } from '../amenities'

describe('FRONT_CATALOG', () => {
  it('piscina está em interno e condo', () => {
    expect(FRONT_CATALOG.piscina.scopes).toContain('interno')
    expect(FRONT_CATALOG.piscina.scopes).toContain('condo')
  })
  it('itemsForScope("interno") inclui quintal e exclui portaria_24h', () => {
    const ids = itemsForScope('interno').map(i => i.id)
    expect(ids).toContain('quintal')
    expect(ids).not.toContain('portaria_24h')
  })
})
