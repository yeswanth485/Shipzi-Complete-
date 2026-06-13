'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshTransmissionMaterial, Environment } from '@react-three/drei'
import * as THREE from 'three'

/* ── Cardboard Box ────────────────────────────────────────────── */
function CardboardBox({
  position,
  size,
  rotationSpeed = 0.3,
  floatSpeed = 0.8,
  floatIntensity = 0.3,
  rotOffset = 0,
  color = '#A07820',
  emissiveColor = '#2563EB',
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotationSpeed?: number
  floatSpeed?: number
  floatIntensity?: number
  rotOffset?: number
  color?: string
  emissiveColor?: string
}) {
  const group = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const cardboardTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // Base cardboard color
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 256, 256)

    // Corrugation lines (horizontal ridges)
    for (let y = 0; y < 256; y += 4) {
      const brightness = Math.random() * 20 - 10
      const r = parseInt(color.slice(1, 3), 16) + brightness
      const g = parseInt(color.slice(3, 5), 16) + brightness
      const b = parseInt(color.slice(5, 7), 16) + brightness
      ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))},${Math.max(0, Math.min(255, g))},${Math.max(0, Math.min(255, b))})`
      ctx.fillRect(0, y, 256, 2)
    }

    // Subtle fiber texture
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const len = 4 + Math.random() * 12
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.06})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2)
      ctx.stroke()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 2)
    return tex
  }, [color])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.y = position[1] + Math.sin(t * floatSpeed + rotOffset) * floatIntensity
    group.current.rotation.y = t * rotationSpeed + rotOffset
    group.current.rotation.x = Math.sin(t * 0.3 + rotOffset) * 0.12
    group.current.rotation.z = Math.cos(t * 0.2 + rotOffset) * 0.05
  })

  return (
    <group ref={group} position={position}>
      {/* Main box body */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          map={cardboardTexture}
          roughness={0.75}
          metalness={0.02}
          emissive={emissiveColor}
          emissiveIntensity={0.06}
          color={color}
        />
      </mesh>

      {/* Box edges (slightly darker lines) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], size[2])]} />
        <lineBasicMaterial color="#00000033" linewidth={1} />
      </lineSegments>

      {/* Tape strip on top */}
      <mesh position={[0, size[1] / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.3, size[2] * 0.9]} />
        <meshStandardMaterial
          color="#C4A04A"
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}

/* ── Wireframe Box (ghost/accent) ─────────────────────────────── */
function WireframeBox({
  position,
  size,
  rotationSpeed = 0.2,
  color = '#2563EB',
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotationSpeed?: number
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * rotationSpeed
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.15) * 0.1
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.4) * 0.15
  })

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        wireframe
        transparent
        opacity={0.3}
        emissive={color}
        emissiveIntensity={0.4}
      />
    </mesh>
  )
}

/* ── Small Accent Box ─────────────────────────────────────────── */
function AccentBox({
  position,
  size,
  color,
  speed = 0.5,
  offset = 0,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  speed?: number
  offset?: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.2
    ref.current.rotation.y = t * 0.4 + offset
    ref.current.rotation.x = Math.cos(t * 0.3 + offset) * 0.15
  })

  return (
    <mesh ref={ref} position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        roughness={0.4}
        metalness={0.15}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}

/* ── Particle Field ───────────────────────────────────────────── */
function ParticleField() {
  const count = 60
  const ref = useRef<THREE.Points>(null)

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
      vel[i] = 0.1 + Math.random() * 0.3
    }
    return [pos, vel]
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += velocities[i] * 0.005
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = -4
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#2563EB"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ── Floating Ring ────────────────────────────────────────────── */
function FloatingRing({ position, radius = 0.8 }: { position: [number, number, number]; radius?: number }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.x = clock.elapsedTime * 0.15
    ref.current.rotation.z = clock.elapsedTime * 0.1
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.1
  })

  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[radius, 0.008, 8, 64]} />
      <meshStandardMaterial
        color="#2563EB"
        transparent
        opacity={0.2}
        emissive="#2563EB"
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

/* ── Scene Composition ────────────────────────────────────────── */
function Scene() {
  const { viewport } = useThree()
  const scale = Math.min(viewport.width / 10, 1)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.8} color="#ffffff" castShadow />
      <pointLight position={[-4, 3, -3]} intensity={1.5} color="#2563EB" distance={15} />
      <pointLight position={[4, -2, 4]} intensity={1.0} color="#06B6D4" distance={12} />
      <pointLight position={[0, 5, -5]} intensity={0.6} color="#8B5CF6" distance={10} />
      <spotLight
        position={[0, 6, 0]}
        angle={0.4}
        penumbra={0.8}
        intensity={0.8}
        color="#2563EB"
        castShadow
      />

      {/* Fog */}
      <fog attach="fog" args={['#040608', 6, 18]} />

      <group scale={scale}>
        {/* Box A — Large cardboard, center-left (main hero box) */}
        <CardboardBox
          position={[-1.2, 0.1, 0]}
          size={[1.6, 1.2, 1.3]}
          rotationSpeed={0.25}
          floatSpeed={0.7}
          floatIntensity={0.25}
          rotOffset={0}
          color="#A07820"
          emissiveColor="#2563EB"
        />

        {/* Box B — Blue accent box, top-right */}
        <CardboardBox
          position={[1.8, 0.8, -1.2]}
          size={[1.0, 0.85, 0.9]}
          rotationSpeed={-0.35}
          floatSpeed={1.0}
          floatIntensity={0.2}
          rotOffset={2.1}
          color="#1E40AF"
          emissiveColor="#2563EB"
        />

        {/* Box C — Small cyan box, bottom-right */}
        <AccentBox
          position={[2.2, -0.9, 0.5]}
          size={[0.65, 0.55, 0.6]}
          color="#0891B2"
          speed={0.6}
          offset={4.2}
        />

        {/* Box D — Wireframe ghost box, upper area */}
        <WireframeBox
          position={[0.8, 1.2, -2]}
          size={[1.4, 1.1, 1.1]}
          rotationSpeed={0.18}
          color="#2563EB"
        />

        {/* Box E — Small green box, lower-left */}
        <AccentBox
          position={[-2.0, -1.0, 1]}
          size={[0.5, 0.45, 0.42]}
          color="#059669"
          speed={0.4}
          offset={6}
        />

        {/* Box F — Tiny purple accent, far back */}
        <AccentBox
          position={[0.3, -0.3, -2.5]}
          size={[0.35, 0.3, 0.3]}
          color="#7C3AED"
          speed={0.7}
          offset={3}
        />

        {/* Decorative rings */}
        <FloatingRing position={[-0.5, 0.5, -1]} radius={1.2} />
        <FloatingRing position={[1.5, -0.5, -2]} radius={0.7} />

        {/* Particle field */}
        <ParticleField />
      </group>
    </>
  )
}

/* ── Export ───────────────────────────────────────────────────── */
export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 7], fov: 45 }}
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  )
}
