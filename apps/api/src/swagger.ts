import yaml from "yaml";

export function createOpenApi() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Mixtli API V8.2 (A–C)",
      version: "0.1.0",
      description: "Endpoints: A) WFM simulate, B) Scoring retrain, C) Audit logs + Rules workflow."
    },
    servers: [{ url: "http://localhost" }],
    paths: {
      "/health": { get: { summary: "Health", responses: { "200": { description: "OK" } } } },
      "/wfm/simulate": {
        post: {
          summary: "What-if WFM simulation",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "Coverage result" } }
        }
      },
      "/scoring/retrain": {
        post: {
          summary: "Queue model retraining",
          requestBody: { required: false },
          responses: { "200": { description: "Queued" } }
        }
      },
      "/rules": {
        post: {
          summary: "Create rule (audited)",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "Created" } }
        }
      },
      "/rules/{id}/approve": {
        put: {
          summary: "Approve a rule (audited)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "Approved" } }
        }
      },
      "/audit/logs": { get: { summary: "Audit logs list", responses: { "200": { description: "OK" } } } }
    }
  };
  return yaml.stringify(spec);
}
