// Estimates body measurements from one photo. Pose detection (MediaPipe) runs entirely in the
// browser: the picture is never uploaded or stored.
import { useEffect, useRef, useState } from 'react'
import { LM, measurementsFromPose, type PoseMeasurements, type PoseProblem } from '../engine/bodyFromPose'
import { useUnits } from './units'
import { useT, type Key } from '../i18n'

type Phase = 'intro' | 'camera' | 'countdown' | 'working' | 'result' | 'error'

interface Props {
  heightMm: number
  onApply: (m: PoseMeasurements) => void
  onClose: () => void
}

type Landmarker = { detect: (img: HTMLCanvasElement) => { landmarks: { x: number; y: number; visibility?: number }[][] }; close: () => void }
let landmarkerPromise: Promise<Landmarker> | null = null

function loadLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision')
      const base = new URL(import.meta.env.BASE_URL, location.href).href
      const fileset = await vision.FilesetResolver.forVisionTasks(`${base}mediapipe`)
      const make = (delegate: 'GPU' | 'CPU') =>
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${base}models/pose_landmarker_full.task`, delegate },
          runningMode: 'IMAGE',
          numPoses: 1,
        })
      try {
        return (await make('GPU')) as unknown as Landmarker
      } catch {
        return (await make('CPU')) as unknown as Landmarker
      }
    })().catch((e) => {
      landmarkerPromise = null
      throw e
    })
  }
  return landmarkerPromise
}

const BONES: [number, number][] = [
  [LM.lShoulder, LM.rShoulder], [LM.lShoulder, LM.lElbow], [LM.lElbow, LM.lWrist],
  [LM.rShoulder, LM.rElbow], [LM.rElbow, LM.rWrist], [LM.lShoulder, LM.lHip],
  [LM.rShoulder, LM.rHip], [LM.lHip, LM.rHip], [LM.lHip, 25], [LM.rHip, 26],
  [25, LM.lAnkle], [26, LM.rAnkle], [LM.lAnkle, LM.lHeel], [LM.rAnkle, LM.rHeel],
]

export default function CameraMeasure({ heightMm, onApply, onClose }: Props) {
  const t = useT()
  const u = useUnits()
  const [phase, setPhase] = useState<Phase>('intro')
  const [err, setErr] = useState<Key | null>(null)
  const [count, setCount] = useState(5)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [result, setResult] = useState<{ m: PoseMeasurements | null; problems: PoseProblem[] } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const shot = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)

  const stopCamera = () => {
    stream.current?.getTracks().forEach((tr) => tr.stop())
    stream.current = null
    if (timer.current) window.clearInterval(timer.current)
  }
  useEffect(() => () => stopCamera(), [])
  // start loading the model while the user reads the instructions
  useEffect(() => {
    loadLandmarker().catch(() => {})
  }, [])

  const fail = (k: Key) => {
    stopCamera()
    setErr(k)
    setPhase('error')
  }

  const startCamera = async (mode = facing) => {
    stopCamera()
    if (!navigator.mediaDevices?.getUserMedia) return fail('cam.error.nocamera')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      stream.current = s
      setPhase('camera')
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s
          void video.current.play()
        }
      })
    } catch {
      fail('cam.error.denied')
    }
  }

  const analyse = async () => {
    const c = shot.current
    if (!c) return
    setPhase('working')
    try {
      const lm = await loadLandmarker()
      const out = lm.detect(c)
      const pts = out.landmarks[0]
      if (!pts) {
        setResult({ m: null, problems: ['not_full_body'] })
      } else {
        const r = measurementsFromPose(pts, { width: c.width, height: c.height }, heightMm)
        drawSkeleton(c, pts)
        setResult({ m: r.measurements, problems: r.problems })
      }
      setPhase('result')
    } catch {
      fail('cam.error.load')
    }
  }

  const takePhoto = () => {
    const v = video.current
    const c = shot.current
    if (!v || !c || !v.videoWidth) return
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    stopCamera()
    void analyse()
  }

  const countdown = () => {
    setPhase('countdown')
    let n = 5
    setCount(n)
    timer.current = window.setInterval(() => {
      n -= 1
      setCount(n)
      if (n <= 0) {
        if (timer.current) window.clearInterval(timer.current)
        takePhoto()
      }
    }, 1000)
  }

  const fromFile = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = shot.current
      if (!c) return
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
      c.width = Math.round(img.naturalWidth * scale)
      c.height = Math.round(img.naturalHeight * scale)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      stopCamera()
      void analyse()
    }
    img.onerror = () => fail('cam.error.load')
    img.src = url
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  const m = result?.m
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('cam.title')}>
      <div className="modal-card">
        <header>
          <h2>{t('cam.title')}</h2>
          <button className="ghost-btn" onClick={close}>{t('cam.close')}</button>
        </header>

        {phase === 'intro' && (
          <div className="cam-body">
            <ol className="cam-steps">
              <li>{t('cam.step1')}</li>
              <li>{t('cam.step2')}</li>
              <li>{t('cam.step3')}</li>
            </ol>
            <p className="tip">{t('cam.privacy')}</p>
            <button className="primary" onClick={() => startCamera()}>{t('cam.start')}</button>
            <label className="secondary file-btn">
              {t('cam.upload')}
              <input type="file" accept="image/*" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
            </label>
          </div>
        )}

        {(phase === 'camera' || phase === 'countdown') && (
          <div className="cam-body">
            <div className="cam-view">
              <video ref={video} playsInline muted className={facing === 'user' ? 'mirror' : ''} />
              <div className="cam-guide" aria-hidden="true" />
              {phase === 'countdown' && <div className="cam-count">{count > 0 ? count : '•'}</div>}
            </div>
            <p className="muted">{t('cam.hint')}</p>
            <div className="actions-inline">
              {phase === 'camera' ? (
                <button className="primary" onClick={countdown}>{t('cam.timer')}</button>
              ) : null}
              <button className="secondary" onClick={takePhoto}>{t('cam.now')}</button>
              <button
                className="secondary"
                onClick={() => {
                  const next = facing === 'user' ? 'environment' : 'user'
                  setFacing(next)
                  void startCamera(next)
                }}
              >
                {t('cam.flip')}
              </button>
            </div>
          </div>
        )}

        <canvas ref={shot} className={phase === 'result' ? 'cam-shot' : 'cam-shot hidden'} />

        {phase === 'working' && <p className="muted center">{t('cam.working')}</p>}

        {phase === 'result' && result && (
          <div className="cam-body">
            {result.problems.map((p) => (
              <p className="warning" key={p}>{t(`cam.problem.${p}` as Key)}</p>
            ))}
            {m ? (
              <div className="rows">
                <div className="row"><span className="k">{t('f.inseam')}</span><span className="v">{u.len(m.inseam)}</span></div>
                <div className="row"><span className="k">{t('f.torso')}</span><span className="v">{u.len(m.torso)}</span></div>
                <div className="row"><span className="k">{t('f.arm')}</span><span className="v">{m.arm > 0 ? u.len(m.arm) : '—'}</span></div>
                <div className="row"><span className="k">{t('f.shoulderWidth')}</span><span className="v">{u.len(m.shoulderWidth)}</span></div>
              </div>
            ) : (
              <p className="tip">{t('cam.problem.retry')}</p>
            )}
            {m && <p className="muted">{t('cam.estimate')}</p>}
            <div className="actions-inline">
              {m && (
                <button className="primary" onClick={() => { onApply(m); close() }}>{t('cam.use')}</button>
              )}
              <button className="secondary" onClick={() => { setResult(null); setPhase('intro') }}>{t('cam.retake')}</button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="cam-body">
            <p className="warning">{err ? t(err) : ''}</p>
            <label className="secondary file-btn">
              {t('cam.upload')}
              <input type="file" accept="image/*" hidden onChange={(e) => fromFile(e.target.files?.[0])} />
            </label>
            <button className="secondary" onClick={() => setPhase('intro')}>{t('cam.retake')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function drawSkeleton(c: HTMLCanvasElement, pts: { x: number; y: number; visibility?: number }[]) {
  const g = c.getContext('2d')
  if (!g) return
  g.lineWidth = Math.max(3, c.width / 200)
  g.strokeStyle = '#ff8a5b'
  g.fillStyle = '#ffffff'
  for (const [a, b] of BONES) {
    if ((pts[a]?.visibility ?? 1) < 0.5 || (pts[b]?.visibility ?? 1) < 0.5) continue
    g.beginPath()
    g.moveTo(pts[a].x * c.width, pts[a].y * c.height)
    g.lineTo(pts[b].x * c.width, pts[b].y * c.height)
    g.stroke()
  }
  for (const i of [LM.nose, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lHeel, LM.rHeel]) {
    g.beginPath()
    g.arc(pts[i].x * c.width, pts[i].y * c.height, g.lineWidth * 1.4, 0, Math.PI * 2)
    g.fill()
  }
}
