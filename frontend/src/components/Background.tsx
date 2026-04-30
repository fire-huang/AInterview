import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

const Background: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse values
  const springConfig = { damping: 50, stiffness: 300 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate relative position (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-white">
      {/* Dynamic Mesh Gradients */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-blue-50/50 rounded-[100%] blur-[120px] mix-blend-multiply"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[80%] bg-indigo-50/50 rounded-[100%] blur-[120px] mix-blend-multiply"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-slate-50/40 rounded-[100%] blur-[100px] mix-blend-multiply"
        />
      </div>

      {/* Mouse Reactive Layer */}
      <div className="absolute inset-0 z-10 opacity-50">
        <motion.div
          style={{
            x: smoothX,
            y: smoothY,
            translateX: '-50%',
            translateY: '-50%',
            left: '30%',
            top: '30%',
          }}
          className="absolute w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[100px]"
        />
        <motion.div
          style={{
            x: smoothX,
            y: smoothY,
            translateX: '-50%',
            translateY: '-50%',
            left: '70%',
            top: '70%',
          }}
          className="absolute w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px]"
        />
      </div>
      
      {/* Texture & Grids */}
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
           
      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,255,255,0.3)] pointer-events-none" />
    </div>
  );
};

export default Background;
