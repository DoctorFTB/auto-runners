import axios from 'axios';

import { getConfig } from '../config';
import { JobStorageValue, JobWebhookGitlabBody } from '../interfaces';
import { Logger } from '../logger';

const {
  gitlab: { token },
} = getConfig();

export async function getJobStatusByData({
  instanceUrl,
  projectId,
  jobId,
}: JobStorageValue): Promise<JobWebhookGitlabBody['build_status'] | 'error'> {
  const url = `${instanceUrl}/api/v4/projects/${projectId}/jobs/${jobId}`;

  try {
    return (await axios.get(url, { headers: { 'PRIVATE-TOKEN': token } })).data.status;
  } catch (e: any) {
    if (e.response.data?.message === '404 Not found') {
      return 'canceled';
    }

    Logger.error(
      `Got error on request job status by project id: ${projectId}, id ${jobId}`,
      JSON.stringify(e.response.data)
    );

    return 'error';
  }
}
