import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewport, Text } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { Product } from '../types';
import { FilamentNode } from './FilamentNode';
import * as THREE from 'three';

// Augment JSX namespace to recognize React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      arrowHelper: any;
      gridHelper: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      arrowHelper: any;
      gridHelper: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}

interface SceneProps {
  allProducts: Product[];
  visibleProductIds: Set<string>;
  onNodeHover: (products: Product[] | null, screenPos?: { x: number, y: number }) => void;
  isDark: boolean;
}

// Helper to convert hex to RGB object
const hexToRgb = (hex: string) => {
  const fullHex = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Axis System with labels
const AxisSystem = ({ isDark }: { isDark: boolean }) => {
  const ticks = [0, 50, 100, 150, 200, 250];
  const tickColor = isDark ? "#cccccc" : "#222222";

  return (
    <group>
        {/* Axes Arrows (Length 280) */}
        <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 280, 0xff0000]} />
        <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 280, 0x00ff00]} />
        <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 280, 0x0000ff]} />

        {/* Labels */}
        <Text position={[300, 0, 0]} color="#ff4444" fontSize={12} anchorX="left">RED (X)</Text>
        <Text position={[0, 300, 0]} color="#44ff44" fontSize={12} anchorY="bottom">GREEN (Y)</Text>
        <Text position={[0, 0, 300]} color="#4444ff" fontSize={12} anchorX="left">BLUE (Z)</Text>

        {/* Numerical Ticks */}
        {ticks.map(val => {
            if (val === 0) return null; // Skip 0 to avoid clutter at origin
            return (
              <group key={val}>
                {/* X Axis Ticks */}
                <Text 
                  position={[val, -10, 0]} 
                  color={tickColor} 
                  fontSize={10} 
                  anchorX="center" 
                  anchorY="top"
                >
                  {val}
                </Text>
                
                {/* Y Axis Ticks */}
                <Text 
                  position={[-10, val, 0]} 
                  color={tickColor} 
                  fontSize={10} 
                  anchorX="right" 
                  anchorY="middle"
                >
                  {val}
                </Text>
                
                {/* Z Axis Ticks */}
                <Text 
                  position={[0, -10, val]} 
                  color={tickColor} 
                  fontSize={10} 
                  anchorX="center" 
                  anchorY="top"
                >
                  {val}
                </Text>
              </group>
            );
        })}
        
        {/* Origin Label */}
        <Text 
            position={[-5, -5, -5]} 
            color={tickColor} 
            fontSize={10} 
            anchorX="right" 
            anchorY="top"
        >
            0
        </Text>

        {/* Floor Grid positioned to cover positive octant roughly */}
        <gridHelper 
            args={[256, 8, isDark ? 0x000000 : 0xdddddd, isDark ? 0x111111 : 0xeeeeee]} 
            position={[128, 0, 128]} 
        />
    </group>
  );
}

// Wrapper to handle background color and camera setup
const SceneContent = ({ allProducts, visibleProductIds, onNodeHover, isDark }: SceneProps) => {
  const { scene } = useThree();
  const controlsRef = useRef<any>(null);
  
  // State for dynamic clustering threshold
  const [clusterThreshold, setClusterThreshold] = useState(15);

  useLayoutEffect(() => {
    const bgColor = isDark ? '#333333' : '#7f7f7f';
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.001);
  }, [isDark, scene]);

  // Dynamic Clustering Level of Detail
  useFrame((state) => {
    if (controlsRef.current) {
      const dist = state.camera.position.distanceTo(controlsRef.current.target);
      
      // Discrete levels to prevent flickering/constant re-calculation
      // As we zoom out (distance increases), we increase the threshold to group more items.
      let newThreshold = 15;
      
      if (dist > 800) newThreshold = 45;       // Very Far: Aggressive grouping
      else if (dist > 500) newThreshold = 30;  // Far
      else if (dist > 300) newThreshold = 15;  // Medium (Default)
      else newThreshold = 4;                   // Close: Only group very close duplicates

      if (newThreshold !== clusterThreshold) {
        setClusterThreshold(newThreshold);
      }
    }
  });

  // Clustering Logic
  const renderNodes = useMemo(() => {
    // 1. Filter visible products and calculate their positions
    const visibleProducts = allProducts.filter(p => visibleProductIds.has(p.id));
    
    // 2. Map to an intermediate structure with position
    const items = visibleProducts.map(p => {
      const rgb = hexToRgb(p.hex);
      return {
        product: p,
        x: rgb.r,
        y: rgb.g,
        z: rgb.b
      };
    });

    // 3. Greedy Clustering
    const clusters: { products: Product[], x: number, y: number, z: number }[] = [];
    
    // Use the dynamic threshold
    const THRESHOLD = clusterThreshold; 

    // Sort to ensure deterministic clustering
    items.sort((a, b) => a.product.id.localeCompare(b.product.id));

    for (const item of items) {
      let foundCluster = false;

      // Try to fit into an existing cluster
      for (const cluster of clusters) {
        // Calculate distance to cluster center
        const dx = cluster.x - item.x;
        const dy = cluster.y - item.y;
        const dz = cluster.z - item.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < THRESHOLD) {
          cluster.products.push(item.product);
          // Re-average center
          const n = cluster.products.length;
          cluster.x = ((cluster.x * (n - 1)) + item.x) / n;
          cluster.y = ((cluster.y * (n - 1)) + item.y) / n;
          cluster.z = ((cluster.z * (n - 1)) + item.z) / n;
          
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        // Create new cluster
        clusters.push({
          products: [item.product],
          x: item.x,
          y: item.y,
          z: item.z
        });
      }
    }

    return clusters;
  }, [allProducts, visibleProductIds, clusterThreshold]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[450, 350, 450]} fov={45} />
      <OrbitControls 
        ref={controlsRef}
        target={[128, 128, 128]} 
        maxPolarAngle={Math.PI} 
        minDistance={50} 
        maxDistance={1200} 
      />
      
      <ambientLight intensity={isDark ? 0.6 : 0.8} />
      <pointLight position={[500, 500, 500]} intensity={1} />
      <pointLight position={[-200, 200, -200]} intensity={0.5} />

      <AxisSystem isDark={isDark} />

      {renderNodes.map((node, index) => (
         <FilamentNode 
            key={node.products[0].id + (node.products.length > 1 ? '-cluster' : '')}
            products={node.products}
            position={[node.x, node.y, node.z]}
            isVisible={true}
            onHover={onNodeHover}
         />
      ))}

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
         <GizmoViewport axisColors={['#ff0000', '#00ff00', '#0000ff']} labelColor="white" />
      </GizmoHelper>

      <EffectComposer disableNormalPass={false}>
         <N8AO 
            aoRadius={20} 
            distanceFalloff={2} 
            intensity={1.5} 
            color="black"
         />
      </EffectComposer>
    </>
  );
}

export const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full relative" style={{ cursor: 'grab' }}>
      <Canvas 
        dpr={[1, 2]} 
        onPointerDown={(e) => (e.target as HTMLElement).style.cursor = 'grabbing'}
        onPointerUp={(e) => (e.target as HTMLElement).style.cursor = 'grab'}
        onPointerMissed={() => props.onNodeHover(null)}
        gl={{ antialias: true }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
};