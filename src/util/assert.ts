export function assert(
  cond: unknown,
  reason = "Assertion failure"
): asserts cond {
  if (!cond) throw new Error(reason);
}
