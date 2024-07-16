import 'dotenv-flow/config';

import { setupExpress } from './services/express';
import { setupHandlers } from './services/handler';

function bootstrap() {
  setupHandlers();
  setupExpress();
}

bootstrap();
