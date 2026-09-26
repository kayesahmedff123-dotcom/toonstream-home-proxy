const ORIGIN = "https://toonstream.us";
const DEFAULT_HOME_PATH = "/home/";

function buildUpstreamUrl(pathname, search = "") {
  if (pathname === "/home" || pathname === "/home/") {
    return `${ORIGIN}${DEFAULT_HOME_PATH}${search}`;
  }

  if (pathname === "/api/home" || pathname === "/api/home-json") {
    return `${ORIGIN}${DEFAULT_HOME_PATH}${search}`;
  }

  if (pathname.startsWith("/api/")) {
    const upstreamPath = pathname.slice(4);
    return `${ORIGIN}${upstreamPath}${search}`;
  }

  return `${ORIGIN}${pathname}${search}`;
}

function rewriteHtml(html) {
  return html
    .replaceAll(`${ORIGIN}/`, "/")
    .replace(/(href|src|action)=(['"])\/(?!\/)/g, '$1=$2/api/')
    .replace(/url\((['"]?)\/(?!\/)/g, 'url($1/api/')
    .replaceAll('"/api/api/', '"/api/')
    .replaceAll("'/api/api/", "'/api/");
}

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
          json: "/api/home-json",
          episodeExample: "/api/episode/the-ramparts-of-ice-1x7/"
        }
      });
    }

    if (!url.pathname.startsWith("/api/")) {
      return jsonResponse(
        {
          ok: false,
          message: "Route not found. Use /api/home, /api/home-json, or /api/..."
        },
        404
      );
    }

    try {
      const upstreamUrl = buildUpstreamUrl(url.pathname, url.search);

      const upstreamResponse = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: `${ORIGIN}/`,
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });

      const contentType = upstreamResponse.headers.get("content-type") || "";
      const bodyText = await upstreamResponse.text();

      if (url.pathname === "/api/home-json") {
        return jsonResponse({
          ok: upstreamResponse.ok,
          source: upstreamUrl,
          upstreamStatus: upstreamResponse.status,
          html: bodyText
        });
      }

      return new Response(contentType.includes("text/html") ? rewriteHtml(bodyText) : bodyText, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": contentType || "text/plain; charset=utf-8",
          "X-Upstream-Status": String(upstreamResponse.status),
          "X-Upstream-Url": upstreamUrl,
          ...corsHeaders()
        }
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
