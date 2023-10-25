import axios from 'axios';
import { Logger } from '../logger';
import { WebhookGitlabBody } from '../interfaces';

const { gitlabDomain, gitlabToken } = (() => {
  const gitlabDomain = process.env.GITLAB_DOMAIN;
  const gitlabToken = process.env.GITLAB_TOKEN;

  if (!gitlabDomain) throw new Error('GITLAB_DOMAIN variable not configured');
  if (!gitlabToken) throw new Error('GITLAB_TOKEN variable not configured');

  return { gitlabDomain, gitlabToken };
})();

export async function getPipelineStatusById(
  projectId: number,
  id: number | string
): Promise<WebhookGitlabBody["object_attributes"]["status"] | 'error'> {
  const url = `${gitlabDomain}/api/v4/projects/${projectId}/pipelines/${id}`;

  try {
    return (await axios.get(url, { headers: { 'PRIVATE-TOKEN': gitlabToken } })).data.status;
  } catch (e: any) {
    Logger.error(`Got error on request pipeline status by project id: ${projectId}, id ${id}`, JSON.stringify(e.response.data));

    if (e.response.data.message === '404 Not found') {
      return 'canceled';
    }

    return 'error';
  }
}
