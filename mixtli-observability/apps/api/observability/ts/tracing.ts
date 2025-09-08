import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

let sdk: NodeSDK | undefined;
export function start() {
  if (sdk) return sdk;
  const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318') + '/v1/traces';
  const exporter = new OTLPTraceExporter({ url: endpoint });
  sdk = new NodeSDK({
    traceExporter: exporter,
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'mixtli-api',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start().then(() => console.log('OTel SDK started')).catch((e) => console.error('OTel start error', e));
  process.once('SIGTERM', () => sdk?.shutdown());
  process.once('SIGINT', () => sdk?.shutdown());
  return sdk;
}
