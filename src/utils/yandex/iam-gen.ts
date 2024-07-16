import axios from 'axios';
import { JWK, JWS } from 'node-jose';

import { getConfig } from '../../config';
import { Logger } from '../../logger';

interface YandexTokenData {
  iamToken: string;
  expiresAt: string;
}

interface CacheTokenData {
  token: string;
  expiresAt: number;
}

const {
  yandex: { serviceIdentity, keyIdentity, keyPem, refreshTime },
} = getConfig();

let tokenData: CacheTokenData | undefined;

export async function getToken() {
  if (!tokenData || tokenData.expiresAt - Date.now() - refreshTime * 1000 < 0) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
      iss: serviceIdentity,
      iat: now,
      // 60 hardcoded because not need more, used only for get IAM token
      exp: now + 60,
    };

    const jwtKey = await JWK.asKey(keyPem, 'pem', {
      kid: keyIdentity,
      alg: 'PS256',
    });

    const jwt = await JWS.createSign({ format: 'compact' }, jwtKey).update(JSON.stringify(payload)).final();

    try {
      const response = await axios.post<YandexTokenData>(
        'https://iam.api.cloud.yandex.net/iam/v1/tokens',
        {
          jwt,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      tokenData = {
        token: response.data.iamToken,
        expiresAt: new Date(response.data.expiresAt).getTime(),
      };
    } catch (e: any) {
      Logger.error('Got error on request IAM token', JSON.stringify(e.response.data));
      throw new Error(JSON.stringify(e.response.data));
    }
  }

  return tokenData.token;
}
