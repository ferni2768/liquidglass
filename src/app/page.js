import FloatingShapes from './components/FloatingBackground';

export default function Home() {
  return (
    <main className="rainbow-bg flex items-center justify-center relative">
      <FloatingShapes />
      <div className="glass-container relative z-20">
        <div className="text-white text-4xl font-bold text-center drop-shadow-lg">
          <h1>LiquidGlass</h1>
        </div>
      </div>
    </main>
  );
}
