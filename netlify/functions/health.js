export async function handler() {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ status: "ok", env: "netlify-functions", time: new Date().toISOString() })
  };
}