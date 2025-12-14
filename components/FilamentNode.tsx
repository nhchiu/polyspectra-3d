import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sphere, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Product } from '../types';

// Augment JSX namespace to recognize React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      meshStandardMaterial: any;
    }
  }
}

interface FilamentNodeProps {
  products: Product[]; // Now accepts an array (Cluster)
  position: [number, number, number];
  isVisible: boolean;
  onHover: (products: Product[] | null, position?: { x: number, y: number }) => void;
}

export const FilamentNode: React.FC<FilamentNodeProps> = ({ products, position, isVisible, onHover }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { gl } = useThree();

  const isCluster = products.length > 1;
  const count = products.length;

  // Calculate average hex color for the node visualization
  const displayColor = useMemo(() => {
    if (count === 1) return products[0].hex;

    let rSum = 0, gSum = 0, bSum = 0;
    products.forEach(p => {
        const fullHex = p.hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => r + r + g + g + b + b);
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
        if (res) {
            const r = parseInt(res[1], 16);
            const g = parseInt(res[2], 16);
            const b = parseInt(res[3], 16);
            
            // Use Root Mean Square (RMS) for physically accurate color mixing
            rSum += r * r;
            gSum += g * g;
            bSum += b * b;
        }
    });
    
    const r = Math.round(Math.sqrt(rSum / count));
    const g = Math.round(Math.sqrt(gSum / count));
    const b = Math.round(Math.sqrt(bSum / count));
    
    return `rgb(${r},${g},${b})`;
  }, [products, count]);

  // Base size: 4 for single, larger for cluster (logarithmic scale)
  const baseRadius = isCluster ? 4 + Math.log2(count) * 1.5 : 4; 

  // Animate the scale based on visibility and hover state
  useFrame((state) => {
    if (groupRef.current) {
      const targetScale = isVisible ? (hovered ? 1.3 : 1) : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  // Handle cursor change on hover
  useEffect(() => {
    if (hovered && isVisible) {
      gl.domElement.style.cursor = 'pointer';
    } else {
      gl.domElement.style.cursor = ''; // Revert to default (inherited)
    }
    return () => { gl.domElement.style.cursor = ''; };
  }, [hovered, isVisible, gl]);

  const handlePointerOver = (e: any) => {
    if (!isVisible) return; 
    e.stopPropagation(); 
    setHovered(true);
    onHover(products, { x: e.clientX, y: e.clientY });
  };

  const handlePointerOut = (e: any) => {
    if (!isVisible) return;
    setHovered(false);
    onHover(null);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handlePointerOver}
    >
      <Sphere args={[baseRadius, 32, 32]}>
        <meshStandardMaterial
          color={displayColor}
          roughness={0.5}
          metalness={0.1} 
          emissive={displayColor} 
          emissiveIntensity={hovered && isVisible ? 0.4 : 0.15} 
          transparent={false} // Solid nodes ensure better color representation
          depthWrite={true} 
        />
      </Sphere>

      {isCluster && (
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            // Position the text slightly in front of the sphere (towards camera)
            position={[0, 0, baseRadius + 1]} 
            fontSize={baseRadius * 0.7}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={baseRadius * 0.08}
            outlineColor="#000000"
            fontWeight="bold"
          >
            {count.toString()}
          </Text>
        </Billboard>
      )}
    </group>
  );
};