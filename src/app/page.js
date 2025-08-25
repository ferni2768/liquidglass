import FloatingShapes from './components/FloatingBackground';
import TextTransition from './components/TextTransition';

export default function Home() {
  return (
    <main className="rainbow-bg flex items-center justify-center h-screen w-screen fixed inset-0 overflow-hidden">
      <FloatingShapes />
      <div>
        <TextTransition />
      </div>
    </main>
  );
}
