import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'

// ── Machine Baselines for Intelligent Health Calculation ──
const MACHINE_BASELINES = {
  cnc_mill:    { vibration: 0.82, temperature: 65, rpm: 3200, current: 12.5 },
  lathe:       { vibration: 0.65, temperature: 58, rpm: 1800, current: 9.8 },
  drill_press: { vibration: 1.20, temperature: 45, rpm: 800,  current: 6.5 },
  conveyor:    { vibration: 0.40, temperature: 40, rpm: 60,   current: 15.0 },
  pump:        { vibration: 0.90, temperature: 50, rpm: 1400, current: 8.5 }
}

function distributeHealth(d, type, riskScore) {
  const base = MACHINE_BASELINES[type] || MACHINE_BASELINES.cnc_mill
  // Calculate relative deviation from nominal
  const vibDev = Math.max(0, (d.vibration || 0) - base.vibration) / (base.vibration * 1.5 || 1)
  const tempDev = Math.max(0, (d.temperature || 0) - base.temperature) / 15.0
  
  // If no deviations but risk is high, split evenly. Otherwise, distribute based on deviation.
  const totalDev = vibDev + tempDev + 0.0001
  const comp1Risk = riskScore * (vibDev / totalDev)
  const comp2Risk = riskScore * (tempDev / totalDev)
  
  return {
    comp1Health: Math.max(0, 100 - comp1Risk),
    comp2Health: Math.max(0, 100 - comp2Risk)
  }
}

function updateOverlay(ref, label, healthValue) {
  if (ref.current) {
    ref.current.innerText = `${label}: ${Math.round(healthValue)}%`
    ref.current.style.color = healthValue < 50 ? '#ef4444' : (healthValue < 80 ? '#f59e0b' : '#34d399')
  }
}

// ── CNC Mill Mesh ────────────────────────────────────────────────────────────
function MillMesh({ dataRef, color = '#3b82f6' }) {
  const groupRef = useRef(); const spinnerRef = useRef(); const vibBodyRef = useRef(); const glowRef = useRef();
  const bearingHealthRef = useRef(); const motorHealthRef = useRef(); const overallRiskRef = useRef();
  useFrame((state, delta) => {
    const d = dataRef?.current
    if (!d || !groupRef.current) return
    const riskScore = d.risk_score || 0
    const t = state.clock.elapsedTime
    if (spinnerRef.current) spinnerRef.current.rotation.y += ((d.rpm || 0) / 3200) * 4.0 * delta
    if (vibBodyRef.current) {
      const shakeAmp = Math.min((d.vibration || 0) * 0.015, 0.08)
      vibBodyRef.current.position.x = Math.sin(t * 35) * shakeAmp
      vibBodyRef.current.position.z = Math.cos(t * 28) * shakeAmp * 0.7
    }
    const riskNorm = riskScore / 100
    if (glowRef.current) {
      const finalColor = riskNorm < 0.5 ? new THREE.Color(color).lerp(new THREE.Color('#f59e0b'), riskNorm * 2) : new THREE.Color('#f59e0b').lerp(new THREE.Color('#ef4444'), (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.5
    }
    const { comp1Health, comp2Health } = distributeHealth(d, 'cnc_mill', riskScore)
    updateOverlay(bearingHealthRef, 'Mill Bearing', comp1Health)
    updateOverlay(motorHealthRef, 'Drive Motor', comp2Health)
    if (overallRiskRef.current) {
      overallRiskRef.current.innerText = `System Risk: ${riskScore.toFixed(1)}%`
      overallRiskRef.current.style.color = riskScore > 75 ? '#ef4444' : (riskScore > 40 ? '#f59e0b' : '#10b981')
    }
  })
  return (
    <group ref={groupRef}>
      <mesh ref={vibBodyRef} castShadow receiveShadow><boxGeometry args={[2.0, 0.5, 1.6]} /><meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} /></mesh>
      <mesh position={[0, 1.0, -0.2]} castShadow><boxGeometry args={[0.5, 1.5, 0.6]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <group position={[0, 1.4, -0.6]}>
        <mesh castShadow><cylinderGeometry args={[0.25, 0.25, 0.6, 16]} rotation={[Math.PI / 2, 0, 0]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.6} /></mesh>
        <Html position={[0, 0.4, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={motorHealthRef}>Motor: 100%</div></Html>
      </group>
      <group ref={spinnerRef} position={[0, 1.4, 0.3]}>
        <mesh castShadow ref={glowRef}><cylinderGeometry args={[0.15, 0.2, 0.6, 16]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.5} /></mesh>
        <group position={[0, 0.15, 0]}>
          <mesh castShadow><torusGeometry args={[0.22, 0.04, 16, 32]} rotation={[Math.PI / 2, 0, 0]} /><meshStandardMaterial color="#cbd5e1" metalness={1.0} roughness={0.1} /></mesh>
          <Html position={[0.4, 0, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={bearingHealthRef}>Bearing: 100%</div></Html>
        </group>
        <mesh position={[0, -0.4, 0]}><coneGeometry args={[0.08, 0.3, 16]} /><meshStandardMaterial color="#94a3b8" metalness={1.0} roughness={0.1} /></mesh>
      </group>
      <Html position={[0, 2.4, 0]} center><div className="text-xs font-black font-mono tracking-widest whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" ref={overallRiskRef}>SYSTEM RISK: 0%</div></Html>
    </group>
  )
}

// ── Lathe Mesh ───────────────────────────────────────────────────────────────
function LatheMesh({ dataRef, color = '#14b8a6' }) {
  const groupRef = useRef(); const chuckRef = useRef(); const vibBodyRef = useRef(); const glowRef = useRef();
  const bearingHealthRef = useRef(); const motorHealthRef = useRef(); const overallRiskRef = useRef();
  useFrame((state, delta) => {
    const d = dataRef?.current; if (!d || !groupRef.current) return
    const riskScore = d.risk_score || 0; const t = state.clock.elapsedTime
    if (chuckRef.current) chuckRef.current.rotation.x += ((d.rpm || 0) / 1800) * 4.0 * delta
    if (vibBodyRef.current) {
      const shakeAmp = Math.min((d.vibration || 0) * 0.015, 0.08)
      vibBodyRef.current.position.y = Math.sin(t * 35) * shakeAmp
      vibBodyRef.current.position.z = Math.cos(t * 28) * shakeAmp * 0.7
    }
    const riskNorm = riskScore / 100
    if (glowRef.current) {
      const finalColor = riskNorm < 0.5 ? new THREE.Color(color).lerp(new THREE.Color('#f59e0b'), riskNorm * 2) : new THREE.Color('#f59e0b').lerp(new THREE.Color('#ef4444'), (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.5
    }
    const { comp1Health, comp2Health } = distributeHealth(d, 'lathe', riskScore)
    updateOverlay(bearingHealthRef, 'Chuck Bearing', comp1Health)
    updateOverlay(motorHealthRef, 'Lathe Motor', comp2Health)
    if (overallRiskRef.current) {
      overallRiskRef.current.innerText = `System Risk: ${riskScore.toFixed(1)}%`
      overallRiskRef.current.style.color = riskScore > 75 ? '#ef4444' : (riskScore > 40 ? '#f59e0b' : '#10b981')
    }
  })
  return (
    <group ref={groupRef}>
      <mesh ref={vibBodyRef} castShadow receiveShadow><boxGeometry args={[3.0, 0.4, 1.0]} /><meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} /></mesh>
      <mesh position={[-1.0, 0.7, 0]} castShadow><boxGeometry args={[0.8, 1.0, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <group position={[-1.0, 1.4, -0.2]}>
        <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.6, 16]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.6} /></mesh>
        <Html position={[0, 0.4, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={motorHealthRef}>Motor: 100%</div></Html>
      </group>
      <group position={[-0.5, 0.8, 0]}>
        <group ref={chuckRef} rotation={[0, 0, -Math.PI / 2]}>
          <mesh castShadow ref={glowRef}><cylinderGeometry args={[0.3, 0.3, 0.4, 16]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, 0.25, 0.2]} castShadow><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color="#94a3b8" metalness={1.0} /></mesh>
          <mesh position={[0, 0.25, -0.2]} castShadow><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color="#94a3b8" metalness={1.0} /></mesh>
        </group>
        <mesh position={[-0.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><torusGeometry args={[0.35, 0.05, 16, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={1.0} roughness={0.1} /></mesh>
        <Html position={[0, 0.6, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={bearingHealthRef}>Bearing: 100%</div></Html>
      </group>
      <mesh position={[1.0, 0.5, 0]} castShadow><boxGeometry args={[0.4, 0.6, 0.6]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <Html position={[0, 2.0, 0]} center><div className="text-xs font-black font-mono tracking-widest whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" ref={overallRiskRef}>SYSTEM RISK: 0%</div></Html>
    </group>
  )
}

// ── Drill Press Mesh ─────────────────────────────────────────────────────────
function DrillMesh({ dataRef, color = '#f59e0b' }) {
  const groupRef = useRef(); const spindleRef = useRef(); const vibBodyRef = useRef(); const glowRef = useRef();
  const mechHealthRef = useRef(); const motorHealthRef = useRef(); const overallRiskRef = useRef();
  useFrame((state, delta) => {
    const d = dataRef?.current; if (!d || !groupRef.current) return
    const riskScore = d.risk_score || 0; const t = state.clock.elapsedTime
    if (spindleRef.current) spindleRef.current.rotation.y += ((d.rpm || 0) / 800) * 4.0 * delta
    if (vibBodyRef.current) {
      const shakeAmp = Math.min((d.vibration || 0) * 0.015, 0.08)
      vibBodyRef.current.position.y = Math.sin(t * 35) * shakeAmp
    }
    const riskNorm = riskScore / 100
    if (glowRef.current) {
      const finalColor = riskNorm < 0.5 ? new THREE.Color(color).lerp(new THREE.Color('#f59e0b'), riskNorm * 2) : new THREE.Color('#f59e0b').lerp(new THREE.Color('#ef4444'), (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.5
    }
    const { comp1Health, comp2Health } = distributeHealth(d, 'drill_press', riskScore)
    updateOverlay(mechHealthRef, 'Feed Mech', comp1Health)
    updateOverlay(motorHealthRef, 'Spindle Motor', comp2Health)
    if (overallRiskRef.current) {
      overallRiskRef.current.innerText = `System Risk: ${riskScore.toFixed(1)}%`
      overallRiskRef.current.style.color = riskScore > 75 ? '#ef4444' : (riskScore > 40 ? '#f59e0b' : '#10b981')
    }
  })
  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow><boxGeometry args={[1.2, 0.2, 1.2]} /><meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} /></mesh>
      <mesh position={[0, 1.5, -0.3]} castShadow><cylinderGeometry args={[0.2, 0.2, 3.0, 16]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <group ref={vibBodyRef} position={[0, 2.5, 0]}>
        <mesh castShadow><boxGeometry args={[0.8, 0.6, 1.2]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.6} /></mesh>
        <Html position={[0, 0.5, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={motorHealthRef}>Motor: 100%</div></Html>
        <group ref={spindleRef} position={[0, -0.6, 0.3]}>
          <mesh castShadow ref={glowRef}><cylinderGeometry args={[0.1, 0.1, 0.8, 16]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, -0.45, 0]} castShadow><coneGeometry args={[0.05, 0.3, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={1.0} roughness={0.1} /></mesh>
        </group>
        <Html position={[0.4, -0.3, 0.3]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={mechHealthRef}>Feed: 100%</div></Html>
      </group>
      <mesh position={[0, 1.0, 0.2]} castShadow><boxGeometry args={[0.8, 0.1, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <Html position={[0, 3.2, 0]} center><div className="text-xs font-black font-mono tracking-widest whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" ref={overallRiskRef}>SYSTEM RISK: 0%</div></Html>
    </group>
  )
}

// ── Conveyor Belt Mesh ───────────────────────────────────────────────────────
function ConveyorMesh({ dataRef, color = '#8b5cf6' }) {
  const groupRef = useRef(); const roller1Ref = useRef(); const roller2Ref = useRef(); const vibBodyRef = useRef(); const glowRef = useRef();
  const bearingHealthRef = useRef(); const motorHealthRef = useRef(); const overallRiskRef = useRef();
  useFrame((state, delta) => {
    const d = dataRef?.current; if (!d || !groupRef.current) return
    const riskScore = d.risk_score || 0; const t = state.clock.elapsedTime
    if (roller1Ref.current) {
      const spd = ((d.rpm || 0) / 60) * 2.0 * delta
      roller1Ref.current.rotation.x += spd
      if(roller2Ref.current) roller2Ref.current.rotation.x += spd
    }
    if (vibBodyRef.current) {
      const shakeAmp = Math.min((d.vibration || 0) * 0.015, 0.08)
      vibBodyRef.current.position.y = Math.sin(t * 35) * shakeAmp
    }
    const riskNorm = riskScore / 100
    if (glowRef.current) {
      const finalColor = riskNorm < 0.5 ? new THREE.Color(color).lerp(new THREE.Color('#f59e0b'), riskNorm * 2) : new THREE.Color('#f59e0b').lerp(new THREE.Color('#ef4444'), (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.5
    }
    const { comp1Health, comp2Health } = distributeHealth(d, 'conveyor', riskScore)
    updateOverlay(bearingHealthRef, 'Roller Bearings', comp1Health)
    updateOverlay(motorHealthRef, 'Drive Motor', comp2Health)
    if (overallRiskRef.current) {
      overallRiskRef.current.innerText = `System Risk: ${riskScore.toFixed(1)}%`
      overallRiskRef.current.style.color = riskScore > 75 ? '#ef4444' : (riskScore > 40 ? '#f59e0b' : '#10b981')
    }
  })
  return (
    <group ref={groupRef}>
      <group ref={vibBodyRef} position={[0, 0.8, 0]}>
        <mesh castShadow receiveShadow><boxGeometry args={[4.0, 0.1, 1.2]} /><meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} /></mesh>
        <group position={[-1.8, 0, 0]}>
          <mesh ref={roller1Ref} rotation={[0, 0, Math.PI/2]} castShadow ref={glowRef}><cylinderGeometry args={[0.2, 0.2, 1.2, 16]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.5} /></mesh>
          <Html position={[0, 0.4, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={bearingHealthRef}>Bearings: 100%</div></Html>
        </group>
        <group position={[1.8, 0, 0]}>
          <mesh ref={roller2Ref} rotation={[0, 0, Math.PI/2]} castShadow><cylinderGeometry args={[0.2, 0.2, 1.2, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={1.0} roughness={0.1} /></mesh>
        </group>
        <mesh position={[2.0, -0.4, 0]} castShadow><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.6} /></mesh>
        <Html position={[2.0, 0.1, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={motorHealthRef}>Motor: 100%</div></Html>
      </group>
      <mesh position={[-1.5, 0.4, 0.4]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[-1.5, 0.4, -0.4]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[1.5, 0.4, 0.4]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[1.5, 0.4, -0.4]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} /></mesh>
      <Html position={[0, 1.8, 0]} center><div className="text-xs font-black font-mono tracking-widest whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" ref={overallRiskRef}>SYSTEM RISK: 0%</div></Html>
    </group>
  )
}

// ── Pump Mesh ────────────────────────────────────────────────────────────────
function PumpMesh({ dataRef, color = '#ef4444' }) {
  const groupRef = useRef(); const impRef = useRef(); const vibBodyRef = useRef(); const glowRef = useRef();
  const bearingHealthRef = useRef(); const motorHealthRef = useRef(); const overallRiskRef = useRef();
  useFrame((state, delta) => {
    const d = dataRef?.current; if (!d || !groupRef.current) return
    const riskScore = d.risk_score || 0; const t = state.clock.elapsedTime
    if (impRef.current) impRef.current.rotation.z += ((d.rpm || 0) / 1400) * 4.0 * delta
    if (vibBodyRef.current) {
      const shakeAmp = Math.min((d.vibration || 0) * 0.015, 0.08)
      vibBodyRef.current.position.y = Math.sin(t * 35) * shakeAmp
      vibBodyRef.current.position.x = Math.cos(t * 28) * shakeAmp * 0.7
    }
    const riskNorm = riskScore / 100
    if (glowRef.current) {
      const finalColor = riskNorm < 0.5 ? new THREE.Color(color).lerp(new THREE.Color('#f59e0b'), riskNorm * 2) : new THREE.Color('#f59e0b').lerp(new THREE.Color('#ef4444'), (riskNorm - 0.5) * 2)
      glowRef.current.material.emissive.copy(finalColor)
      glowRef.current.material.emissiveIntensity = 0.3 + riskNorm * 1.5
    }
    const { comp1Health, comp2Health } = distributeHealth(d, 'pump', riskScore)
    updateOverlay(bearingHealthRef, 'Pump Impeller', comp1Health)
    updateOverlay(motorHealthRef, 'Pump Motor', comp2Health)
    if (overallRiskRef.current) {
      overallRiskRef.current.innerText = `System Risk: ${riskScore.toFixed(1)}%`
      overallRiskRef.current.style.color = riskScore > 75 ? '#ef4444' : (riskScore > 40 ? '#f59e0b' : '#10b981')
    }
  })
  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow><boxGeometry args={[1.8, 0.2, 1.0]} /><meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.4} /></mesh>
      <group ref={vibBodyRef} position={[0, 0.5, 0]}>
        <mesh position={[-0.4, 0, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.8, 16]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.6} /></mesh>
        <Html position={[-0.4, 0.5, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={motorHealthRef}>Motor: 100%</div></Html>
        <group position={[0.4, 0, 0]}>
          <mesh castShadow ref={glowRef}><cylinderGeometry args={[0.4, 0.4, 0.3, 16]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.2} emissive={color} emissiveIntensity={0.5} /></mesh>
          <mesh ref={impRef} position={[0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}><torusGeometry args={[0.2, 0.05, 16, 32]} /><meshStandardMaterial color="#cbd5e1" metalness={1.0} roughness={0.1} /></mesh>
          <Html position={[0.2, 0.5, 0]} center><div className="text-[10px] font-mono font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" ref={bearingHealthRef}>Impeller: 100%</div></Html>
        </group>
        <mesh position={[0.4, 0.4, 0]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.4, 16]} /><meshStandardMaterial color="#94a3b8" metalness={1.0} roughness={0.1} /></mesh>
      </group>
      <Html position={[0, 1.8, 0]} center><div className="text-xs font-black font-mono tracking-widest whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" ref={overallRiskRef}>SYSTEM RISK: 0%</div></Html>
    </group>
  )
}

// ── Main Scene Component ──────────────────────────────────────────────────────
export default function Scene({ dataRef, machineType = 'cnc_mill' }) {
  let MeshComponent = MillMesh;
  let machineColor = '#3b82f6';

  if (machineType === 'lathe') { MeshComponent = LatheMesh; machineColor = '#14b8a6'; }
  else if (machineType === 'drill_press') { MeshComponent = DrillMesh; machineColor = '#f59e0b'; }
  else if (machineType === 'conveyor') { MeshComponent = ConveyorMesh; machineColor = '#8b5cf6'; }
  else if (machineType === 'pump') { MeshComponent = PumpMesh; machineColor = '#ef4444'; }

  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 45 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2, -3]} intensity={0.6} color="#1d4ed8" />
      <pointLight position={[3, 1, 3]}  intensity={0.4} color="#0e7490" />

      <Environment preset="city" />

      <Grid
        position={[0, -0.22, 0]}
        args={[10, 10]}
        cellSize={0.5}
        cellColor="#1e3a5f"
        sectionColor="#1e40af"
        fadeDistance={8}
        infiniteGrid
      />

      <MeshComponent dataRef={dataRef} color={machineColor} />

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
