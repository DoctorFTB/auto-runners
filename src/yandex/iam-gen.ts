import { JWK, JWS } from 'node-jose';
import axios from 'axios';
import fs from 'fs';
import { Logger } from '../logger';

interface TokenData {
  iamToken: string;
  expiresAt: string;
}

interface Options {
  serviceIdentity: string;
  keyIdentity: string;
  keyPem: string | Buffer;
  refreshTime: number;
}

const options = ((): Options => {
  const serviceIdentity = process.env.YANDEX_SERVICE_IDENTITY;
  const keyIdentity = process.env.YANDEX_KEY_IDENTITY;
  const keyPemPath = process.env.YANDEX_KEY_PEM_PATH;
  const keyPemIn = process.env.YANDEX_KEY_PEM;
  const refreshTime = process.env.YANDEX_REFRESH_TIME ? +process.env.YANDEX_REFRESH_TIME : 1 * 60 * 60;

  if (!serviceIdentity) throw new Error('YANDEX_SERVICE_IDENTITY variable not configured');
  if (!keyIdentity) throw new Error('YANDEX_KEY_IDENTITY variable not configured');

  if (!keyPemIn && !keyPemPath) throw new Error('YANDEX_KEY_PEM_PATH OR YANDEX_KEY_PEM variable not configured');

  if (keyPemPath && !fs.existsSync(process.cwd() + keyPemPath)) throw new Error('File on YANDEX_KEY_PEM_PATH path not exists');

  const keyPem = keyPemIn || fs.readFileSync(process.cwd() + keyPemPath!);

  if (!refreshTime || isNaN(+refreshTime)) throw new Error('YANDEX_REFRESH_TIME variable not configured or its not number');
  if (+refreshTime > 12 * 60 * 60) throw new Error('Max YANDEX_REFRESH_TIME is 12 hours');

  return {
    serviceIdentity,
    keyIdentity,
    keyPem,
    refreshTime: +refreshTime,
  };
})();

let tokenData: TokenData | null = null;

export async function getToken() {
  const { serviceIdentity, keyIdentity, keyPem, refreshTime } = options;

  if (
    !tokenData ||
    new Date(tokenData.expiresAt).getTime() - new Date().getTime() - refreshTime * 1000 < 0
  ) {
    const now = Math.floor(new Date().getTime() / 1000);

    const payload = {
      aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
      iss: serviceIdentity,
      iat: now,
      exp: now + 60, // 60 hardcoded because not need more, used only for get IAM token
    };

    const jwt_key = await JWK.asKey(keyPem, 'pem', {
      kid: keyIdentity,
      alg: 'PS256',
    });

    const jwt = await JWS.createSign({ format: 'compact' }, jwt_key)
      .update(JSON.stringify(payload))
      .final();

    try {
      const response = await axios.post<TokenData>(
        'https://iam.api.cloud.yandex.net/iam/v1/tokens',
        {
          jwt,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      tokenData = response.data;
    } catch (e: any) {
      Logger.error('Got error on request IAM token', JSON.stringify(e.response.data));
      throw new Error(JSON.stringify(e.response.data));
    }
  }

  return tokenData.iamToken;
}
