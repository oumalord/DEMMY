import type { Request, Response } from "express";
import app from "../backend/src/server.js";

export default function handler(request: Request, response: Response) {
	const requestUrl = request.url ?? "/";
	if (!requestUrl.startsWith("/api/")) {
		request.url = `/api${requestUrl.startsWith("/") ? requestUrl : `/${requestUrl}`}`;
	}
	return app(request, response);
}