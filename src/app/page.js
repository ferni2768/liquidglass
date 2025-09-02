import SwirlBackground from './components/SwirlBackground';
import TextTransition from './components/TextTransition';

export default function Home() {
  return (
    <main className="flex items-center justify-center fixed inset-0 overflow-hidden" style={{ width: '100dvw', height: '100dvh' }}>
      <SwirlBackground />
      <TextTransition />
    </main>
  );
}
