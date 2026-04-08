const TARGET_URL = "https://toonstream.dad/home/";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (request.method !== "GET") {
      return jsonResponse(
        {
          ok: false,
          message: "Method not allowed. Use GET."
        },
        405
      );
    }

    // Health route
    if (url.pathname === "/") {
      return jsonResponse({
        ok: true,
        service: "toonstream-home-proxy",
        endpoints: {
          html: "/api/home",
          json: "/api/home-json"
        }
      });
    }

    if (url.pathname !== "/api/home" && url.pathname !== "/api/home-json") {
      return jsonResponse(
        {
          ok: false,
          message: "Route not found. Use /api/home or /api/home-json"
        },
        404
      );
    }

    try {
      const upstreamResponse = await fetch(TARGET_URL, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ToonstreamCloudflareWorker/1.0)",
          Accept: "text/html,application/xhtml+xml"
        }
      });

      const html = await upstreamResponse.text();

      if (url.pathname === "/api/home") {
        return new Response(html, {
          status: upstreamResponse.status,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Upstream-Status": String(upstreamResponse.status),
            ...corsHeaders()
          }
        });
      }

      return jsonResponse({
        ok: upstreamResponse.ok,
        source: TARGET_URL,
        upstreamStatus: upstreamResponse.status,
        html
      });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          message: "Failed to fetch upstream HTML",
          error: String(error?.message || error)
        },
        502
      );
    }
  }
};
