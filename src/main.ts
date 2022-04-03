import 'dotenv-flow/config';

import { setupExpress } from './express';
import { webhookHandler } from './handler';

async function bootstrap() {
  const handler = await webhookHandler();
  setupExpress((data) => handler(data));
}

bootstrap();
