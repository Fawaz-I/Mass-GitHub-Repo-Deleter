import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const beams = Array.from({ length: 6 })

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        className
      )}
    >
      {beams.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.2, translateY: -100 }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            translateY: ['-100%', '100%'],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
          className="absolute top-0 w-px h-full bg-gradient-to-b from-transparent via-orange-500 to-transparent"
          style={{
            left: `${(i + 1) * 16.666}%`,
          }}
        />
      ))}
    </div>
  )
}