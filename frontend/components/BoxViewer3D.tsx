'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

interface ProductItem {
  length_cm: number
  width_cm: number
  height_cm: number
  name?: string
  color?: string
}

interface Props {
  box: { length_cm: number; width_cm: number; height_cm: number; box_name?: string }
  product?: { length_cm: number; width_cm: number; height_cm: number }
  products?: ProductItem[]
  mode: 'solid' | 'wireframe' | 'exploded'
  autoRotate: boolean
  showLabels?: boolean
  showGrid?: boolean
}

const S = 10

const PRODUCT_COLORS = [
  '#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#EF4444', '#14B8A6', '#6366F1', '#F97316',
]

function placeProducts(products: { l: number; w: number; h: number }[], boxL: number, boxW: number, boxH: number) {
  const placed: { l: number; w: number; h: number; x: number; y: number; z: number; idx: number }[] = []
  let currentX = -boxL / 2
  let currentY = 0
  let currentZ = -boxW / 2
  let layerMaxH = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    if (p.l <= 0 || p.w <= 0 || p.h <= 0) continue

    if (currentX + p.l > boxL / 2) {
      currentX = -boxL / 2
      currentZ += layerMaxH
      layerMaxH = 0
    }
    if (currentZ + p.w > boxW / 2) {
      currentX = -boxL / 2
      currentZ = -boxW / 2
      currentY += layerMaxH
      layerMaxH = 0
    }
    if (currentY + p.h > boxH) continue

    placed.push({
      l: p.l, w: p.w, h: p.h,
      x: currentX + p.l / 2,
      y: currentY + p.h / 2,
      z: currentZ + p.w / 2,
      idx: i,
    })
    currentX += p.l
    layerMaxH = Math.max(layerMaxH, p.h)
  }
  return placed
}

function BoxScene({ box, product, products, mode, autoRotate, showLabels = true, showGrid = true }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const bL = box.length_cm / S
  const bW = box.width_cm / S
  const bH = box.height_cm / S

  const allProducts = useMemo(() => {
    if (products && products.length > 0) {
      return products.map(p => ({ l: p.length_cm / S, w: p.width_cm / S, h: p.height_cm / S }))
    }
    if (product) {
      return [{ l: product.length_cm / S, w: product.width_cm / S, h: product.height_cm / S }]
    }
    return [{ l: bL * 0.5, w: bW * 0.5, h: bH * 0.4 }]
  }, [products, product, bL, bW, bH])

  const placed = useMemo(() => placeProducts(allProducts, bL, bW, bH), [allProducts, bL, bW, bH])

  const lidY = bH + (mode === 'exploded' ? 1.5 : 0.04)
  const wireOnly = mode === 'wireframe'
  const totalProductVolume = placed.reduce((s, p) => s + p.l * p.w * p.h, 0)
  const boxVolume = bL * bW * bH
  const utilization = boxVolume > 0 ? Math.round((totalProductVolume / boxVolume) * 100) : 0

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * (autoRotate ? 0.3 : 0)
  })

  const gridSide = Math.max(bL, bW) + 2

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 8, 5]} intensity={1.8} color="#2563EB" />
      <pointLight position={[-5, 4, -5]} intensity={0.9} color="#06B6D4" />
      <pointLight position={[0, -2, 0]} intensity={0.3} color="#F59E0B" />

      <group ref={groupRef}>
        {/* ── Box shell ── */}
        <mesh position={[0, bH / 2, 0]}>
          <boxGeometry args={[bL, bH, bW]} />
          <meshStandardMaterial
            color="#C49A2A"
            transparent
            opacity={wireOnly ? 0 : 0.15}
            side={THREE.BackSide}
          />
        </mesh>
        <mesh position={[0, bH / 2, 0]}>
          <boxGeometry args={[bL, bH, bW]} />
          <meshStandardMaterial color="#D4A437" wireframe />
        </mesh>

        {/* ── Box bottom face ── */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bL, bW]} />
          <meshStandardMaterial color="#B8861A" transparent opacity={wireOnly ? 0 : 0.35} side={THREE.DoubleSide} />
        </mesh>

        {/* ── Lid ── */}
        <mesh position={[0, lidY, 0]}>
          <boxGeometry args={[bL, 0.06, bW]} />
          <meshStandardMaterial color="#B8861A" transparent opacity={wireOnly ? 0 : 0.25} wireframe={wireOnly} />
        </mesh>
        <mesh position={[0, lidY, 0]}>
          <boxGeometry args={[bL, 0.06, bW]} />
          <meshStandardMaterial color="#D4A437" wireframe />
        </mesh>

        {/* ── Void space visualization ── */}
        {utilization < 100 && !wireOnly && mode !== 'exploded' && (
          <mesh position={[0, bH / 2, 0]}>
            <boxGeometry args={[bL - 0.05, bH - 0.05, bW - 0.05]} />
            <meshStandardMaterial color="#1E2533" transparent opacity={0.08} wireframe={false} />
          </mesh>
        )}

        {/* ── Products ── */}
        {placed.map((p, i) => {
          const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
          const yPos = mode === 'exploded' ? p.y + 1.5 : p.y
          return (
            <group key={i} position={[p.x, yPos, p.z]}>
              {/* Product solid */}
              <mesh>
                <boxGeometry args={[p.l - 0.02, p.h - 0.02, p.w - 0.02]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.2}
                  transparent
                  opacity={wireOnly ? 0 : 0.88}
                  wireframe={wireOnly}
                />
              </mesh>
              {/* Product edge highlight */}
              <mesh>
                <boxGeometry args={[p.l, p.h, p.w]} />
                <meshStandardMaterial color={color} wireframe transparent opacity={0.6} />
              </mesh>
              {/* Product label */}
              {showLabels && !wireOnly && (
                <Text
                  position={[0, p.h / 2 + 0.15, 0]}
                  fontSize={0.18}
                  color="white"
                  anchorX="center"
                  anchorY="bottom"
                  outlineWidth={0.02}
                  outlineColor="#000000">
                  {products?.[i]?.name ?? `P${i + 1}`}
                </Text>
              )}
            </group>
          )
        })}

        {/* ── Dimension lines (box) ── */}
        {!wireOnly && (
          <>
            {/* Length line */}
            <mesh position={[0, -0.15, bW / 2 + 0.15]}>
              <boxGeometry args={[bL, 0.02, 0.02]} />
              <meshBasicMaterial color="#F59E0B" />
            </mesh>
            {/* Width line */}
            <mesh position={[bL / 2 + 0.15, -0.15, 0]}>
              <boxGeometry args={[0.02, 0.02, bW]} />
              <meshBasicMaterial color="#F59E0B" />
            </mesh>
            {/* Height line */}
            <mesh position={[-bL / 2 - 0.15, bH / 2, 0]}>
              <boxGeometry args={[0.02, bH, 0.02]} />
              <meshBasicMaterial color="#F59E0B" />
            </mesh>
          </>
        )}
      </group>

      {showGrid && (
        <gridHelper args={[Math.max(gridSide, 6), 16, '#1E2533', '#1E2533']} position={[0, -0.01, 0]} />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={16}
        autoRotate={false}
        enableRotate
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  )
}

export default function BoxViewer3D(props: Props) {
  return (
    <Canvas
      camera={{ position: [4, 3.5, 4], fov: 45 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}>
      <BoxScene {...props} />
    </Canvas>
  )
}

export type { Props as BoxViewer3DProps, ProductItem }
