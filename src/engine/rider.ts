import {
  ARM_EFFECTIVE_FACTOR,
  HIP_OFFSET,
  MIN_TORSO_ANGLE_BY_FLEXIBILITY,
} from './constants'
import { PROFILES } from './profiles'
import type { BodyData, Goal, Point } from './types'

const rad = (deg: number) => (deg * Math.PI) / 180

export interface RiderPose {
  hip: Point
  shoulder: Point
  hands: Point
  torsoAngle: number
  flexibilityLimited: boolean
}

export function riderPose(body: BodyData, goal: Goal, saddle: Point): RiderPose {
  const [lo, hi] = PROFILES[goal].torsoAngle
  const wanted = (lo + hi) / 2
  const minAllowed = MIN_TORSO_ANGLE_BY_FLEXIBILITY[body.flexibility]
  const torsoAngle = Math.max(wanted, minAllowed)

  const hip = { x: saddle.x + HIP_OFFSET.x, y: saddle.y + HIP_OFFSET.y }
  const a = rad(torsoAngle)
  const shoulder = { x: hip.x + body.torso * Math.cos(a), y: hip.y + body.torso * Math.sin(a) }

  // arm direction: angle between shoulder->hip and shoulder->hand is the shoulder angle
  const armDir = rad(torsoAngle + PROFILES[goal].shoulderAngle - 180)
  const reach = body.arm * ARM_EFFECTIVE_FACTOR
  const hands = {
    x: shoulder.x + reach * Math.cos(armDir),
    y: shoulder.y + reach * Math.sin(armDir),
  }
  return { hip, shoulder, hands, torsoAngle, flexibilityLimited: torsoAngle > wanted }
}
