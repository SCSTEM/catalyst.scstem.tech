import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import { type Mesh, Object3D } from "three";
import { useMediaQuery } from "usehooks-ts";
import {
  createDisplacementTexture,
  createGridTexture,
  createMetalnessTexture,
  createSunTexture,
} from "./textures";

const TERRAIN_LENGTH = 4;
const SCROLL_SPEED = 0.1;

function Terrain() {
  const gridMap = useMemo(createGridTexture, []);
  const dispMap = useMemo(createDisplacementTexture, []);
  const metalMap = useMemo(createMetalnessTexture, []);

  const plane1 = useRef<Mesh>(null);
  const plane2 = useRef<Mesh>(null);
  const plane3 = useRef<Mesh>(null);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useFrame(({ clock }) => {
    if (reducedMotion) {
      return;
    }
    const t = clock.getElapsedTime() * SCROLL_SPEED;
    const cycle = t % TERRAIN_LENGTH;
    if (plane1.current) {
      plane1.current.position.z = cycle;
    }
    if (plane2.current) {
      plane2.current.position.z = cycle - TERRAIN_LENGTH;
    }
    if (plane3.current) {
      plane3.current.position.z = cycle - 2 * TERRAIN_LENGTH;
    }
  });

  const materialProps = {
    map: gridMap,
    displacementMap: dispMap,
    displacementScale: 0.4,
    metalnessMap: metalMap,
    metalness: 0.96,
    roughness: 0.5,
  } as const;

  return (
    <>
      <mesh
        ref={plane1}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 0]}
      >
        <planeGeometry args={[1, TERRAIN_LENGTH, 24, 24]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      <mesh
        ref={plane2}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, -TERRAIN_LENGTH]}
      >
        <planeGeometry args={[1, TERRAIN_LENGTH, 24, 24]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
      <mesh
        ref={plane3}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, -2 * TERRAIN_LENGTH]}
      >
        <planeGeometry args={[1, TERRAIN_LENGTH, 24, 24]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </>
  );
}

function Sun() {
  const sunMap = useMemo(createSunTexture, []);
  return (
    <mesh position={[0, 0.45, -1.5]}>
      <circleGeometry args={[0.55, 64]} />
      <meshBasicMaterial
        map={sunMap}
        transparent
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function SpotLights() {
  const rightTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(-0.25, 0.25, 0.25);
    return o;
  }, []);
  const leftTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(0.25, 0.25, 0.25);
    return o;
  }, []);

  return (
    <>
      <primitive object={rightTarget} />
      <spotLight
        color="#ff3d8f"
        intensity={20}
        distance={25}
        angle={Math.PI * 0.1}
        penumbra={0.25}
        position={[0.5, 0.75, 2.2]}
        target={rightTarget}
      />
      <primitive object={leftTarget} />
      <spotLight
        color="#ff3d8f"
        intensity={20}
        distance={25}
        angle={Math.PI * 0.1}
        penumbra={0.25}
        position={[-0.5, 0.75, 2.2]}
        target={leftTarget}
      />
    </>
  );
}

export function VaporwaveCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.06, 1.1], fov: 75, near: 0.01, far: 20 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -2,
        pointerEvents: "none",
        overflow: "visible",
      }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0a061a"]} />
      <fogExp2 attach="fog" args={["#0a061a", 0.55]} />

      <ambientLight intensity={0.5} />
      <SpotLights />

      <Sun />
      <Terrain />

      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <ChromaticAberration
          offset={[0.0015, 0]}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </Canvas>
  );
}
