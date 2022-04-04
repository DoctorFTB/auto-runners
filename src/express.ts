import express from 'express';
import { urlencoded, json } from 'body-parser';
import { IWebhookHandlerData } from './interfaces';
import { Logger } from './logger';

export function setupExpress(webhookData: IWebhookHandlerData) {
  const app = express();
  app.use(urlencoded({ extended: false }));
  app.use(json());

  app.post('/webhook', async (req, res) => {
    if (
      req.headers['content-type'] !== 'application/json' ||
      req.headers['x-gitlab-event'] !== 'Pipeline Hook' ||
      req.headers['x-gitlab-token'] !== process.env.GITLAB_WEBHOOK_SECRET ||
      req.body.object_kind !== 'pipeline'
    ) {
      return res.status(400).send('Bad Request');
    }

    webhookData.onNewWebhook(req.body);

    res.status(200).send('ok');
  });

  app.post('/list', async (req, res) => {
    if (req.headers['token'] !== process.env.GITLAB_WEBHOOK_SECRET) {
      return res.status(400).send('Bad Request');
    }

    res.status(200).send(webhookData.currentPipelines);
  });

  app.post('/reset', async (req, res) => {
    if (req.headers['token'] !== process.env.GITLAB_WEBHOOK_SECRET) {
      return res.status(400).send('Bad Request');
    }

    webhookData.stopInstanceTimeout(-1);

    res.status(200).send('ok');
  });

  app.listen(process.env.PORT, () => Logger.log(`Started on http://localhost:${process.env.PORT}`));
}
