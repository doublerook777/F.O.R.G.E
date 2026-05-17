// canvas/Scene.jsx — R3F 3D Scene with Zero-Lag Telemetry Binding
// The rotating box directly reads from dataRef (not React state).
// This proves the zero-lag WebGL pipeline works before GLTF models arrive in Phase 2.

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// ── Machine Mesh — reads telemetry directly from ref (zero React overhead) ──
function MachineMesh({ dataRef, color = '#3b82f6' }) {
  const groupRef    = useRef()
  const spinnerRef  = useRef()
  const vibBodyRef  = useRef()
  const glowRef     = useRef()

  useFrame((state, delta) => {
    const d = dataRef?.current
    if (!d || !groupRef.current) return

    const rpm       = d.rpm         || 0
    const vibration = d.vibration   || 0
    const riskScore = d.risk_score  || 0
    const t         = state.clock.elapsedTime

    // ── Spindle rotation speed driven by RPM ──────────────────────────
    if (spinnerRef.current) {
      const rotSpeed = (rpm / 3200) * 4.0   // Normalized to CNC Mill baseline
      spinnerRef.current.rotation.y += rotSpeed * delta
    }

    // ── Body shake driven by vibration ────────────────────────────────
    if (vibBodyRef.current) {
      const shakeAmp = Math.min(vibration * 0.015, 0.08)
      vibBodyRef.current.position.x = Math.sin(t * 35) * shakeAmp
      vibBodyRef.current.position.z = Math.cos(t * 28) * shakeAmp * 0.7
    }

    // ── Glow intensity driven by risk score ───────────────────────────
    if (glowRef.current) {
      const riskNorm  = riskScore / 100
      const baseColor = new THREE.Color(color)
      const warnColor = new THREE.Color('#f59e0b')
      const critColor = new THREE.Color('#ef4444')
      const finalColor = riskNorm < 0.5
        ? baseColor.lerp(warnColor, riskNorm * 2)
        : warnColor.clone().lerp(critColor, (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Machine base body */}
      <mesh ref={vibBodyRef} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.4, 1.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Machine column */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[0.35, 1.1, 0.35]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Spinning spindle */}
      <group ref={spinnerRef} position={[0, 1.3, 0]}>
        <mesh castShadow ref={glowRef}>
          <cylinderGeometry args={[0.18, 0.22, 0.5, 12]} />
          <meshStandardMaterial
            color={color}
            metalness={0.7}
            roughness={0.2}
            emissive={color}
            emissiveIntensity={0.5}
          />
        </mesh>
        {/* Tool bit */}
        <mesh position={[0, -0.36, 0]}>
          <coneGeometry args={[0.06, 0.28, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={1.0} roughness={0.1} />
        </mesh>
      </group>

      {/* Status indicator LED */}
      <mesh position={[0.7, 0.32, 0.5]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Main Scene Component ──────────────────────────────────────────────────────
export default function Scene({ dataRef, machineType = 'cnc_mill' }) {
  const machineColor = machineType === 'cnc_mill' ? '#3b82f6' : '#14b8a6'

  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 45 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 2, -3]} intensity={0.6} color="#1d4ed8" />
      <pointLight position={[3, 1, 3]}  intensity={0.4} color="#0e7490" />

      {/* Environment */}
      <Environment preset="city" />

      {/* Floor grid */}
      <Grid
        position={[0, -0.22, 0]}
        args={[10, 10]}
        cellSize={0.5}
        cellColor="#1e3a5f"
        sectionColor="#1e40af"
        fadeDistance={8}
        infiniteGrid
      />

      {/* The digital twin machine */}
      <MachineMesh dataRef={dataRef} color={machineColor} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={10}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  )
}
