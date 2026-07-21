'use client'

import { Section } from '@/components/ui/section'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Star, Quote } from 'lucide-react'
import Image from 'next/image'

const reviews = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Guest',
    avatar: '/images/logo.jpeg',
    content: 'The perfect weekend getaway. The food was incredible, especially the local dishes, and the pool area is just beautiful. We will definitely be coming back!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Food Enthusiast',
    avatar: '/images/logo.jpeg',
    content: 'A hidden gem! The attention to detail in every dish shows the chef\'s dedication. Highly recommend trying their house specials. The ambiance is top-notch.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Davis',
    role: 'Event Organizer',
    avatar: '/images/logo.jpeg',
    content: 'We hosted our family reunion here and it was flawless. The staff is extremely accommodating and the rooms are very comfortable. A luxury experience through and through.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Aarav Sharma',
    role: 'Local Resident',
    avatar: '/images/logo.jpeg',
    content: 'Best place in town for a relaxing evening. The vibe is exactly what you need after a long week. Great service and beautiful surroundings.',
    rating: 4,
  }
]

export function Reviews() {
  return (
    <Section id="reviews" className="bg-secondary/30 !py-14">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-2">Guest Experiences</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1]">
            Don't Just Take Our Word For It.
          </h2>
        </div>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 sm:-ml-6">
          {reviews.map((review) => (
            <CarouselItem key={review.id} className="pl-4 sm:pl-6 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <div className="bg-white rounded-2xl p-5 h-full flex flex-col border border-black/5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <Quote className="h-7 w-7 text-accent/20 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-accent text-accent' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground/75 leading-relaxed mb-5 flex-grow font-light">
                  "{review.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <Image
                    src={review.avatar}
                    alt={review.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover bg-secondary"
                  />
                  <div>
                    <p className="font-serif font-semibold text-sm text-primary">{review.name}</p>
                    <p className="text-[10px] text-foreground/45 uppercase tracking-wider">{review.role}</p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-end gap-2 mt-5">
          <CarouselPrevious className="relative inset-auto h-9 w-9 border-primary/20 hover:bg-primary hover:text-white" />
          <CarouselNext className="relative inset-auto h-9 w-9 border-primary/20 hover:bg-primary hover:text-white" />
        </div>
      </Carousel>
    </Section>
  )
}
