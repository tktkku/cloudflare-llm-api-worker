/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Please install OpenAI SDK first: `npm install openai`
export interface Env {
	BASE_URL: string;
	API_KEY: string;
	MODEL: string;
	TEMPERATURE: number;
	MAX_TOKENS: number;
	TOP_P: number;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (request.method !== "POST") {
			return new Response(JSON.stringify({error: "Method not allowed"}), {
				status: 405,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		try {
			const { message, systemPrompt = "You are a helpful assistant."} = await request.json() as {
				message: string;
				systemPrompt?: string;
			};
			if (!message) {
				return new Response(JSON.stringify({ error: "Message is required" }), {
					status: 400,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					}
				});
			}
			const deepseek = await fetch(env.BASE_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${env.API_KEY}`,
				},
				body: JSON.stringify({
					model: env.MODEL,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: message}
					],
					temperature: env.TEMPERATURE,
					max_tokens: env.MAX_TOKENS,
					top_p: env.TOP_P,
					response_format: { type: "json_object" },
					stream: true,
				}),
			});
			if (!deepseek.ok) {
				const errorText = await deepseek.text();
				return new Response(JSON.stringify({ error: errorText}), {
					status: deepseek.status,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					}
				});
			}
			const responseHeaders = new Headers({
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "no-cache",
				"Connection": "keep-alive",
			});

			return new Response(deepseek.body, {
				status: 200,
				headers: responseHeaders,
			});
		} catch (error: any) {
			console.error("Error processing request:", error);
			return new Response(JSON.stringify({ success: false, error: error.message }), {
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				}
			});
		}
	}
};