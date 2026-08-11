/**
 * Drop-in replacements for firebase/firestore's where/orderBy/limit.
 * The Apps Script backend has no query engine (Store.js returns whole
 * collections), so these just describe an in-memory filter/sort/limit that
 * queryDocuments/subscribeToCollection apply after fetching — see
 * apps-script/src/Schema.js's comment on the accepted ceiling for this.
 */

export type WhereOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in'

export type Constraint =
  | { kind: 'where'; field: string; op: WhereOp; value: unknown }
  | { kind: 'orderBy'; field: string; direction: 'asc' | 'desc' }
  | { kind: 'limit'; count: number }

export function where(field: string, op: WhereOp, value: unknown): Constraint {
  return { kind: 'where', field, op, value }
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { kind: 'orderBy', field, direction }
}

export function limit(count: number): Constraint {
  return { kind: 'limit', count }
}

export type Unsubscribe = () => void

function matches(doc: unknown, c: Extract<Constraint, { kind: 'where' }>): boolean {
  const actual = (doc as Record<string, unknown>)[c.field]
  switch (c.op) {
    case '==':
      return actual === c.value
    case '!=':
      return actual !== c.value
    case '<':
      return (actual as number) < (c.value as number)
    case '<=':
      return (actual as number) <= (c.value as number)
    case '>':
      return (actual as number) > (c.value as number)
    case '>=':
      return (actual as number) >= (c.value as number)
    case 'array-contains':
      return Array.isArray(actual) && actual.includes(c.value)
    case 'in':
      return Array.isArray(c.value) && c.value.includes(actual)
  }
}

export function applyConstraints<T>(docs: T[], constraints: Constraint[]): T[] {
  let result = docs
  for (const c of constraints) {
    if (c.kind === 'where') result = result.filter((doc) => matches(doc, c))
  }
  const order = constraints.find((c): c is Extract<Constraint, { kind: 'orderBy' }> => c.kind === 'orderBy')
  if (order) {
    result = [...result].sort((a, b) => {
      const av = (a as Record<string, unknown>)[order.field]
      const bv = (b as Record<string, unknown>)[order.field]
      const cmp = av === bv ? 0 : (av as never) < (bv as never) ? -1 : 1
      return order.direction === 'asc' ? cmp : -cmp
    })
  }
  const lim = constraints.find((c): c is Extract<Constraint, { kind: 'limit' }> => c.kind === 'limit')
  if (lim) result = result.slice(0, lim.count)
  return result
}
