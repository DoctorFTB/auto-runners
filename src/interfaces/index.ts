export interface JobWebhookGitlabBody {
  // job kind
  object_kind: 'build';

  // branch
  ref: string;

  // job id
  build_id: string;

  // job status
  build_status: 'created' | 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual';

  // project id
  project_id: number;

  // project name
  project_name: string;

  // job author
  user: {
    username: string;
  };
}

export interface JobStorageValue {
  instanceUrl: string;
  projectId: number;
  jobId: string;
}
