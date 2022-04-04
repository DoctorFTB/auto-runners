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
  path: string,
  id: number | string
): Promise<WebhookGitlabBody["object_attributes"]["status"]> {
  const url = `${gitlabDomain}/api/v4/projects/${path.replace(/\//g, '%2F')}/pipelines/${id}`;

  try {
    return (await axios.get(url, { headers: { 'PRIVATE-TOKEN': gitlabToken } })).data.status;
  } catch (e: any) {
    Logger.error('Got error on request pipeline status by id', JSON.stringify(e.response));
    throw new Error(e.response);
  }
}
