'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'

// ── Animated Counter ──────────────────────────────────────────────
export function AnimatedCounter({ value, suffix = '', prefix = '', duration = 2000 }: {
  value: number; suffix?: string; prefix?: string; duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
      else setCount(value)
    }
    requestAnimationFrame(animate)
  }, [inView, value, duration])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

// ── Section Label ─────────────────────────────────────────────────
export function SectionLabel({ text, color = 'var(--cyan)' }: { text: string; color?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-xs uppercase tracking-widest mb-3 font-dm_sans"
      style={{ color, fontWeight: 500, letterSpacing: '0.1em' }}
    >
      {text}
    </motion.p>
  )
}

// ── Word Split Headline ───────────────────────────────────────────
export function WordHeadline({ text, className = '', highlightWords = [], delay = 0.3 }: {
  text: string; className?: string; highlightWords?: string[]; delay?: number
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const words = text.split(' ')

  return (
    <h2 ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.55,
            delay: delay + i * 0.07,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={highlightWords.includes(word) ? { color: 'var(--blue)' } : {}}
        >
          {word}
        </motion.span>
      ))}
    </h2>
  )
}

// ── Scroll Fade In ────────────────────────────────────────────────
export function ScrollFadeIn({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode; className?: string; delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const dirMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: -60 },
    right: { y: 0, x: 60 },
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...dirMap[direction] }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Glass Card with 3D Tilt ───────────────────────────────────────
export function TiltCard({ children, className = '', borderColor }: {
  children: React.ReactNode; className?: string; borderColor?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setTilt({ x: (y - 0.5) * -14, y: (x - 0.5) * 14 })
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  return (
    <motion.div
      ref={cardRef}
      className={`glass-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setTilt({ x: 0, y: 0 }) }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        y: hover ? -4 : 0,
      }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      style={{ perspective: 800, transformStyle: 'preserve-3d', position: 'relative', overflow: 'hidden' }}
    >
      {hover && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.04), transparent)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
      {borderColor && (
        <motion.div
          className="absolute top-0 left-0 h-[2px]"
          style={{ background: borderColor }}
          initial={{ width: '0%' }}
          whileInView={{ width: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  )
}

// ── Custom Cursor ─────────────────────────────────────────────────
export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    const down = () => setClicking(true)
    const up = () => setClicking(false)
    const overInteractive = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('a, button, input, [data-cursor-hover]')) setHovering(true)
    }
    const leaveInteractive = () => setHovering(false)

    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    document.addEventListener('mouseover', overInteractive)
    document.addEventListener('mouseout', leaveInteractive)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      document.removeEventListener('mouseover', overInteractive)
      document.removeEventListener('mouseout', leaveInteractive)
    }
  }, [])

  return (
    <div
      className="custom-cursor"
      style={{
        left: pos.x,
        top: pos.y,
        width: clicking ? 6 : hovering ? 32 : 10,
        height: clicking ? 6 : hovering ? 32 : 10,
        opacity: hovering ? 0.25 : 1,
        transition: 'width 0.2s, height 0.2s, opacity 0.2s',
      }}
    />
  )
}

// ── Scroll Progress ───────────────────────────────────────────────
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX: scrollYProgress, transformOrigin: '0%' }}
    />
  )
}
