import type { Point } from './types'

/**
 * Two-bone joint (knee or elbow) in a plane. Given the root and the end point and the two bone
 * lengths, returns the joint position. `side` picks which way the joint bends: +1 bends toward
 * the left-hand normal of root→end, -1 toward the right-hand normal. If the end point is out of
 * reach the limb is stretched straight toward it.
 */
export function twoBoneJoint(root: Point, end: Point, l1: number, l2: number, side: 1 | -1 = 1): Point {
  const dx = end.x - root.x
  const dy = end.y - root.y
  const d = Math.hypot(dx, dy)
  if (d < 1e-6) return { x: root.x, y: root.y + l1 }
  const reach = Math.min(d, l1 + l2 - 1e-6)
  const along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach)
  const off = Math.sqrt(Math.max(l1 * l1 - along * along, 0))
  const ux = dx / d
  const uy = dy / d
  return {
    x: root.x + ux * along + -uy * off * side,
    y: root.y + uy * along + ux * off * side,
  }
}

/** Pedal position for a crank angle (0° = crank pointing forward, 90° = up, -90° = down). */
export function pedalPosition(crank: number, angleDeg: number): Point {
  const a = (angleDeg * Math.PI) / 180
  return { x: crank * Math.cos(a), y: crank * Math.sin(a) }
}
