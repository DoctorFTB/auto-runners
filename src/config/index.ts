import { existsSync, lstatSync, readFileSync } from 'fs';

import Joi from 'joi';

interface IProcessEnvConfig {
  PORT: number;
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  FORCE_CONSOLE_LOGS: boolean;
  GITLAB_WEBHOOK_SECRET: string;
  GITLAB_TOKEN: string;
  GITLAB_REFETCH_INTERVAL: number;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_TOKEN?: string;
  STOP_INSTANCE_AFTER: number;
  YANDEX_INSTANCE_ID: string;
  YANDEX_SERVICE_IDENTITY: string;
  YANDEX_KEY_IDENTITY: string;
  YANDEX_KEY_PEM_PATH?: string;
  YANDEX_KEY_PEM?: string;
  YANDEX_REFRESH_TIME: number;
}

interface IAppConfig {
  port: IProcessEnvConfig['PORT'];
  logger: {
    level: IProcessEnvConfig['LOG_LEVEL'];
    forceConsoleLogs: IProcessEnvConfig['FORCE_CONSOLE_LOGS'];
  };
  gitlab: {
    webhookSecret: IProcessEnvConfig['GITLAB_WEBHOOK_SECRET'];
    token: IProcessEnvConfig['GITLAB_TOKEN'];
  };
  telegram?: {
    chatId: IProcessEnvConfig['TELEGRAM_CHAT_ID'];
    token: IProcessEnvConfig['TELEGRAM_TOKEN'];
  };
  fetching: {
    gitlab: IProcessEnvConfig['GITLAB_REFETCH_INTERVAL'];
  };
  stopInstanceAfter: IProcessEnvConfig['STOP_INSTANCE_AFTER'];
  yandex: {
    instanceId: IProcessEnvConfig['YANDEX_INSTANCE_ID'];
    serviceIdentity: IProcessEnvConfig['YANDEX_SERVICE_IDENTITY'];
    keyIdentity: IProcessEnvConfig['YANDEX_KEY_IDENTITY'];
    keyPem: string;
    refreshTime: IProcessEnvConfig['YANDEX_REFRESH_TIME'];
  };
}

const configSchema = Joi.object<IProcessEnvConfig>({
  PORT: Joi.number().required().port(),
  LOG_LEVEL: Joi.string().required().valid('DEBUG', 'INFO', 'WARN', 'ERROR').default('DEBUG'),
  FORCE_CONSOLE_LOGS: Joi.boolean().required(),
  GITLAB_WEBHOOK_SECRET: Joi.string().required(),
  GITLAB_TOKEN: Joi.string().required(),
  GITLAB_REFETCH_INTERVAL: Joi.number().required().integer().positive().allow(0),
  TELEGRAM_CHAT_ID: Joi.string().optional(),
  TELEGRAM_TOKEN: Joi.string().optional(),
  STOP_INSTANCE_AFTER: Joi.number().required().integer().positive().allow(0),
  YANDEX_INSTANCE_ID: Joi.string().required(),
  YANDEX_SERVICE_IDENTITY: Joi.string().required(),
  YANDEX_KEY_IDENTITY: Joi.string().required(),
  YANDEX_KEY_PEM_PATH: Joi.string().optional(),
  YANDEX_KEY_PEM: Joi.string().optional(),
  YANDEX_REFRESH_TIME: Joi.number()
    .required()
    .integer()
    .positive()
    .max(12 * 60 * 60),
})
  .and('TELEGRAM_CHAT_ID', 'TELEGRAM_TOKEN')
  .xor('YANDEX_KEY_PEM_PATH', 'YANDEX_KEY_PEM');

let loaded_config: IAppConfig | undefined;

function loadConfig() {
  // prevent log full process env
  const obj: Record<string, string> = {};

  Object.keys(configSchema.describe().keys).forEach((key) => {
    if (key in process.env) {
      obj[key] = process.env[key]!;
    }
  });

  const { value, error } = configSchema.validate(obj);

  if (error) {
    throw error;
  }

  let keyPem: string;

  if (value.YANDEX_KEY_PEM_PATH) {
    const path = process.cwd() + value.YANDEX_KEY_PEM_PATH;

    if (!existsSync(path) || !lstatSync(path).isFile()) {
      throw new Error('File on YANDEX_KEY_PEM_PATH path not exists');
    }

    keyPem = readFileSync(path).toString();
  } else {
    keyPem = value.YANDEX_KEY_PEM!;
  }

  let telegram: IAppConfig['telegram'];

  if (value.TELEGRAM_CHAT_ID && value.TELEGRAM_TOKEN) {
    telegram = {
      chatId: value.TELEGRAM_CHAT_ID,
      token: value.TELEGRAM_TOKEN,
    };
  }

  loaded_config = {
    port: value.PORT,
    logger: {
      level: value.LOG_LEVEL,
      forceConsoleLogs: value.FORCE_CONSOLE_LOGS,
    },
    gitlab: {
      webhookSecret: value.GITLAB_WEBHOOK_SECRET,
      token: value.GITLAB_TOKEN,
    },
    telegram,
    fetching: {
      gitlab: value.GITLAB_REFETCH_INTERVAL,
    },
    stopInstanceAfter: value.STOP_INSTANCE_AFTER,
    yandex: {
      instanceId: value.YANDEX_INSTANCE_ID,
      serviceIdentity: value.YANDEX_SERVICE_IDENTITY,
      keyIdentity: value.YANDEX_KEY_IDENTITY,
      keyPem,
      refreshTime: value.YANDEX_REFRESH_TIME,
    },
  };

  return loaded_config;
}

export function getConfig() {
  return loaded_config || loadConfig();
}
