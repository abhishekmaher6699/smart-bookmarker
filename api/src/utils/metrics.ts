import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  register,
} from "@prometheus-io/client";

type CounterName =
  | "http_requests_total"
  | "http_errors_total"
  | "rate_limit_rejections_total"
  | "jobs_completed_total"
  | "jobs_failed_total"
  | "jobs_retried_total";

type MetricLabels = {
  method?: string;
  route?: string;
  status_code?: string;
  type?: string;
};

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
});

const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["method", "route", "status_code"] as const,
});

const rateLimitRejectionsTotal = new Counter({
  name: "rate_limit_rejections_total",
  help: "Total number of rate limit rejections",
  labelNames: ["route"] as const,
});

const jobsCompletedTotal = new Counter({
  name: "jobs_completed_total",
  help: "Total number of completed enrichment jobs",
  labelNames: ["type"] as const,
});

const jobsFailedTotal = new Counter({
  name: "jobs_failed_total",
  help: "Total number of failed enrichment jobs",
  labelNames: ["type"] as const,
});

const jobsRetriedTotal = new Counter({
  name: "jobs_retried_total",
  help: "Total number of retried enrichment jobs",
  labelNames: ["type"] as const,
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const jobDuration = new Histogram({
  name: "enrichment_job_duration_seconds",
  help: "Enrichment job duration in seconds",
  labelNames: ["type"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
});

collectDefaultMetrics();

export function incrementMetric(
  name: CounterName,
  amount = 1,
  labels: MetricLabels = {},
) {
  switch (name) {
    case "http_requests_total":
      httpRequestsTotal.inc(
        {
          method: labels.method ?? "unknown",
          route: labels.route ?? "unknown",
          status_code: labels.status_code ?? "unknown",
        },
        amount,
      );
      break;

    case "http_errors_total":
      httpErrorsTotal.inc(
        {
          method: labels.method ?? "unknown",
          route: labels.route ?? "unknown",
          status_code: labels.status_code ?? "unknown",
        },
        amount,
      );
      break;

    case "rate_limit_rejections_total":
      rateLimitRejectionsTotal.inc(
        {
          route: labels.route ?? "unknown",
        },
        amount,
      );
      break;

    case "jobs_completed_total":
      jobsCompletedTotal.inc(
        {
          type: labels.type ?? "unknown",
        },
        amount,
      );
      break;

    case "jobs_failed_total":
      jobsFailedTotal.inc(
        {
          type: labels.type ?? "unknown",
        },
        amount,
      );
      break;

    case "jobs_retried_total":
      jobsRetriedTotal.inc(
        {
          type: labels.type ?? "unknown",
        },
        amount,
      );
      break;
  }
}

export function recordHttpDuration(
  durationMs: number,
  labels: MetricLabels = {},
) {
  httpRequestDuration.observe(
    {
      method: labels.method ?? "unknown",
      route: labels.route ?? "unknown",
      status_code: labels.status_code ?? "unknown",
    },
    durationMs / 1000,
  );
}

export function recordJobDuration(
  durationMs: number,
  labels: MetricLabels = {},
) {
  jobDuration.observe(
    {
      type: labels.type ?? "unknown",
    },
    durationMs / 1000,
  );
}

export async function getMetrics() {
  return register.metrics();
}

export function getMetricsContentType() {
  return register.contentType;
}