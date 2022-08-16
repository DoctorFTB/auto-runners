export interface WebhookGitlabBody {
  object_kind: 'pipeline';
  object_attributes: {
    id: number;
    ref: string;
    status: 'created' | 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual';
    created_at: string;
    finished_at: string | null;
    duration: number | null;
  };
  user: {
    username: string;
  };
  project: {
    id: number;
    name: string;
    namespace: string;
    path_with_namespace: string;
  };
}

export interface IWebhookHandlerData {
  currentPipelines: Record<string, string>;
  resetStatus: () => void;
  onNewWebhook: (data: WebhookGitlabBody) => void;
}
