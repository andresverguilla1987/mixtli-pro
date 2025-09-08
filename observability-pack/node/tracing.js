// OpenTelemetry basic Node SDK setup with OTLP HTTP exporter
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

let sdk;
function start() {
  if (sdk) return sdk;
  const exporter = new OTLPTraceExporter({
    // e.g. http://localhost:4318/v1/traces
    url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318') + '/v1/traces',
  });

  sdk = new NodeSDK({
    traceExporter: exporter,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'node-service',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start().then(() => {
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry SDK started');
  }).catch((err) => {
    console.error('Error starting OpenTelemetry', err);
  });

  process.once('SIGTERM', () => sdk.shutdown());
  process.once('SIGINT', () => sdk.shutdown());

  return sdk;
}

module.exports = { start };
