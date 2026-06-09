'use client'
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function FloatingBox({
  position, size, speed, offset, color,
}: {
  position: [number,number,number]
  size: [number,number,number]
  speed: number; offset: number; color: string
}) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.position.y = position[1] + Math.sin(clock.elapsedTime * speed + offset) * 0.28
    mesh.current.rotation.y += 0.004
    mesh.current.rotation.x = Math.sin(clock.elapsedTime * 0.4 + offset) * 0.08
  })
  return (
    <mesh ref={mesh} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive="#2563EB" emissiveIntensity={0.12}
        roughness={0.55} metalness={0.08}
      />
    </mesh>
  )
}

function WireBox({ position }: { position: [number,number,number] }) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.rotation.y = clock.elapsedTime * 0.28
  })
  return (
    <mesh ref={mesh} position={position}>
      <boxGeometry args={[0.65, 0.55, 0.55]} />
      <meshStandardMaterial color="#2563EB" wireframe />
    </mesh>
  )
}

export default function HeroScene() {
  return (
    <Canvas camera={{ position: [0,0,8], fov: 50 }}>
      <ambientLight intensity={0.28} />
      <pointLight position={[5,5,5]}  intensity={2.2} color="#2563EB" />
      <pointLight position={[-5,-3,-4]} intensity={1.1} color="#06B6D4" />

      <FloatingBox position={[-1.6,0,0]}   size={[1.4,1.0,1.0]} speed={0.75} offset={0}    color="#8B6914" />
      <FloatingBox position={[1.5,0.5,-1]} size={[0.9,0.7,0.8]} speed={1.1}  offset={2.1}  color="#A0783C" />
      <FloatingBox position={[0,-0.8,1]}   size={[1.8,1.3,1.2]} speed={0.6}  offset={4.2}  color="#7A5A10" />
      <WireBox     position={[2.6,1.2,-2]} />

      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false}
        autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  )
}
