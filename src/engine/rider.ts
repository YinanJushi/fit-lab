import {
  ADAPT_MIN_TORSO,
  ADAPT_SHOULDER_ANGLE,
  ARM_EFFECTIVE_FACTOR,
  HIP_OFFSET,
  MIN_TORSO_ANGLE_BY_FLEXIBILITY,
} from './constants'
import { PROFILES } from './profiles'
import type { Adaptations, BodyData, Goal, Point } from './types'

const rad = (deg: number) => (deg * Math.PI) / 180

export interface RiderPose {
  hip: Point
  shoulder: Point
  hands: Point
  torsoAngle: number
  flexibilityLimited: boolean
  /** torso was raised further because of an adaptation */
  adaptRaised: boolean
}

export function riderPose(body: BodyData, goal: Goal, saddle: Point, adapt?: Adaptations): RiderPose {
  const [lo, hi] = PROFILES[goal].torsoAngle
  const wanted = (lo + hi) / 2
  const minAllowed = MIN_TORSO_ANGLE_BY_FLEXIBILITY[body.flexibility]
  const afterFlex = Math.max(wanted, minAllowed)
  const upright = !!(adapt?.uprightBack || adapt?.reducedUpperLimb || adapt?.limitedFlexion)
  const torsoAngle = upright ? Math.max(afterFlex, ADAPT_MIN_TORSO) : afterFlex
  const shoulderAngle = adapt?.reducedUpperLimb
    ? Math.min(PROFILES[goal].shoulderAngle, ADAPT_SHOULDER_ANGLE)
    : PROFILES[goal].shoulderAngle

  const hip = { x: saddle.x + HIP_OFFSET.x, y: saddle.y + HIP_OFFSET.y }
  const a = rad(torsoAngle)
  const shoulder = { x: hip.x + body.torso * Math.cos(a), y: hip.y + body.torso * Math.sin(a) }

  // arm direction: angle between shoulder->hip and shoulder->hand is the shoulder angle
  const armDir = rad(torsoAngle + shoulderAngle - 180)
  const reach = body.arm * ARM_EFFECTIVE_FACTOR
  const hands = {
    x: shoulder.x + reach * Math.cos(armDir),
    y: shoulder.y + reach * Math.sin(armDir),
  }
  return { hip, shoulder, hands, torsoAngle, flexibilityLimited: afterFlex > wanted, adaptRaised: torsoAngle > afterFlex }
}
