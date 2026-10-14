import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

function Sculpture({ still }) {
  const mesh = useRef(null);
  useFrame((_state, delta) => {
    if (!still && mesh.current) mesh.current.rotation.y += delta * 0.2;
  });
  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[1, 0.3, 128, 16]} />
      <meshStandardMaterial color="#8a919b" />
    </mesh>
  );
}

export function Hero() {
  const reduce = usePrefersReducedMotion();
  return (
    <section aria-labelledby="hero-title">
      <h1 id="hero-title">Cast in light</h1>
      <p>A study of one shape under changing light.</p>
      {hasWebGL() ? (
        <Canvas aria-hidden="true" dpr={[1, 2]} frameloop={reduce ? 'demand' : 'always'} gl={{ powerPreference: 'low-power' }}>
          <ambientLight intensity={0.6} />
          <Sculpture still={reduce} />
        </Canvas>
      ) : (
        <img src="/sculpture.jpg" alt="The sculpture photographed in morning light" />
      )}
    </section>
  );
}
