import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function createSaturnTexture() {
  const width = 1024
  const height = 512
  const data = new Uint8Array(width * height * 4)

  const bands = [
    [0.00, [116, 79, 48]],
    [0.12, [190, 145, 91]],
    [0.20, [220, 184, 133]],
    [0.29, [143, 103, 66]],
    [0.38, [218, 187, 145]],
    [0.47, [175, 130, 85]],
    [0.56, [225, 194, 150]],
    [0.65, [143, 102, 68]],
    [0.74, [207, 166, 113]],
    [0.84, [231, 200, 157]],
    [0.93, [151, 111, 76]],
    [1.00, [116, 79, 48]]
  ]

  for (let y = 0; y < height; y++) {
    const v = y / height
    let index = 0

    while (index < bands.length - 2 && v > bands[index + 1][0]) {
      index++
    }

    const a = bands[index]
    const b = bands[index + 1]
    const t = (v - a[0]) / (b[0] - a[0])
    const wave = Math.sin(v * 230) * 5 + Math.sin(v * 570) * 2

    for (let x = 0; x < width; x++) {
      const noise = (Math.random() - 0.5) * 9
      const offset = (y * width + x) * 4

      for (let c = 0; c < 3; c++) {
        data[offset + c] = THREE.MathUtils.clamp(
          a[1][c] * (1 - t) + b[1][c] * t + wave + noise,
          0,
          255
        )
      }

      data[offset + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat
  )

  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.needsUpdate = true

  return texture
}

function createRingGeometry(inner, outer) {
  const geometry = new THREE.RingGeometry(inner, outer, 256, 12)
  const positions = geometry.attributes.position
  const colors = []

  const innerColor = new THREE.Color('#795331')
  const goldColor = new THREE.Color('#d9bb8d')
  const paleColor = new THREE.Color('#eee0c4')

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const radius = Math.sqrt(x * x + y * y)
    const t = (radius - inner) / (outer - inner)

    let color

    if (t < 0.25) {
      color = innerColor.clone().lerp(goldColor, t / 0.25)
    } else if (t < 0.72) {
      color = goldColor.clone().lerp(paleColor, (t - 0.25) / 0.47)
    } else {
      color = paleColor.clone().lerp(innerColor, (t - 0.72) / 0.28)
    }

    const variation = 0.88 + Math.random() * 0.16
    colors.push(color.r * variation, color.g * variation, color.b * variation)
  }

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )

  return geometry
}

function Saturn() {
  const planet = useRef()
  const rings = useRef()

  const texture = useMemo(() => createSaturnTexture(), [])

  const ringGeometry = useMemo(
    () => createRingGeometry(1.35, 2.35),
    []
  )

  const innerRing = useMemo(
    () => new THREE.RingGeometry(1.27, 1.36, 256),
    []
  )

  const outerRing = useMemo(
    () => new THREE.RingGeometry(2.30, 2.37, 256),
    []
  )

  useFrame((state, delta) => {
    if (planet.current) {
      planet.current.rotation.y += delta * 0.12
      planet.current.rotation.z = 0.10
    }

    if (rings.current) {
      rings.current.rotation.z += delta * 0.018
    }
  })

  return (
    <group rotation={[0.12, 0, -0.08]}>
      <group ref={planet}>
        <mesh>
          <sphereGeometry args={[1.12, 96, 96]} />
          <meshPhysicalMaterial
            map={texture}
            roughness={0.82}
            metalness={0.02}
            clearcoat={0.12}
          />
        </mesh>

        <mesh scale={1.125}>
          <sphereGeometry args={[1.12, 64, 64]} />
          <meshBasicMaterial
            color="#d6a96e"
            transparent
            opacity={0.035}
            side={THREE.BackSide}
          />
        </mesh>

        <group ref={rings} rotation={[1.17, 0, 0.12]}>
          <mesh geometry={ringGeometry}>
            <meshStandardMaterial
              vertexColors
              side={THREE.DoubleSide}
              transparent
              opacity={0.88}
              roughness={0.85}
              metalness={0.12}
              depthWrite={false}
            />
          </mesh>

          <mesh geometry={innerRing}>
            <meshBasicMaterial
              color="#e3c69a"
              side={THREE.DoubleSide}
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>

          <mesh geometry={outerRing}>
            <meshBasicMaterial
              color="#b18a5b"
              side={THREE.DoubleSide}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function createGalaxy(count = 1800) {
  const positions = []
  const colors = []

  const colorA = new THREE.Color('#6d55c8')
  const colorB = new THREE.Color('#54b9d5')
  const colorC = new THREE.Color('#d4a2ed')

  for (let i = 0; i < count; i++) {
    const arm = i % 3
    const radius = Math.random() * 2.2
    const angle =
      arm * ((Math.PI * 2) / 3) +
      radius * 1.8 +
      (Math.random() - 0.5) * 0.65

    positions.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.48,
      (Math.random() - 0.5) * 0.3
    )

    const color = colorA.clone().lerp(
      colorB,
      Math.random() * 0.65
    ).lerp(colorC, Math.random() * 0.25)

    const brightness = 0.55 + Math.random() * 0.65

    colors.push(
      color.r * brightness,
      color.g * brightness,
      color.b * brightness
    )
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  )

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  )

  return geometry
}

function Galaxy({ position, scale, speed }) {
  const group = useRef()

  const geometry = useMemo(() => createGalaxy(), [])

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.z += delta * speed
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.12
    }
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.035}
          vertexColors
          transparent
          opacity={0.82}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

function StarField() {
  const geometry = useMemo(() => {
    const positions = []

    for (let i = 0; i < 1800; i++) {
      positions.push(
        (Math.random() - 0.5) * 19,
        (Math.random() - 0.5) * 12,
        -2 - Math.random() * 9
      )
    }

    const result = new THREE.BufferGeometry()

    result.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )

    return result
  }, [])

  const stars = useRef()

  useFrame((state) => {
    if (stars.current) {
      stars.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.025) * 0.025
    }
  })

  return (
    <points ref={stars} geometry={geometry}>
      <pointsMaterial
        color="#c5d9ff"
        size={0.018}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.48} />
      <directionalLight
        position={[-4, 3, 5]}
        intensity={3.2}
        color="#fff0d5"
      />
      <pointLight
        position={[3, -2, 2]}
        intensity={1.8}
        color="#6e8cff"
      />

      <StarField />

      <Galaxy
        position={[-4.2, 2.2, -5]}
        scale={0.9}
        speed={0.008}
      />

      <Galaxy
        position={[4.2, -2.1, -6]}
        scale={0.62}
        speed={-0.006}
      />

      <Saturn />
    </>
  )
}

export default function CampusHeroScene() {
  return (
    <div className="relative h-[400px] w-full sm:h-[490px] lg:h-[560px]" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 28%, black 100%)" }}>
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        }}
        style={{
          background: 'transparent',
          touchAction: 'pan-y'
        }}
      >
        <Scene />
        <OrbitControls
          makeDefault
          enableRotate
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.65}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
        />
      </Canvas>
    </div>
  )
}

