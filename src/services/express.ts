import { urlencoded, json } from 'body-parser';
import express from 'express';

import { getConfig } from '../config';
import { Logger } from '../logger';

import { currentJobs, triggerNewHook, triggerResetJob } from './storage';

const {
  port,
  gitlab: { webhookSecret },
} = getConfig();

export function setupExpress() {
  const app = express();
  app.use(urlencoded({ extended: false }));
  app.use(json());

  app.post('/webhook', async (req, res) => {
    if (
      req.headers['content-type'] !== 'application/json' ||
      !req.headers['user-agent']?.startsWith('GitLab/') ||
      req.headers['x-gitlab-event'] !== 'Job Hook' ||
      typeof req.headers['x-gitlab-instance'] !== 'string' ||
      req.headers['x-gitlab-token'] !== webhookSecret ||
      req.body.object_kind !== 'build'
    ) {
      return res.status(400).send('Bad Request');
    }

    const instanceUrl = req.headers['x-gitlab-instance'] as string;

    triggerNewHook.next({ hook: req.body, instanceUrl });

    res.status(200).send('ok');
  });

  app.post('/list', async (req, res) => {
    if (req.headers['token'] !== webhookSecret) {
      return res.status(400).send('Bad Request');
    }

    res.status(200).send(currentJobs.value);
  });

  app.post('/job-reset', async (req, res) => {
    if (req.headers['token'] !== webhookSecret || typeof req.body.id !== 'string') {
      return res.status(400).send('Bad Request');
    }

    triggerResetJob.next(req.body.id);

    res.status(200).send('ok');
  });

  app.listen(port, () => Logger.info(`Started on http://localhost:${port}`));
}
