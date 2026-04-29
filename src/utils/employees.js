/**
 * Resolve an employee's display position from the heterogeneous shapes the
 * HR API returns: a flat `position` string, a nested `designation.title`,
 * or a legacy string-form `designation`.
 */
export function employeePosition(emp) {
  return (
    emp?.position ||
    emp?.designation?.title ||
    (typeof emp?.designation === 'string' ? emp.designation : '') ||
    ''
  )
}
