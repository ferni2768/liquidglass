import FloatingShapes from './components/FloatingBackground';
import LiquidGlassContainer from './components/LiquidGlassContainer';

export default function Home() {
  return (
    <main className="rainbow-bg flex items-center justify-center h-screen w-screen fixed inset-0 overflow-hidden">
      <FloatingShapes />
      <div>
        <LiquidGlassContainer>
          <h1 className="text-white text-5xl font-bold">LiquidGlass</h1>
        </LiquidGlassContainer>
      </div>
    </main>
  );
}
