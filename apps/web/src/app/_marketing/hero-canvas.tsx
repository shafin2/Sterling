'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion() === true;

  useFrame(({ clock }) => {
    if (!meshRef.current || reduced) return;
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.15;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
  });

  return (
    <Float speed={reduced ? 0 : 1.5} rotationIntensity={reduced ? 0 : 0.4} floatIntensity={reduced ? 0 : 0.8}>
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 2]} />
        <MeshDistortMaterial
          color="#7091E6"
          distort={reduced ? 0 : 0.35}
          speed={reduced ? 0 : 1.5}
          roughness={0.2}
          metalness={0.8}
          opacity={0.55}
          transparent
        />
      </mesh>
    </Float>
  );
}

function SecondaryOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion() === true;

  useFrame(({ clock }) => {
    if (!meshRef.current || reduced) return;
    const t = clock.getElapsedTime();
    meshRef.current.position.x = Math.sin(t * 0.3) * 3.5;
    meshRef.current.position.y = Math.cos(t * 0.25) * 1.5;
    meshRef.current.rotation.y = t * 0.2;
  });

  return (
    <mesh ref={meshRef} scale={0.85} position={[3, 1, -1]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#3D52A0"
        roughness={0.1}
        metalness={0.9}
        opacity={0.4}
        transparent
      />
    </mesh>
  );
}

export function HeroCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#7091E6" />
        <directionalLight position={[-5, -3, -5]} intensity={0.6} color="#3D52A0" />
        <pointLight position={[0, 0, 4]} intensity={0.8} color="#EDE8F5" />
        <Stars radius={60} depth={30} count={800} factor={3} saturation={0} fade speed={0.6} />
        <AnimatedSphere />
        <SecondaryOrb />
      </Canvas>
    </div>
  );
}
