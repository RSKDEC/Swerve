import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import './styles/base.css';
import './styles/mobile.css';
import {
  browserStorage,
  LocalAttempts,
  LocalPlayers,
} from './services/storage.ts';
import { GameController } from './ui/controller.ts';
import type { GameClient } from './services/contracts.ts';

const storage = browserStorage();
async function bootstrap(): Promise<void> {
  let client: GameClient;
  let now = () => Date.now();
  if (import.meta.env.VITE_SWERVE_API_BASE) {
    const { HttpGameClient } = await import('./services/http-client.ts');
    const remote = new HttpGameClient(
      import.meta.env.VITE_SWERVE_API_BASE,
      storage,
    );
    client = remote;
    now = remote.now;
  } else {
    const { DemoClient } = await import('./services/demo-client.ts');
    const { demoChallenges } = await import('./services/demo-challenges.ts');
    client = new DemoClient(
      demoChallenges,
      new LocalPlayers(storage),
      new LocalAttempts(storage),
    );
  }
  await new GameController(client, () => storage.unavailable, now).mount();
}

void bootstrap().catch(() => {
  const app = document.getElementById('app')!;
  app.textContent =
    'Swerve could not start. Check the app configuration and reload.';
});
