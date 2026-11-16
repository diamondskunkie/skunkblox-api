
const GROUP_ID = "35980296";
const ROBLOX_API = "https://groups.roblox.com/v1";

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function response(statusCode, body) {
    return {
        statusCode,
        headers: HEADERS,
        body: JSON.stringify(body)
    };
}

async function robloxFetch(url) {
    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "SkunkBlox-API/1.0"
        },
        signal: AbortSignal.timeout(15000)
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const error = new Error(
            data?.errors?.[0]?.message || `Roblox API error: ${res.status}`
        );
        error.statusCode = res.status;
        throw error;
    }

    return data;
}

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return response(200, { success: true });
    }

    if (event.httpMethod !== "GET") {
        return response(405, {
            success: false,
            error: "Method not allowed"
        });
    }

    const path = event.path
        .replace(/\/+$/, "")
        .split("/")
        .pop();

    const params = event.queryStringParameters || {};

    try {
        switch (path) {
            // Latest group announcement
            case "announcement": {
                const result = await robloxFetch(
                    `${ROBLOX_API}/groups/${GROUP_ID}/announcements`
                );

                return response(200, {
                    success: true,
                    data: result.data?.[0] || null
                });
            }

            // Group information
            case "info": {
                const result = await robloxFetch(
                    `${ROBLOX_API}/groups/${GROUP_ID}`
                );

                return response(200, {
                    success: true,
                    data: result
                });
            }

            // Group role members
            case "members": {
                const roleId = params.roleId || "12884901889";
                const limit = Math.min(
                    Math.max(parseInt(params.limit, 10) || 25, 1),
                    100
                );

                const sortOrder =
                    params.sortOrder === "Asc" ? "Asc" : "Desc";

                const query = new URLSearchParams({
                    sortOrder,
                    limit: String(limit)
                });

                if (params.cursor) {
                    query.set("cursor", params.cursor);
                }

                const result = await robloxFetch(
                    `${ROBLOX_API}/groups/${GROUP_ID}/roles/${encodeURIComponent(roleId)}/users?${query}`
                );

                return response(200, {
                    success: true,
                    data: result.data || [],
                    nextPageCursor: result.nextPageCursor || null,
                    previousPageCursor: result.previousPageCursor || null
                });
            }

            default:
                return response(404, {
                    success: false,
                    error: "Unknown group endpoint",
                    endpoints: [
                        "/group/announcement",
                        "/group/info",
                        "/group/members"
                    ]
                });
        }
    } catch (error) {
        console.error("[SkunkBlox Group API]", error);

        return response(error.statusCode || 500, {
            success: false,
            error: error.message || "Internal server error"
        });
    }
};
