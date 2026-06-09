'use client'
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  box:     { length_cm: number; width_cm: number; height_cm: number }
  product: { length_cm: number; width_cm: number; height_cm: number }
  mode:    'solid' | 'wireframe' | 'exploded'
  autoRotate: boolean
}

// Scale factor: 1 unit = 10 cm
const S = 10

function BoxScene({ box, product, mode, autoRotate }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const bL = box.length_cm / S
  const bW = box.width_cm  / S
  const bH = box.height_cm / S
  const pL = product.length_cm / S
  const pW = product.width_cm  / S
  const pH = product.height_cm / S

  const lidY   = bH + (mode === 'exploded' ? 1.0 : 0.04)
  const wireOnly = mode === 'wireframe'

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * (autoRotate ? 0.4 : 0)
  })

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 6, 5]}  intensity={1.6} color="#2563EB" />
      <pointLight position={[-4, 3, -4]} intensity={0.8} color="#06B6D4" />

      <group ref={groupRef}>
        {/* ── Box shell (bottom half only — open top) ── */}
        <mesh position={[0, bH / 2, 0]}>
          <boxGeometry args={[bL, bH, bW]} />
          <meshStandardMaterial
            color="#C49A2A"
            transparent opacity={wireOnly ? 0 : 0.22}
            side={THREE.BackSide}
          />
        </mesh>

        {/* ── Box wireframe edges ── */}
        <mesh position={[0, bH / 2, 0]}>
          <boxGeometry args={[bL, bH, bW]} />
          <meshStandardMaterial color="#D4A437" wireframe />
        </mesh>

        {/* ── Lid ── */}
        <mesh position={[0, lidY, 0]}>
          <boxGeometry args={[bL, 0.06, bW]} />
          <meshStandardMaterial
            color="#B8861A"
            transparent opacity={wireOnly ? 0 : 0.30}
            wireframe={wireOnly}
          />
        </mesh>
        <mesh position={[0, lidY, 0]}>
          <boxGeometry args={[bL, 0.06, bW]} />
          <meshStandardMaterial color="#D4A437" wireframe />
        </mesh>

        {/* ── Product ── */}
        <mesh position={[0, pH / 2 + 0.02, 0]}>
          <boxGeometry args={[pL, pH, pW]} />
          <meshStandardMaterial
            color="#2563EB"
            emissive="#1d4ed8" emissiveIntensity={0.25}
            transparent opacity={wireOnly ? 0.85 : 0.9}
            wireframe={wireOnly}
          />
        </mesh>
      </group>

      {/* Floor grid */}
      <gridHelper args={[8, 16, '#1E2533', '#1E2533']} position={[0, 0, 0]} />

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={14}
        autoRotate={false}      /* We handle rotation manually above */
        enableRotate
      />
    </>
  )
}

export default function BoxViewer3D(props: Props) {
  return (
    <Canvas
      camera={{ position: [3.5, 2.8, 3.5], fov: 48 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}>
      <BoxScene {...props} />
    </Canvas>
  )
}
