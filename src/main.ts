import 'dotenv-flow/config';

import { setupExpress } from './express';
import { webhookHandler } from './handler';

async function bootstrap() {
  const handlerData = await webhookHandler();
  setupExpress(handlerData);
}

bootstrap();
