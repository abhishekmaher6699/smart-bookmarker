type CounterName =
  | "http_requests_total"
  | "http_errors_total"
  | "rate_limit_rejections_total"
  | "jobs_completed_total"
  | "jobs_failed_total"
  | "jobs_retried_total";

type MetricsSnapshot = {
  counters: Record<CounterName, number>;
  http: {
    totalDurationMs: number;
    requestsWithDuration: number;
  };
  jobs: {
    totalDurationMs: number;
    completedWithDuration: number;
  };
};

const counters: Record<CounterName, number> = {
  http_requests_total: 0,
  http_errors_total: 0,
  rate_limit_rejections_total: 0,
  jobs_completed_total: 0,
  jobs_failed_total: 0,
  jobs_retried_total: 0,
};

let httpTotalDurationMs = 0;
let httpRequestsWithDuration = 0;

let jobTotalDurationMs = 0;
let jobsCompletedWithDuration = 0;

export function incrementMetric(
  name: CounterName,
  amount = 1,
) {
  counters[name] += amount;
}

export function recordHttpDuration(durationMs: number) {
  httpTotalDurationMs += durationMs;
  httpRequestsWithDuration += 1;
}

export function recordJobDuration(durationMs: number) {
  jobTotalDurationMs += durationMs;
  jobsCompletedWithDuration += 1;
}

export function getMetrics(): MetricsSnapshot {
  return {
    counters: { ...counters },

    http: {
      totalDurationMs: httpTotalDurationMs,
      requestsWithDuration: httpRequestsWithDuration,
    },

    jobs: {
      totalDurationMs: jobTotalDurationMs,
      completedWithDuration: jobsCompletedWithDuration,
    },
  };
}