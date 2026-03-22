import type { MetricKey } from "@/lib/homepage-data";

type MetricCard = {
  key: MetricKey;
  label: string;
  value: number;
  detail: string;
};

type SummaryMetricsProps = {
  cards: MetricCard[];
  activeMetric: MetricKey;
  onMetricChange: (key: MetricKey) => void;
};

export function SummaryMetrics({
  cards,
  activeMetric,
  onMetricChange
}: SummaryMetricsProps) {
  return (
    <section className="metricGrid">
      {cards.map((metric) => (
        <button
          className={metric.key === activeMetric ? "metricCard metricCardActive" : "metricCard"}
          key={metric.key}
          type="button"
          onClick={() => onMetricChange(metric.key)}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <p>{metric.detail}</p>
        </button>
      ))}
    </section>
  );
}
