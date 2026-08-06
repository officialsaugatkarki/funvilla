'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Wifi, Tv, Wind, Fan } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Bounds } from '@react-three/drei'
import { RoomBookingForm } from './room-booking-form'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(), [scene])
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
    id: '4df76b86-defa-4967-b8fb-f97653215847', // Using the same room_type_id
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
              <Canvas camera={{ position: [0, 2, 5], fov: 45 }} frameloop="demand">
                <ambientLight intensity={1} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Environment preset="city" />
                <Suspense fallback={null}>
                  <Bounds fit clip observe margin={1.2}>
                    <Model url={room.model} />
                  </Bounds>
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
