'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Wifi, Tv, Wind, Fan } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { RoomBookingForm } from './room-booking-form'

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE #2 FIX: Deep-clone geometry so two canvases never share the same
// ArrayBuffers. `scene.clone()` is a shallow clone — geometry attribute buffers
// (position, UV) remain shared. On mobile, two WebGL contexts uploading the
// SAME ArrayBuffer concurrently causes GPU data corruption / fragmentation.
// ─────────────────────────────────────────────────────────────────────────────
function deepCloneScene(scene: THREE.Group): THREE.Group {
  const clone = scene.clone(true)
  clone.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh && mesh.geometry) {
      mesh.geometry = mesh.geometry.clone()
    }
  })
  return clone
}

function Model({ url, isMobile }: { url: string; isMobile: boolean }) {
  const { scene } = useGLTF(url)

  // Deep clone — geometry ArrayBuffers are NOT shared between canvases
  const clonedScene = useMemo(
    () => deepCloneScene(scene as unknown as THREE.Group),
    [scene]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // ROOT CAUSE #1 FIX (mobile-only): Both GLBs use UNSIGNED_INT (32-bit)
  // index buffers with 87k–125k vertices. On WebGL1 Android devices that lack
  // the OES_element_index_uint extension, indices beyond 65535 silently wrap,
  // sending vertices to wrong positions → the "shattered polygon" look.
  //
  // Fix: re-index geometry into Uint16 chunks (≤65535 unique vertices each)
  // only on mobile. Desktop geometry is untouched.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMobile) return

    clonedScene.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh || !mesh.geometry) return

      const geo = mesh.geometry
      const indexAttr = geo.index

      // Only patch Uint32 index buffers (which need OES_element_index_uint)
      if (!indexAttr || !(indexAttr.array instanceof Uint32Array)) return

      const srcIndices = indexAttr.array as Uint32Array
      const posAttr = geo.attributes.position as THREE.BufferAttribute
      const uvAttr = geo.attributes.uv as THREE.BufferAttribute

      // Remap: visit each referenced vertex once, build compact Uint16-safe buffers
      const CHUNK = 65535
      const vertexMap = new Map<number, number>()
      const newPos: number[] = []
      const newUV: number[] = []
      const newIdx: number[] = []

      for (let i = 0; i < srcIndices.length; i++) {
        const orig = srcIndices[i]
        if (!vertexMap.has(orig)) {
          const next = newPos.length / 3
          vertexMap.set(orig, next)
          newPos.push(posAttr.getX(orig), posAttr.getY(orig), posAttr.getZ(orig))
          if (uvAttr) newUV.push(uvAttr.getX(orig), uvAttr.getY(orig))
        }
        newIdx.push(vertexMap.get(orig)!)
      }

      // Replace attributes in-place
      geo.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3))
      if (newUV.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(newUV, 2))

      // Use Uint16 if we fit, otherwise keep Uint32 (WebGL2 supports it natively)
      const IndexCtor = newPos.length / 3 <= 65535 ? Uint16Array : Uint32Array
      geo.setIndex(new THREE.BufferAttribute(new IndexCtor(newIdx), 1))
      geo.computeVertexNormals()

      // Make double-sided: photogrammetry meshes have no exterior normals;
      // on mobile the culling threshold differs and faces go missing
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => { if (m) m.side = THREE.DoubleSide })
    })
  }, [clonedScene, isMobile])

  return <primitive object={clonedScene} scale={1.5} position={[0, -1, 0]} />
}

const rooms = [
  {
    id: '686dd62c-10ca-4fac-b06c-c7afd80aebf6',
    name: 'AC Room 1',
    model: '/models/model4.glb',
    description: 'Comfortable air-conditioned room (Room 101)',
    price: 1500,
    amenities: [
      { icon: Wifi, label: 'Free WiFi' },
      { icon: Tv, label: 'Smart TV' },
      { icon: Wind, label: 'AC' },
    ]
  },
  {
    id: '686dd62c-10ca-4fac-b06c-c7afd80aebf6-2',
    roomTypeId: '686dd62c-10ca-4fac-b06c-c7afd80aebf6',
    name: 'AC Room 2',
    model: '/models/model4.glb',
    description: 'Comfortable air-conditioned room (Room 102)',
    price: 1500,
    amenities: [
      { icon: Wifi, label: 'Free WiFi' },
      { icon: Tv, label: 'Smart TV' },
      { icon: Wind, label: 'AC' },
    ]
  },
  {
    id: '4df76b86-defa-4967-b8fb-f97653215847',
    name: 'Standard Room',
    model: '/models/model1.glb',
    description: 'Cozy standard non-ac room (Room 103)',
    price: 1200,
    amenities: [
      { icon: Wifi, label: 'Free WiFi' },
      { icon: Tv, label: 'Smart TV' },
      { icon: Fan, label: 'Fan' },
    ]
  }
]

export function RoomsPreview() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <section id="rooms" className="py-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-2">Rooms &amp; Stay</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1]">
            Rest in Luxury.
          </h2>
        </div>
        <Link
          href="https://wa.me/9779855073719?text=I%20want%20to%20book%20a%20room"
          target="_blank" rel="noopener noreferrer"
          className="shrink-0 h-10 inline-flex items-center justify-center rounded-full border border-primary px-7 text-xs font-semibold uppercase tracking-wider text-primary transition-all hover:bg-primary hover:text-white"
        >
          Contact Us
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15, duration: 0.7 }}
            className="group flex flex-col sm:flex-row rounded-2xl border border-black/5 bg-background overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500"
          >
            {/* 3D Model Viewer */}
            <div className="relative w-full sm:w-2/5 aspect-[16/10] sm:aspect-auto overflow-hidden bg-gray-50/50 flex items-center justify-center">
              <Canvas
                camera={{ position: [0, 1.5, 4], fov: 65, near: 0.1, far: 1000 }}
                frameloop="demand"
                // ── MOBILE-ONLY renderer overrides (desktop = undefined = default) ──
                // precision:'highp'   → forces 32-bit float vertex math on Android
                //                       (Mali/Adreno default to mediump → coord snapping)
                // antialias:false     → saves 4× GPU memory bandwidth on mobile
                // preserveDrawingBuffer → stabilises frame output on old GPUs
                // powerPreference     → requests the high-perf GPU on dual-GPU phones
                // dpr clamped to 2    → prevents DPR-3/4 devices overflowing VRAM
                dpr={isMobile
                  ? Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)
                  : undefined}
                gl={isMobile ? {
                  precision: 'highp',
                  powerPreference: 'high-performance',
                  antialias: false,
                  preserveDrawingBuffer: true,
                } : undefined}
              >
                <ambientLight intensity={1} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Environment preset="city" />
                <Suspense fallback={null}>
                  <Model url={room.model} isMobile={isMobile} />
                </Suspense>
                <OrbitControls makeDefault enableZoom={false} autoRotate={false} />
              </Canvas>
            </div>

            <div className="w-full sm:w-3/5 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-serif text-xl text-primary">{room.name}</h3>
                </div>
                <p className="text-xs text-foreground/65 mb-4 leading-relaxed">{room.description}</p>

                <div className="flex flex-wrap gap-3 mb-5">
                  {room.amenities.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/55 font-medium">
                      <amenity.icon className="h-3.5 w-3.5" />
                      {amenity.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-foreground/45 font-semibold mb-0.5">Price</p>
                  <p className="font-serif text-lg text-primary">NPR {room.price} <span className="text-xs font-sans text-foreground/45">/night</span></p>
                </div>
                <RoomBookingForm
                  roomName={room.name}
                  roomTypeId={room.roomTypeId || room.id}
                  price={room.price}
                  trigger={
                    <button className="h-9 rounded-full bg-primary px-5 text-[11px] font-semibold uppercase tracking-wider text-white transition-all hover:bg-primary/90">
                      Book Now
                    </button>
                  }
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
