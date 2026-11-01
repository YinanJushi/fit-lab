// Interactive 3D view of the rider on the recommended bike. Everything is drawn from numbers the
// fit engine already computed (saddle, hip, shoulder, hands, stem, frame), so it matches the side view.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { pedalPosition, twoBoneJoint } from '../engine/ik'
import type { FitInput, FitResult } from '../engine/types'
import { useT } from '../i18n'

const M = 0.001 // mm -> metres
const rad = (d: number) => (d * Math.PI) / 180
const P = (x: number, y: number, z = 0) => new THREE.Vector3(x * M, y * M, z * M)
const UP = new THREE.Vector3(0, 1, 0)

/** A cylinder between two points that can be moved every frame. */
class Limb {
  mesh: THREE.Mesh
  constructor(r: number, mat: THREE.Material) {
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat)
  }
  set(a: THREE.Vector3, b: THREE.Vector3) {
    const d = b.clone().sub(a)
    const len = d.length()
    this.mesh.position.copy(a).addScaledVector(d, 0.5)
    this.mesh.scale.set(1, Math.max(len, 1e-6), 1)
    if (len > 1e-9) this.mesh.quaternion.setFromUnitVectors(UP, d.normalize())
  }
}

const ball = (r: number, mat: THREE.Material, p: THREE.Vector3) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat)
  m.position.copy(p)
  return m
}

const css = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(v || fallback)
}

function buildScene(input: FitInput, result: FitResult) {
  const { frame, body } = input
  const g = result.geometry
  const group = new THREE.Group()
  const ink = new THREE.MeshStandardMaterial({ color: css('--ink', '#14231c'), roughness: 0.55, metalness: 0.2 })
  const grey = new THREE.MeshStandardMaterial({ color: css('--ghost', '#7a8a80'), roughness: 0.6 })
  const brand = new THREE.MeshStandardMaterial({ color: css('--brand', '#0f6b4a'), roughness: 0.5 })
  const accent = new THREE.MeshStandardMaterial({ color: css('--accent', '#c2410c'), roughness: 0.6 })
  const tire = new THREE.MeshStandardMaterial({ color: css('--muted', '#5b6b61'), roughness: 0.9 })

  const fixed = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
    const l = new Limb(r, mat)
    l.set(a, b)
    group.add(l.mesh)
    return l
  }

  // ---- frame geometry (same formulas as the side view) ----
  const sta = rad(frame.sta)
  const hta = rad(frame.hta)
  const bb = { x: 0, y: 0 }
  const headBot = { x: g.headTop.x + 150 * Math.cos(hta), y: g.headTop.y - 150 * Math.sin(hta) }
  const hubF = {
    x: headBot.x + 370 * Math.cos(hta) + 45 * Math.sin(hta),
    y: headBot.y - 370 * Math.sin(hta) + 45 * Math.cos(hta),
  }
  const hubR = { x: -415, y: 70 }
  const seatTop = { x: -560 * Math.cos(sta), y: 560 * Math.sin(sta) }
  const onFrame = { x: -result.saddleHeight * Math.cos(sta), y: result.saddleHeight * Math.sin(sta) }
  const bw = input.body.shoulderWidth // handlebar width is drawn from the recommendation below
  const barW = result.barWidth || bw

  // ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.MeshBasicMaterial({ color: css('--line', '#d9d2c3'), transparent: true, opacity: 0.55 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0.15, (hubR.y - 340) * M - 0.002, 0)
  group.add(ground)

  // wheels
  for (const hub of [hubR, hubF]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.014, 10, 64), tire)
    w.position.copy(P(hub.x, hub.y))
    group.add(w)
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.325, 48),
      new THREE.MeshBasicMaterial({ color: css('--ghost', '#7a8a80'), transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    )
    disc.position.copy(P(hub.x, hub.y))
    group.add(disc)
  }

  // frame tubes
  const tubeR = 0.013
  fixed(P(bb.x, bb.y), P(headBot.x, headBot.y), tubeR + 0.003, ink) // down tube
  fixed(P(bb.x, bb.y), P(seatTop.x, seatTop.y), tubeR, ink) // seat tube
  fixed(P(seatTop.x, seatTop.y), P(g.headTop.x, g.headTop.y), tubeR, ink) // top tube
  fixed(P(g.headTop.x, g.headTop.y), P(headBot.x, headBot.y), tubeR + 0.004, ink) // head tube
  for (const s of [-1, 1]) {
    fixed(P(bb.x, bb.y, s * 38), P(hubR.x, hubR.y, s * 38), 0.009, ink) // chain stay
    fixed(P(seatTop.x, seatTop.y, s * 30), P(hubR.x, hubR.y, s * 38), 0.008, ink) // seat stay
    fixed(P(headBot.x, headBot.y, s * 48), P(hubF.x, hubF.y, s * 48), 0.009, ink) // fork blade
  }
  fixed(P(onFrame.x, onFrame.y), P(g.saddle.x, g.saddle.y), 0.009, grey) // seat post

  // saddle
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.14), ink)
  saddle.position.copy(P(g.saddle.x + 20, g.saddle.y + 22))
  group.add(saddle)

  // cockpit
  const clamp = g.stemClamp
  fixed(P(g.headTop.x, g.headTop.y), P(clamp.x, clamp.y), 0.016, brand) // stem
  fixed(P(clamp.x, clamp.y, -barW / 2), P(clamp.x, clamp.y, barW / 2), 0.012, brand) // bar
  for (const s of [-1, 1]) {
    fixed(P(clamp.x, clamp.y, s * barW / 2), P(g.hands.x + 20, g.hands.y - 20, s * barW / 2), 0.015, brand) // hoods
  }

  // crank and pedals (updated every frame)
  const crank = current(input)
  const cranks = [new Limb(0.011, grey), new Limb(0.011, grey)]
  cranks.forEach((c) => group.add(c.mesh))

  // ---- rider ----
  const hip = g.hip
  const sh = g.shoulder
  const hipHalf = 90
  const shHalf = bw / 2
  const legLen = body.inseam
  const l1 = legLen * 0.5
  const l2 = legLen * 0.5

  const torso = fixed(P(hip.x, hip.y), P(sh.x, sh.y), 0.075, accent)
  group.add(ball(0.09, accent, P(hip.x, hip.y)))
  const chest = ball(0.095, accent, P(sh.x, sh.y))
  chest.scale.set(0.9, 1, 1.5)
  group.add(chest)
  void torso

  const t = P(sh.x - hip.x, sh.y - hip.y).normalize()
  const neck = t.clone().multiplyScalar(0.5).add(new THREE.Vector3(0.25, 0.85, 0)).normalize().multiplyScalar(0.2)
  const headPos = P(sh.x, sh.y).add(neck)
  const head = ball(0.105, accent, headPos)
  head.scale.set(1.15, 1.05, 1)
  group.add(head)
  fixed(P(sh.x, sh.y), headPos, 0.04, accent)

  // arms (static)
  const armTotal = body.arm * 0.92
  for (const s of [-1, 1]) {
    const shoulder = P(sh.x, sh.y, s * shHalf)
    const hand = P(g.hands.x, g.hands.y, s * (barW / 2 - 25))
    group.add(ball(0.05, accent, shoulder))
    const d = hand.clone().sub(shoulder)
    const dist = d.length()
    const half = armTotal * M * 0.5
    const bend = Math.sqrt(Math.max(half * half - (dist / 2) ** 2, 0))
    const dir = d.clone().normalize()
    const out = new THREE.Vector3(0, -0.8, s * 0.6)
    out.addScaledVector(dir, -out.dot(dir)).normalize()
    const elbow = shoulder.clone().addScaledVector(d, 0.5).addScaledVector(out, bend)
    fixed(shoulder, elbow, 0.036, accent)
    fixed(elbow, hand, 0.03, accent)
    group.add(ball(0.04, accent, elbow))
    group.add(ball(0.035, ink, hand))
  }

  // legs (animated)
  const legs = [1, -1].map((s) => ({
    s,
    thigh: new Limb(0.058, accent),
    shin: new Limb(0.042, accent),
    foot: new Limb(0.032, ink),
    knee: ball(0.055, accent, new THREE.Vector3()),
  }))
  legs.forEach((l) => {
    group.add(l.thigh.mesh, l.shin.mesh, l.foot.mesh, l.knee)
    group.add(ball(0.07, accent, P(hip.x, hip.y, l.s * hipHalf)))
  })

  function pose(angleDeg: number) {
    legs.forEach((leg, i) => {
      const a = angleDeg + (i === 0 ? 0 : 180)
      const ped = pedalPosition(crank, a)
      const pedal3 = P(ped.x, ped.y, leg.s * 85)
      cranks[i].set(P(0, 0, leg.s * 85), pedal3)
      const ankle = { x: ped.x - 20, y: ped.y + 85 }
      const knee = twoBoneJoint({ x: hip.x, y: hip.y }, ankle, l1, l2, 1)
      const hipP = P(hip.x, hip.y, leg.s * hipHalf)
      const kneeP = P(knee.x, knee.y, leg.s * 95)
      const ankleP = P(ankle.x, ankle.y, leg.s * 88)
      leg.thigh.set(hipP, kneeP)
      leg.shin.set(kneeP, ankleP)
      leg.knee.position.copy(kneeP)
      leg.foot.set(P(ped.x - 70, ped.y + 35, leg.s * 85), P(ped.x + 120, ped.y + 20, leg.s * 85))
    })
  }
  pose(-90)
  return { group, pose }
}

function current(input: FitInput): number {
  return input.current?.crankLength ?? 172.5
}

export default function Rider3D({ input, result }: { input: FitInput; result: FitResult }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const playing = useRef(true)
  const [isPlaying, setPlaying] = useState(true)
  const [failed, setFailed] = useState(false)
  const resetView = useRef<() => void>(() => {})

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    playing.current = !reduce
    setPlaying(!reduce)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const { group, pose } = buildScene(input, result)
    scene.add(group)
    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(2, 3, 2.5)
    scene.add(sun)

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
    const target = new THREE.Vector3(0.12, 0.52, 0)
    const home = new THREE.Vector3(1.5, 1.0, 2.5)
    camera.position.copy(home)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 1.4
    controls.maxDistance = 6
    controls.maxPolarAngle = Math.PI * 0.52
    controls.update()
    resetView.current = () => {
      camera.position.copy(home)
      controls.target.copy(target)
      controls.update()
    }

    const resize = () => {
      const w = el.clientWidth || 300
      const h = el.clientHeight || 300
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let raf = 0
    let angle = -90
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (playing.current) {
        angle += dt * 200
        pose(angle)
      }
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose?.()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose?.()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [input, result])

  const toggle = () => {
    playing.current = !playing.current
    setPlaying(playing.current)
  }

  if (failed) return <p className="tip">{t('3d.nowebgl')}</p>
  return (
    <div className="rider3d">
      <div className="rider3d-canvas" ref={host} role="img" aria-label={t('3d.title')} />
      <div className="rider3d-bar">
        <span className="muted">{t('3d.hint')}</span>
        <span className="rider3d-btns">
          <button className="chip" onClick={toggle}>{isPlaying ? t('3d.pause') : t('3d.play')}</button>
          <button className="chip" onClick={() => resetView.current()}>{t('3d.reset')}</button>
        </span>
      </div>
    </div>
  )
}
