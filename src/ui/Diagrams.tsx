import { handPosition, stemClampPoint } from '../engine/cockpit'
import { saddlePoint } from '../engine/saddle'
import { PROFILES } from '../engine/profiles'
import type { FitInput, FitResult, Goal, Point } from '../engine/types'
import { useT } from '../i18n'
import type { FieldKey } from './form'

const rad = (d: number) => (d * Math.PI) / 180

/** Front view of a rider with the measured segment highlighted. */
export function BodyDiagram({ active }: { active?: FieldKey }) {
  const on = (k: FieldKey) => (active === k ? 'seg on' : 'seg')
  return (
    <svg className="diagram body-diagram" viewBox="0 0 170 260" role="img" aria-hidden="true">
      <line className="floor" x1="10" y1="245" x2="160" y2="245" />
      <circle className="seg" cx="80" cy="28" r="14" />
      <line className="seg" x1="80" y1="42" x2="80" y2="62" />
      <line className={on('shoulderWidth')} x1="46" y1="62" x2="114" y2="62" />
      <line className={on('torso')} x1="46" y1="62" x2="56" y2="128" />
      <line className="seg" x1="114" y1="62" x2="104" y2="128" />
      <line className="seg" x1="56" y1="128" x2="104" y2="128" />
      <line className={on('arm')} x1="114" y1="62" x2="132" y2="150" />
      <circle className={on('arm')} cx="133" cy="154" r="5" />
      <line className="seg" x1="46" y1="62" x2="30" y2="146" />
      <line className="seg" x1="56" y1="128" x2="58" y2="245" />
      <line className="seg" x1="104" y1="128" x2="102" y2="245" />
      {active === 'height' && <Dim x1={152} y1={245} x2={152} y2={14} />}
      {active === 'inseam' && <Dim x1={80} y1={138} x2={80} y2={245} />}
      {active === 'inseam' && <line className="seg on" x1="56" y1="138" x2="104" y2="138" />}
      {(active === 'torso' || active === 'shoulderWidth' || active === 'arm') && (
        <>
          <circle className="pt" cx={active === 'torso' ? 56 : 46} cy={active === 'torso' ? 128 : 62} r="4" />
          <circle className="pt" cx={active === 'torso' ? 46 : active === 'arm' ? 114 : 114} cy={62} r="4" />
        </>
      )}
    </svg>
  )
}

function Dim({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const horiz = y1 === y2
  return (
    <g className="dim">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {horiz ? (
        <>
          <line x1={x1} y1={y1 - 5} x2={x1} y2={y1 + 5} />
          <line x1={x2} y1={y2 - 5} x2={x2} y2={y2 + 5} />
        </>
      ) : (
        <>
          <line x1={x1 - 5} y1={y1} x2={x1 + 5} y2={y1} />
          <line x1={x2 - 5} y1={y2} x2={x2 + 5} y2={y2} />
        </>
      )}
    </g>
  )
}

/** Frame side view with the geometry numbers highlighted. */
export function FrameDiagram({ active }: { active?: FieldKey }) {
  const k = 0.27
  const bb = { x: 110, y: 165 }
  const head = { x: bb.x + 385 * k, y: bb.y - 560 * k }
  const seatTop = { x: bb.x - 520 * k * Math.cos(rad(73.5)), y: bb.y - 520 * k * Math.sin(rad(73.5)) }
  const headBot = { x: head.x + 150 * k * Math.cos(rad(73)), y: head.y + 150 * k * Math.sin(rad(73)) }
  const hub = { x: headBot.x + 20, y: bb.y - 10 }
  const rear = { x: bb.x - 110, y: bb.y - 10 }
  const p = (a: Point) => `${a.x},${a.y}`
  const cls = (...ks: FieldKey[]) => (active && ks.includes(active) ? 'seg on' : 'seg')
  return (
    <svg className="diagram frame-diagram" viewBox="0 0 250 185" role="img" aria-hidden="true">
      <line className="floor" x1="6" y1="175" x2="244" y2="175" />
      <polyline className="seg" fill="none" points={[rear, bb, headBot, hub].map(p).join(' ')} />
      <polyline className="seg" fill="none" points={[bb, seatTop, head, headBot].map(p).join(' ')} />
      <line className="seg" x1={rear.x} y1={rear.y} x2={seatTop.x} y2={seatTop.y} />
      <line className={cls('hta')} x1={head.x} y1={head.y} x2={headBot.x} y2={headBot.y} />
      <line className={cls('sta')} x1={bb.x} y1={bb.y} x2={seatTop.x} y2={seatTop.y} />
      <circle className="pt" cx={bb.x} cy={bb.y} r="3.5" />
      <circle className="pt" cx={head.x} cy={head.y} r="3.5" />
      {(active === 'stack' || active === 'reach') && (
        <g className="dim">
          {active === 'stack' && <line x1={head.x} y1={head.y} x2={head.x} y2={bb.y} />}
          {active === 'reach' && <line x1={bb.x} y1={bb.y + 8} x2={head.x} y2={bb.y + 8} />}
          {active === 'reach' && <line x1={head.x} y1={head.y} x2={head.x} y2={bb.y + 8} strokeDasharray="3 3" />}
        </g>
      )}
    </svg>
  )
}

const SIDE = { minX: -790, w: 1730, minY: -1260, h: 1560 }

/** Side view of bike + rider; overlays the user's current setup when given. */
export function ResultDiagram({
  input,
  result,
  compact = false,
}: {
  input: FitInput
  result: FitResult
  /** hero use: no legend, line-draw animation */
  compact?: boolean
}) {
  const t = useT()
  const { frame, current } = input
  const g = result.geometry
  const s = (a: Point) => `${a.x},${-a.y}`
  const line = (pts: Point[]) => pts.map(s).join(' ')

  const sta = rad(frame.sta)
  const hta = rad(frame.hta)
  const onFrame = { x: -result.saddleHeight * Math.cos(sta), y: result.saddleHeight * Math.sin(sta) }
  const headBot = { x: g.headTop.x + 150 * Math.cos(hta), y: g.headTop.y - 150 * Math.sin(hta) }
  const hubF = {
    x: headBot.x + 370 * Math.cos(hta) + 45 * Math.sin(hta),
    y: headBot.y - 370 * Math.sin(hta) + 45 * Math.cos(hta),
  }
  const hubR = { x: -415, y: 70 }
  const seatTop = { x: -560 * Math.cos(sta), y: 560 * Math.sin(sta) }
  const head = { x: g.shoulder.x + 55, y: g.shoulder.y + 105 }
  const pedal = { x: 0, y: -(current?.crankLength ?? 172.5) }

  const ghostStem =
    current?.stemLength !== undefined && current.stemAngle !== undefined && current.spacers !== undefined
      ? {
          stemLength: current.stemLength,
          stemAngle: current.stemAngle,
          spacers: current.spacers,
        }
      : null
  const ghostClamp = ghostStem ? stemClampPoint(frame, ghostStem) : null
  const ghostHands = ghostStem ? handPosition(frame, ghostStem, current?.barReach) : null
  const ghostSaddle = current?.saddleHeight !== undefined ? saddlePoint(current.saddleHeight, frame.sta) : null

  return (
    <figure className={`result-diagram ${compact ? 'compact' : ''}`}>
      <svg
        viewBox={`${SIDE.minX} ${SIDE.minY} ${SIDE.w} ${SIDE.h}`}
        role="img"
        aria-label={t('diagram.title')}
      >
        <line className="floor" x1={-790} y1={270} x2={940} y2={270} />
        <circle className="wheel" cx={hubR.x} cy={-hubR.y} r={340} />
        <circle className="wheel" cx={hubF.x} cy={-hubF.y} r={340} />
        <g className="bike">
          <polyline pathLength={1} points={line([hubR, { x: 0, y: 0 }, headBot, hubF])} />
          <polyline pathLength={1} points={line([{ x: 0, y: 0 }, seatTop, g.headTop, headBot])} />
          <line x1={hubR.x} y1={-hubR.y} x2={seatTop.x} y2={-seatTop.y} />
          <line x1={0} y1={0} x2={onFrame.x} y2={-onFrame.y} />
          <polyline points={line([g.headTop, g.stemClamp])} className="stem" />
        </g>
        {ghostSaddle && (
          <line className="ghost" x1={ghostSaddle.x - 100} y1={-ghostSaddle.y} x2={ghostSaddle.x + 80} y2={-ghostSaddle.y} />
        )}
        {ghostClamp && ghostHands && (
          <>
            <polyline className="ghost" points={line([g.headTop, ghostClamp, ghostHands])} fill="none" />
            <circle className="ghost-dot" cx={ghostHands.x} cy={-ghostHands.y} r={20} />
          </>
        )}
        <line className="saddle" x1={g.saddle.x - 100} y1={-g.saddle.y} x2={g.saddle.x + 80} y2={-g.saddle.y} />
        <g className="rider">
          <polyline pathLength={1} points={line([pedal, g.hip, g.shoulder, g.hands])} />
          <circle cx={head.x} cy={-head.y} r={55} />
        </g>
        <circle className="target" cx={g.targetHands.x} cy={-g.targetHands.y} r={26} />
        <circle className="hands" cx={g.hands.x} cy={-g.hands.y} r={20} />
      </svg>
      {!compact && (
      <figcaption>
        <span className="lg lg-rec">{t('diagram.legend.rec')}</span>
        {ghostStem || ghostSaddle ? <span className="lg lg-cur">{t('diagram.legend.cur')}</span> : null}
        <span className="lg lg-target">{t('diagram.legend.target')}</span>
      </figcaption>
      )}
    </figure>
  )
}

/** Tiny rider-on-bike drawing whose posture comes from the profile's real torso and shoulder angles. */
export function PostureIcon({ goal }: { goal: Goal }) {
  const p = PROFILES[goal]
  const torso = (p.torsoAngle[0] + p.torsoAngle[1]) / 2
  const a = rad(torso)
  const arm = rad(torso + p.shoulderAngle - 180)
  const hip = { x: 34, y: 40 }
  const shoulder = { x: hip.x + 34 * Math.cos(a), y: hip.y - 34 * Math.sin(a) }
  const hand = { x: shoulder.x + 33 * Math.cos(arm), y: shoulder.y - 33 * Math.sin(arm) }
  const bb = { x: 40, y: 62 }
  return (
    <svg className="posture" viewBox="0 0 130 80" aria-hidden="true">
      <circle className="pw" cx="18" cy="64" r="13" />
      <circle className="pw" cx="108" cy="64" r="13" />
      <polyline className="pf" points={`18,64 ${bb.x},${bb.y} 88,36 32,34 ${bb.x},${bb.y}`} />
      <polyline className="pf" points="88,36 108,64" />
      <polyline className="pr" points={`${bb.x},${bb.y + 8} ${hip.x},${hip.y} ${shoulder.x},${shoulder.y} ${hand.x},${hand.y}`} />
      <circle className="ph" cx={shoulder.x + 8} cy={shoulder.y - 8} r="6" />
    </svg>
  )
}
