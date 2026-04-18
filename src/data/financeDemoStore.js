import { demoFinanceApprovals, demoFinanceBudgetLines } from './financeDemo'

const BUDGET_KEY = 'casi360.finance.demo.budget-lines'
const APPROVALS_KEY = 'casi360.finance.demo.approvals'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function loadFromStorage(key, fallback) {
  if (!canUseStorage()) return clone(fallback)
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return clone(fallback)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return clone(fallback)
    return parsed
  } catch {
    return clone(fallback)
  }
}

function saveToStorage(key, value) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write errors in demo mode.
  }
}

export function makeDemoId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function getDemoBudgetLines() {
  return loadFromStorage(BUDGET_KEY, demoFinanceBudgetLines)
}

export function setDemoBudgetLines(items) {
  saveToStorage(BUDGET_KEY, items)
}

export function getDemoApprovals() {
  return loadFromStorage(APPROVALS_KEY, demoFinanceApprovals)
}

export function setDemoApprovals(items) {
  saveToStorage(APPROVALS_KEY, items)
}

export function resetFinanceDemoData() {
  if (canUseStorage()) {
    window.localStorage.removeItem(BUDGET_KEY)
    window.localStorage.removeItem(APPROVALS_KEY)
  }
}
