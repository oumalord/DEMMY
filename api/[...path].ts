import type { Request, Response } from "express";

const appPromise = import("../backend/src/server.js").then((module) => module.default);

export default async function handler(request: Request, response: Response) {
	const requestUrl = request.url ?? "/";
	if (!requestUrl.startsWith("/api/")) {
		request.url = `/api${requestUrl.startsWith("/") ? requestUrl : `/${requestUrl}`}`;
	}
	const app = await appPromise;
	return app(request, response);
}