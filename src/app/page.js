import FloatingShapes from './components/FloatingBackground';
import SwirlBackground from './components/SwirlBackground';
import TextTransition from './components/TextTransition';

export default function Home() {
  const SHOW_FLOATING_SHAPES = false;
  return (
    <main className="rainbow-bg hide-rainbow flex items-center justify-center h-screen w-screen fixed inset-0 overflow-hidden">
      {/* Swirl effect background */}
      <SwirlBackground />
      {/* Legacy background with easy re-enable */}
      {SHOW_FLOATING_SHAPES && <FloatingShapes />}
      <div>
        <TextTransition />
      </div>
    </main>
  );
}
